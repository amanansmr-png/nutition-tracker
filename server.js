const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_glassmorphism_token_key_123!';
const DB_PATH = path.join(__dirname, 'data', 'db.json');


app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve all static files (CSS, JS, HTML) from project root
app.use(express.static(path.join(__dirname), {
  index: 'index.html',
  dotfiles: 'ignore'
}));


// ---------- Database Helpers ----------
async function initDb() {
  const dir = path.dirname(DB_PATH);
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (err) {}

  try {
    await fs.access(DB_PATH);
  } catch (err) {
    const defaultData = {
      users: [],
      goals: {},
      profiles: {},
      foodLogs: {},
      waterLogs: {},
      burnedLogs: {},
      weightLogs: {},
      orders: {}
    };
    await fs.writeFile(DB_PATH, JSON.stringify(defaultData, null, 2), 'utf8');
  }
}

async function readDb() {
  await initDb();
  try {
    const raw = await fs.readFile(DB_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    // Ensure all keys always exist (defensive coding)
    parsed.users = parsed.users || [];
    parsed.goals = parsed.goals || {};
    parsed.profiles = parsed.profiles || {};
    parsed.foodLogs = parsed.foodLogs || {};
    parsed.waterLogs = parsed.waterLogs || {};
    parsed.burnedLogs = parsed.burnedLogs || {};
    parsed.weightLogs = parsed.weightLogs || {};
    parsed.orders = parsed.orders || {};
    parsed.zoroChatHistory = parsed.zoroChatHistory || {};
    parsed.zoroMemory = parsed.zoroMemory || {};
    return parsed;
  } catch (err) {
    console.error('Error reading database:', err);
    return {
      users: [],
      goals: {},
      profiles: {},
      foodLogs: {},
      waterLogs: {},
      burnedLogs: {},
      weightLogs: {},
      orders: {},
      zoroChatHistory: {},
      zoroMemory: {}
    };
  }
}

let dbWriteLock = Promise.resolve();
async function writeDb(data) {
  // Use sequential chain to lock file writes and prevent concurrency corruption
  dbWriteLock = dbWriteLock.then(async () => {
    try {
      await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
      console.error('Error writing database:', err);
    }
  });
  return dbWriteLock;
}

// ---------- Auth Middleware ----------
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access token missing' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token invalid or expired' });
    req.user = user;
    next();
  });
}

// ---------- Authentication Routes ----------
app.post('/api/auth/register', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Missing name, email, or password' });
  }

  const db = await readDb();
  if (db.users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(400).json({ error: 'This email is already registered' });
  }

  const userId = 'u_' + Date.now() + Math.random().toString(36).substr(2, 5);
  const newUser = { id: userId, email: email.toLowerCase(), password, name };
  
  db.users.push(newUser);

  // Initialize defaults
  db.goals[userId] = {
    calories: 2000,
    protein: 150,
    carbs: 250,
    fat: 65,
    fiber: 30,
    water: 8
  };
  db.profiles[userId] = {
    weight: '',
    height: '',
    goalPreset: 'maintain',
    age: '',
    goalWeight: '',
    dob: '',
    gender: 'unspecified',
    stepGoal: 10000,
    languages: []
  };
  db.foodLogs[userId] = {};
  db.waterLogs[userId] = {};
  db.burnedLogs[userId] = {};
  db.weightLogs[userId] = [];
  db.orders[userId] = [];

  await writeDb(db);

  const token = jwt.sign({ userId, email: newUser.email, name: newUser.name }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: { email: newUser.email, displayName: newUser.name } });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Missing email or password' });
  }

  const db = await readDb();
  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = jwt.sign({ userId: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: { email: user.email, displayName: user.name } });
});

// ---------- Goals & Profile ----------
app.get('/api/profile/goals', authenticateToken, async (req, res) => {
  const db = await readDb();
  const goals = db.goals[req.user.userId] || { calories: 2000, protein: 150, carbs: 250, fat: 65, fiber: 30, water: 8 };
  res.json(goals);
});

app.post('/api/profile/goals', authenticateToken, async (req, res) => {
  const db = await readDb();
  db.goals[req.user.userId] = {
    calories: Number(req.body.calories) || 2000,
    protein: Number(req.body.protein) || 150,
    carbs: Number(req.body.carbs) || 250,
    fat: Number(req.body.fat) || 65,
    fiber: Number(req.body.fiber) || 30,
    water: Number(req.body.water) || 8
  };
  await writeDb(db);
  res.json(db.goals[req.user.userId]);
});

app.get('/api/profile/info', authenticateToken, async (req, res) => {
  const db = await readDb();
  const profile = db.profiles[req.user.userId] || { weight: '', height: '', goalPreset: 'maintain' };
  const user = db.users.find(u => u.id === req.user.userId);
  res.json({
    ...profile,
    name: user ? user.name : req.user.name
  });
});

app.post('/api/profile/info', authenticateToken, async (req, res) => {
  const db = await readDb();
  
  // Update auth user displayName if name is passed
  if (req.body.name) {
    const user = db.users.find(u => u.id === req.user.userId);
    if (user) {
      user.name = req.body.name;
    }
  }

  db.profiles[req.user.userId] = {
    weight: req.body.weight || '',
    height: req.body.height || '',
    goalPreset: req.body.goalPreset || 'maintain',
    age: req.body.age || '',
    goalWeight: req.body.goalWeight || '',
    dob: req.body.dob || '',
    gender: req.body.gender || 'unspecified',
    stepGoal: Number(req.body.stepGoal) || 10000,
    languages: Array.isArray(req.body.languages) ? req.body.languages : []
  };
  await writeDb(db);
  res.json({
    ...db.profiles[req.user.userId],
    name: req.body.name || req.user.name
  });
});

// ---------- Food Logs ----------
app.get('/api/logs/food', authenticateToken, async (req, res) => {
  const dateStr = req.query.date || new Date().toISOString().split('T')[0];
  const db = await readDb();
  const userLogs = db.foodLogs[req.user.userId] || {};
  const logsForDate = userLogs[dateStr] || [];
  res.json(logsForDate);
});

app.post('/api/logs/food', authenticateToken, async (req, res) => {
  const dateStr = req.body.date || new Date().toISOString().split('T')[0];
  const { name, calories, protein, carbs, fat, fiber, mealType, source, portion } = req.body;
  
  if (!name || isNaN(calories)) {
    return res.status(400).json({ error: 'Missing name or calories' });
  }

  const db = await readDb();
  if (!db.foodLogs[req.user.userId]) db.foodLogs[req.user.userId] = {};
  if (!db.foodLogs[req.user.userId][dateStr]) db.foodLogs[req.user.userId][dateStr] = [];

  const newFood = {
    id: Date.now() + Math.random().toString(36).substr(2, 5),
    timestamp: new Date().toISOString(),
    name,
    calories: Number(calories),
    protein: Number(protein) || 0,
    carbs: Number(carbs) || 0,
    fat: Number(fat) || 0,
    fiber: Number(fiber) || 0,
    mealType: mealType || 'meal',
    source: source || 'manual',
    portion: Number(portion) || 1
  };

  db.foodLogs[req.user.userId][dateStr].push(newFood);
  await writeDb(db);
  res.json(newFood);
});

app.delete('/api/logs/food/:id', authenticateToken, async (req, res) => {
  const dateStr = req.query.date || new Date().toISOString().split('T')[0];
  const db = await readDb();
  const userLogs = db.foodLogs[req.user.userId] || {};
  
  if (userLogs[dateStr]) {
    userLogs[dateStr] = userLogs[dateStr].filter(f => f.id !== req.params.id);
    db.foodLogs[req.user.userId] = userLogs;
    await writeDb(db);
  }
  res.json({ success: true });
});

// ---------- Water Tracker ----------
app.get('/api/logs/water', authenticateToken, async (req, res) => {
  const dateStr = req.query.date || new Date().toISOString().split('T')[0];
  const db = await readDb();
  const waterLogs = db.waterLogs[req.user.userId] || {};
  const glasses = waterLogs[dateStr] || 0;
  res.json({ glasses });
});

app.post('/api/logs/water', authenticateToken, async (req, res) => {
  const dateStr = req.body.date || new Date().toISOString().split('T')[0];
  const glasses = Number(req.body.glasses) || 0;

  const db = await readDb();
  if (!db.waterLogs[req.user.userId]) db.waterLogs[req.user.userId] = {};
  db.waterLogs[req.user.userId][dateStr] = glasses;
  await writeDb(db);
  res.json({ glasses });
});

// ---------- Calories Burned ----------
app.get('/api/logs/burned', authenticateToken, async (req, res) => {
  const dateStr = req.query.date || new Date().toISOString().split('T')[0];
  const db = await readDb();
  const burnedLogs = db.burnedLogs[req.user.userId] || {};
  const calories = burnedLogs[dateStr] || 0;
  res.json({ calories });
});

app.post('/api/logs/burned', authenticateToken, async (req, res) => {
  const dateStr = req.body.date || new Date().toISOString().split('T')[0];
  const amount = Number(req.body.calories) || 0;

  const db = await readDb();
  if (!db.burnedLogs[req.user.userId]) db.burnedLogs[req.user.userId] = {};
  const current = db.burnedLogs[req.user.userId][dateStr] || 0;
  db.burnedLogs[req.user.userId][dateStr] = current + amount;
  await writeDb(db);
  res.json({ calories: db.burnedLogs[req.user.userId][dateStr] });
});

// ---------- Weight History ----------
app.get('/api/logs/weight', authenticateToken, async (req, res) => {
  const db = await readDb();
  const weights = db.weightLogs[req.user.userId] || [];
  res.json(weights);
});

app.post('/api/logs/weight', authenticateToken, async (req, res) => {
  const { weight, date } = req.body;
  const dateStr = date || new Date().toISOString().split('T')[0];
  
  if (isNaN(weight) || Number(weight) <= 0) {
    return res.status(400).json({ error: 'Missing or invalid weight' });
  }

  const db = await readDb();
  if (!db.weightLogs[req.user.userId]) db.weightLogs[req.user.userId] = [];
  
  // Prevent duplicate records for the same day; update if exists, otherwise add
  const existingIdx = db.weightLogs[req.user.userId].findIndex(w => w.date === dateStr);
  const newEntry = {
    id: existingIdx >= 0 ? db.weightLogs[req.user.userId][existingIdx].id : 'wt_' + Date.now() + Math.random().toString(36).substr(2, 3),
    date: dateStr,
    weight: Number(weight),
    timestamp: new Date().toISOString()
  };

  if (existingIdx >= 0) {
    db.weightLogs[req.user.userId][existingIdx] = newEntry;
  } else {
    db.weightLogs[req.user.userId].push(newEntry);
  }

  // Sort logs by date chronological
  db.weightLogs[req.user.userId].sort((a, b) => new Date(a.date) - new Date(b.date));

  await writeDb(db);
  res.json(newEntry);
});

// ---------- Config Route ----------
app.get('/api/config/key', authenticateToken, (req, res) => {
  res.json({ apiKey: process.env.GEMINI_API_KEY || '' });
});

// ---------- Gemini Vision Scanner Proxy ----------
app.post('/api/scan', async (req, res) => {
  const { base64, mediaType, clientApiKey } = req.body;
  const serverKey = process.env.GEMINI_API_KEY;
  const apiKey = serverKey || clientApiKey;

  if (!apiKey) {
    return res.status(400).json({ error: 'No Gemini API key provided on server or client' });
  }

  if (!base64 || !mediaType) {
    return res.status(400).json({ error: 'Missing base64 image data or mediaType' });
  }

  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': apiKey
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              inlineData: {
                mimeType: mediaType,
                data: base64
              }
            },
            {
              text: `Analyze this food image and provide nutritional information. Respond ONLY with a JSON object (no markdown, no explanation) in this exact format:
{
  "name": "Food Name",
  "calories": 0,
  "protein": 0,
  "carbs": 0,
  "fat": 0,
  "fiber": 0,
  "sugar": 0,
  "sodium": 0,
  "potassium": 0,
  "vitaminC": 0,
  "calcium": 0,
  "iron": 0,
  "healthScore": 0,
  "servingSize": "1 serving"
}
All numeric values should be reasonable estimates per serving. healthScore should be 1-10 (10 being healthiest). If this is not food, set name to "Not Food" and all values to 0.`
            }
          ]
        }],
        generationConfig: {
          responseMimeType: "application/json"
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: `Gemini API error: ${errText}` });
    }

    const data = await response.json();
    if (!data.candidates || data.candidates.length === 0 || !data.candidates[0].content || !data.candidates[0].content.parts || data.candidates[0].content.parts.length === 0) {
      return res.status(500).json({ error: 'Gemini API returned an empty or invalid response.' });
    }

    const textResult = data.candidates[0].content.parts[0].text;
    
    // Parse JSON
    let nutrition;
    const jsonMatch = textResult.match(/\{[\s\S]*\}/);
    try {
      nutrition = JSON.parse(jsonMatch ? jsonMatch[0] : textResult);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to parse JSON response from Gemini vision engine.' });
    }

    res.json(nutrition);

  } catch (err) {
    console.error('Scan error:', err);
    res.status(500).json({ error: err.message || 'Error occurred during server vision analysis.' });
  }
});

// ---------- Store & Order Routes ----------
app.get('/api/store/orders', authenticateToken, async (req, res) => {
  const db = await readDb();
  const userOrders = db.orders[req.user.userId] || [];
  res.json(userOrders);
});

app.post('/api/store/order', authenticateToken, async (req, res) => {
  const { items, totalPrice, shippingAddress, paymentMethod } = req.body;
  if (!items || !Array.isArray(items) || items.length === 0 || !totalPrice) {
    return res.status(400).json({ error: 'Invalid or empty order details' });
  }

  const db = await readDb();
  if (!db.orders[req.user.userId]) {
    db.orders[req.user.userId] = [];
  }

  const newOrder = {
    id: 'ord_' + Date.now() + Math.random().toString(36).substr(2, 4),
    date: new Date().toISOString().split('T')[0],
    timestamp: new Date().toISOString(),
    items,
    totalPrice: Number(totalPrice),
    shippingAddress: shippingAddress || 'Default Address',
    paymentMethod: paymentMethod || 'Card Ending 4242',
    status: 'Shipped'
  };

  db.orders[req.user.userId].push(newOrder);
  await writeDb(db);
  res.json(newOrder);
});

// ---------- Zoro AI Coach Routes ----------
app.post('/api/zoro/query', authenticateToken, async (req, res) => {
  const { contents, systemPrompt } = req.body;
  const serverKey = process.env.GEMINI_API_KEY;
  const apiKey = serverKey || req.body.clientApiKey;

  if (!apiKey) {
    return res.status(400).json({ error: 'No Gemini API key provided' });
  }

  if (!contents || !Array.isArray(contents)) {
    return res.status(400).json({ error: 'Missing or invalid contents' });
  }

  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': apiKey
      },
      body: JSON.stringify({
        contents: contents,
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: `Gemini API error: ${errText}` });
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('Zoro proxy error:', err);
    res.status(500).json({ error: err.message || 'Error occurred during server chat analysis.' });
  }
});

app.get('/api/zoro/data', authenticateToken, async (req, res) => {
  const db = await readDb();
  const userId = req.user.userId;
  const memory = db.zoroMemory[userId] || [];
  const chatHistory = db.zoroChatHistory[userId] || [];
  res.json({ memory, chatHistory });
});

app.post('/api/zoro/memory', authenticateToken, async (req, res) => {
  const { memory } = req.body;
  if (!Array.isArray(memory)) {
    return res.status(400).json({ error: 'Memory must be an array of strings' });
  }
  const db = await readDb();
  const userId = req.user.userId;
  db.zoroMemory[userId] = memory;
  await writeDb(db);
  res.json({ success: true, memory });
});

app.post('/api/zoro/chat', authenticateToken, async (req, res) => {
  const { chatHistory } = req.body;
  if (!Array.isArray(chatHistory)) {
    return res.status(400).json({ error: 'Chat history must be an array of message objects' });
  }
  const db = await readDb();
  const userId = req.user.userId;
  db.zoroChatHistory[userId] = chatHistory;
  await writeDb(db);
  res.json({ success: true, chatHistory });
});

app.post('/api/zoro/chat/clear', authenticateToken, async (req, res) => {
  const db = await readDb();
  const userId = req.user.userId;
  db.zoroChatHistory[userId] = [];
  db.zoroMemory[userId] = [];
  await writeDb(db);
  res.json({ success: true });
});

// ---------- Start Server ----------
app.listen(PORT, '0.0.0.0', async () => {
  await initDb();
  console.log(`Nutri backend running on http://0.0.0.0:${PORT}`);
});
