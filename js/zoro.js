// ============================================
// Nutri Tracker — Zoro AI Companion (zoro.js)
// Autonomous Agent, Memory, Actions, Chat UI
// Converted: Gemini → Claude API (claude-sonnet-4-6)
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
  await initAuthGuard('zoro');
  await initZoroPage();
});

// ---------- State Variables ----------
let zoroMemory = [];
let zoroChatHistory = [];
let currentProfile = {};
let currentGoals = {};
let todayTotals = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
let todayWater = 0;
let todayBurned = 0;
let weightLogs = [];
let attachedImageBase64 = null;
let attachedImageMimeType = null;
let attachedImageFileName = "";

// ---------- localStorage Helpers ----------
function saveHistory() {
  try {
    localStorage.setItem('zoroMemory', JSON.stringify(zoroMemory));
    localStorage.setItem('zoroChatHistory', JSON.stringify(zoroChatHistory));
  } catch (e) {
    console.warn('[Zoro] localStorage save failed:', e);
  }
}

function loadHistory() {
  try {
    zoroMemory = JSON.parse(localStorage.getItem('zoroMemory') || '[]');
    zoroChatHistory = JSON.parse(localStorage.getItem('zoroChatHistory') || '[]');
  } catch (e) {
    zoroMemory = [];
    zoroChatHistory = [];
  }
}

// ---------- Claude API Key Helpers ----------
function getClaudeKey() {
  return localStorage.getItem('claudeApiKey') || '';
}

function setClaudeKey(key) {
  if (key) {
    localStorage.setItem('claudeApiKey', key);
  } else {
    localStorage.removeItem('claudeApiKey');
  }
}

// ---------- Initialization ----------
async function initZoroPage() {
  checkZoroApiKey();
  await loadUserData();
  await loadZoroHistoryAndMemory();
  scrollToBottom();
  document.getElementById('zoroChatInput').focus();
}

function checkZoroApiKey() {
  const key = getClaudeKey();
  const keyStatus = document.getElementById('zoroApiKeyStatus');
  if (keyStatus) {
    if (key) {
      keyStatus.innerHTML = `<span class="text-green">✓ Connected</span>`;
    } else {
      keyStatus.innerHTML = `<span class="text-orange">⚠ No API Key — <a href="#" onclick="openSettingsModal()" style="color:var(--accent-purple);text-decoration:underline;">Set up now</a></span>`;
    }
  }
}

function saveApiKey() {
  const key = document.getElementById('claudeKeyInput').value.trim();
  setClaudeKey(key);
  closeSettingsModal();
  checkZoroApiKey();
  showToast(key ? 'Claude API Key saved!' : 'Claude API Key removed', key ? 'success' : 'info');
}

function openSettingsModal() {
  const modal = document.getElementById('settingsModal');
  const keyInput = document.getElementById('claudeKeyInput');
  keyInput.value = getClaudeKey();
  modal.classList.add('active');
}

function closeSettingsModal() {
  document.getElementById('settingsModal').classList.remove('active');
}

// ---------- Load Context Data ----------
async function loadUserData() {
  currentProfile = await getProfileInfo();

  currentGoals = await getGoals();
  document.getElementById('zoroCalGoal').textContent = `${Math.round(currentGoals.calories).toLocaleString()} kcal`;
  document.getElementById('zoroWaterGoal').textContent = `${Math.round(currentGoals.water)} glasses`;

  todayTotals = await getDayTotals(getToday());
  todayWater = await getWater(getToday());
  todayBurned = await getBurned(getToday());

  weightLogs = await getWeightLogs();
  if (weightLogs.length > 0) {
    const latest = weightLogs[weightLogs.length - 1];
    document.getElementById('zoroCurrentWeight').textContent = `${latest.weight} kg`;
  } else if (currentProfile.weight) {
    document.getElementById('zoroCurrentWeight').textContent = `${currentProfile.weight} kg`;
  } else {
    document.getElementById('zoroCurrentWeight').textContent = '-- kg';
  }
}

async function loadZoroHistoryAndMemory() {
  loadHistory();
  renderMemoryList();

  const thread = document.getElementById('zoroChatThread');
  thread.innerHTML = '';

  if (zoroChatHistory.length === 0) {
    const user = auth.currentUser;
    const userName = user?.displayName || user?.email?.split('@')[0] || 'friend';

    const introMsg = {
      role: 'assistant',
      text: `Greetings, **${userName}**! I am **Zoro**, your autonomous AI Health Companion. ⚔️\n\nI can build **tailored diet plans**, design **personalized workout routines**, break down your **macros/micros**, and help you **snap & track calories** in real-time. \n\nI am fully connected to your tracker, so I can log activities, foods, and goals directly for you. Try asking me: *"Create a diet plan for me"* or click the clip button to upload a photo of your food!`,
      timestamp: new Date().toISOString()
    };

    zoroChatHistory.push(introMsg);
    saveHistory();
  }

  zoroChatHistory.forEach(msg => {
    appendChatBubble(msg.role, msg.text, msg.timestamp, false);
  });
}

// ---------- Render Memory List ----------
function renderMemoryList() {
  const memoryList = document.getElementById('zoroMemoryList');
  const countBadge = document.getElementById('memoryCount');

  countBadge.textContent = `${zoroMemory.length} items`;

  if (zoroMemory.length === 0) {
    memoryList.innerHTML = `
      <div class="zoro-memory-empty">
        Zoro hasn't stored any memories about you yet. Talk to me to build your profile!
      </div>
    `;
    return;
  }

  memoryList.innerHTML = zoroMemory.map((fact, index) => `
    <div class="zoro-memory-fact" title="Memory point #${index + 1}">
      ${escapeHtml(fact)}
    </div>
  `).join('');
}

// ---------- UI Interaction ----------
function scrollToBottom() {
  const thread = document.getElementById('zoroChatThread');
  thread.scrollTop = thread.scrollHeight;
}

function appendChatBubble(role, text, timestamp, animate = true) {
  const thread = document.getElementById('zoroChatThread');
  const msgDiv = document.createElement('div');
  msgDiv.className = `chat-msg ${role === 'user' ? 'chat-msg-user' : 'chat-msg-zoro'}`;

  const avatarChar = role === 'user' ? '👤' : '🟢';
  const avatarClass = role === 'user' ? 'msg-avatar-user' : 'msg-avatar-zoro';
  const timeStr = timestamp
    ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  let presentationText = text;
  let actionJson = null;

  const actionRegex = /```zoro-action\s*([\s\S]*?)\s*```/;
  const match = text.match(actionRegex);
  if (match) {
    presentationText = text.replace(actionRegex, '').trim();
    try {
      actionJson = JSON.parse(match[1]);
    } catch (e) {
      console.error('Failed to parse zoro-action JSON block:', e);
    }
  }

  const formattedText = parseMarkdown(presentationText);

  msgDiv.innerHTML = `
    <div class="msg-avatar ${avatarClass}">${avatarChar}</div>
    <div class="msg-content">
      <div class="msg-bubble">${formattedText}</div>
      <div class="msg-time" style="align-self: ${role === 'user' ? 'flex-end' : 'flex-start'}">${timeStr}</div>
    </div>
  `;

  thread.appendChild(msgDiv);

  if (actionJson) {
    renderActionWidget(msgDiv.querySelector('.msg-content'), actionJson);
  }

  if (animate) {
    scrollToBottom();
  }
}

function parseMarkdown(text) {
  if (!text) return '';
  let html = escapeHtml(text);
  html = html.replace(/\*\*([\s\S]*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([\s\S]*?)\*/g, '<em>$1</em>');
  html = html.replace(/\n/g, '<br>');
  return html;
}

function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// ---------- Image Attachment ----------
function handleImageAttachment(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    showToast('Please select a valid image file', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    attachedImageBase64 = e.target.result.split(',')[1];
    attachedImageMimeType = file.type;
    attachedImageFileName = file.name;
    document.getElementById('previewImageThumb').src = e.target.result;
    document.getElementById('previewImageName').textContent = file.name;
    document.getElementById('chatImagePreview').style.display = 'flex';
    showToast('Image attached! Send a message to analyze it.', 'success');
  };
  reader.readAsDataURL(file);
}

function removeAttachedImage() {
  attachedImageBase64 = null;
  attachedImageMimeType = null;
  attachedImageFileName = "";
  document.getElementById('chatImagePreview').style.display = 'none';
  document.getElementById('chatImageAttach').value = '';
}

// ---------- Quick Suggestion Chips ----------
function sendQuickPrompt(promptText) {
  const input = document.getElementById('zoroChatInput');
  input.value = promptText;
  handleSendChat();
}

// ---------- Send Message ----------
async function handleSendChat() {
  const input = document.getElementById('zoroChatInput');
  const text = input.value.trim();

  if (!text && !attachedImageBase64) return;

  const apiKey = getClaudeKey();
  if (!apiKey) {
    openSettingsModal();
    showToast('Please set your Claude API key first', 'warning');
    return;
  }

  input.value = '';
  const userText = text || "Analyze this food photo";
  const timestamp = new Date().toISOString();

  appendChatBubble('user', userText, timestamp);

  zoroChatHistory.push({ role: 'user', text: userText, timestamp });
  saveHistory();

  const imgBase64 = attachedImageBase64;
  const imgMime = attachedImageMimeType;
  removeAttachedImage();

  document.getElementById('zoroTypingIndicator').style.display = 'flex';
  scrollToBottom();

  try {
    const replyText = await queryZoroClaude(userText, imgBase64, imgMime, apiKey);
    const replyTimestamp = new Date().toISOString();

    document.getElementById('zoroTypingIndicator').style.display = 'none';

    appendChatBubble('assistant', replyText, replyTimestamp);

    zoroChatHistory.push({ role: 'assistant', text: replyText, timestamp: replyTimestamp });
    saveHistory();

    await executeZoroActions(replyText);

  } catch (err) {
    document.getElementById('zoroTypingIndicator').style.display = 'none';
    console.error('[Zoro] prompt error:', err);

    let errorDetail = err.message || 'Unknown error';
    if (errorDetail.includes('400')) {
      errorDetail = 'Bad request — your API key may be invalid or malformed.';
    } else if (errorDetail.includes('401') || errorDetail.includes('403')) {
      errorDetail = 'Authentication failed. Please check your Claude API key in settings.';
    } else if (errorDetail.includes('429')) {
      errorDetail = 'Rate limit exceeded. Please wait a moment and try again.';
    } else if (errorDetail.includes('Failed to fetch') || errorDetail.includes('NetworkError')) {
      errorDetail = 'Network error. Please check your internet connection.';
    }

    const errorMsg = `⚔️ Sorry, I ran into a problem: ${errorDetail}`;
    const errorTimestamp = new Date().toISOString();

    showToast('Zoro was unable to reply. Check console for details.', 'error');
    appendChatBubble('assistant', errorMsg, errorTimestamp);

    zoroChatHistory.push({ role: 'assistant', text: errorMsg, timestamp: errorTimestamp });
    saveHistory();
  }
}

// ---------- Build Clean Messages Array for Claude ----------
// FIX: Rebuilds a strictly alternating user/assistant array
// Claude requires: messages must start with 'user' and alternate roles
function buildClaudeMessages(history, userMessage, imageBase64, imageMimeType) {
  const messages = [];

  // Take last 10 past messages (not the current one we just pushed)
  // history already has the current user message at the end, so slice to exclude it
  const pastMessages = history.slice(0, -1).slice(-10);

  for (const msg of pastMessages) {
    const role = msg.role === 'user' ? 'user' : 'assistant';
    const last = messages[messages.length - 1];

    if (last && last.role === role) {
      // Merge consecutive same-role messages by appending text
      if (typeof last.content === 'string') {
        last.content += '\n' + msg.text;
      } else if (Array.isArray(last.content)) {
        last.content.push({ type: 'text', text: msg.text });
      }
    } else {
      messages.push({ role, content: msg.text });
    }
  }

  // Build current user message content blocks
  const currentContent = [];

  if (imageBase64 && imageMimeType) {
    currentContent.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: imageMimeType,
        data: imageBase64
      }
    });
  }

  currentContent.push({ type: 'text', text: userMessage });

  // The final content: if only text and no image, use plain string for simplicity
  const finalContent = currentContent.length === 1 && currentContent[0].type === 'text'
    ? userMessage
    : currentContent;

  const last = messages[messages.length - 1];
  if (last && last.role === 'user') {
    // Merge with existing user turn
    const existing = typeof last.content === 'string'
      ? [{ type: 'text', text: last.content }]
      : last.content;
    last.content = [...existing, ...(Array.isArray(finalContent) ? finalContent : [{ type: 'text', text: finalContent }])];
  } else {
    messages.push({ role: 'user', content: finalContent });
  }

  // Claude REQUIRES messages to start with 'user' — strip any leading assistant turns
  while (messages.length > 0 && messages[0].role !== 'user') {
    messages.shift();
  }

  // FIX: Ensure strict alternation — if two consecutive same-role messages snuck in, merge them
  const cleaned = [];
  for (const msg of messages) {
    const prev = cleaned[cleaned.length - 1];
    if (prev && prev.role === msg.role) {
      // Merge content
      const prevText = typeof prev.content === 'string' ? prev.content : JSON.stringify(prev.content);
      const curText = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
      prev.content = prevText + '\n' + curText;
    } else {
      cleaned.push({ ...msg });
    }
  }

  return cleaned;
}

// ---------- Query Claude API ----------
async function queryZoroClaude(userMessage, imageBase64, imageMimeType, apiKey) {
  const bmiVal = currentProfile.weight && currentProfile.height
    ? (parseFloat(currentProfile.weight) / Math.pow(parseFloat(currentProfile.height) / 100, 2)).toFixed(1)
    : '--';

  const systemPrompt = `You are Zoro, a highly advanced autonomous AI Health Coach and Companion. You assist the user with nutrition, fitness, and goals.
  
User Health Context:
- Name: ${currentProfile.name || 'User'}
- Weight: ${currentProfile.weight || 'Unspecified'} kg (Current)
- Height: ${currentProfile.height || 'Unspecified'} cm
- BMI: ${bmiVal}
- Goal Preset: ${currentProfile.goalPreset || 'maintain'} (Lose weight, Maintain, Gain muscle)

Today's Progress Status:
- Consumed so far: ${Math.round(todayTotals.calories)} / ${Math.round(currentGoals.calories)} kcal
- Macros consumed: Protein: ${Math.round(todayTotals.protein)}g/${Math.round(currentGoals.protein)}g, Carbs: ${Math.round(todayTotals.carbs)}g/${Math.round(currentGoals.carbs)}g, Fat: ${Math.round(todayTotals.fat)}g/${Math.round(currentGoals.fat)}g, Fiber: ${Math.round(todayTotals.fiber)}g/${Math.round(currentGoals.fiber)}g
- Water Logged: ${todayWater} / ${currentGoals.water} glasses
- Active energy burned: ${todayBurned} kcal

Zoro's Memories of User (What you have learned & saved):
${zoroMemory.length > 0 ? zoroMemory.map((m, idx) => `${idx + 1}. ${m}`).join('\n') : '- No memory saved yet.'}

Your Capabilities:
1. Provide personalized advice on health, diet, weight, and fitness.
2. Build tailored diet plans and workout programs.
3. Track and analyze calories from text or food photographs.
4. Auto-log metrics directly by outputting special instructions in your reply!

Strict Instruction on Actions:
If you need to perform an action (like logging food, logging water, updating goals, adding weight logs, learning a fact to memory, rendering a diet plan, or creating a workout checklist), you MUST append a block at the VERY END of your message using this exact markdown container:
\`\`\`zoro-action
{
  "action": "ACTION_TYPE",
  "data": { ... }
}
\`\`\`
Choose ONE action block per message if needed. Supported configurations:

1. Log Food:
\`\`\`zoro-action
{
  "action": "log_food",
  "data": {
    "name": "Food Name",
    "calories": 150,
    "protein": 12,
    "carbs": 5,
    "fat": 8,
    "fiber": 2,
    "mealType": "breakfast"
  }
}
\`\`\`

2. Log Water:
\`\`\`zoro-action
{
  "action": "log_water",
  "data": { "glasses": 1 }
}
\`\`\`

3. Log Calories Burned:
\`\`\`zoro-action
{
  "action": "log_burned",
  "data": { "calories": 350 }
}
\`\`\`

4. Log Weight:
\`\`\`zoro-action
{
  "action": "log_weight",
  "data": { "weight": 78.5 }
}
\`\`\`

5. Update Memory Profile:
\`\`\`zoro-action
{
  "action": "update_memory",
  "data": {
    "operation": "add",
    "fact": "Has a tree nut allergy"
  }
}
\`\`\`

6. Render Diet Plan Card:
\`\`\`zoro-action
{
  "action": "render_diet",
  "data": {
    "title": "Tailored Diet Plan",
    "breakfast": { "name": "Oatmeal with Blueberries", "calories": 320, "protein": 12, "carbs": 45, "fat": 6, "details": "1 cup oats, 1/2 cup blueberries, 1 tbsp almonds" },
    "lunch": { "name": "Grilled Chicken Salad", "calories": 450, "protein": 40, "carbs": 12, "fat": 15, "details": "150g grilled breast, mixed greens, olive oil dressing" },
    "dinner": { "name": "Baked Salmon with Broccoli", "calories": 520, "protein": 38, "carbs": 15, "fat": 22, "details": "150g salmon fillet, steamed broccoli, 1/2 cup brown rice" },
    "snack": { "name": "Greek Yogurt & Honey", "calories": 180, "protein": 15, "carbs": 18, "fat": 3, "details": "150g non-fat Greek yogurt, 1 tsp honey" }
  }
}
\`\`\`

7. Render Workout Routine:
\`\`\`zoro-action
{
  "action": "render_workout",
  "data": {
    "name": "Full Body Tone-Up",
    "calories": 250,
    "exercises": [
      { "title": "Bodyweight Squats", "sets": 3, "reps": "15 reps" },
      { "title": "Push-Ups", "sets": 3, "reps": "10-12 reps" },
      { "title": "Plank Hold", "sets": 3, "reps": "45 seconds" },
      { "title": "Dumbbell Rows", "sets": 3, "reps": "12 reps each arm" }
    ]
  }
}
\`\`\`

Keep your responses conversational, supportive, encouraging, and clear. Format with markdown. If the user attaches an image, analyze it visually and provide a nutrition breakdown, offering to log it.`;

  // FIX: Use the new clean message builder
  const messages = buildClaudeMessages(zoroChatHistory, userMessage, imageBase64, imageMimeType);

  console.log('[Zoro] Sending', messages.length, 'turns to Claude');
  console.log('[Zoro] Messages structure:', JSON.stringify(messages.map(m => ({
    role: m.role,
    contentType: typeof m.content,
    contentLength: typeof m.content === 'string' ? m.content.length : m.content?.length
  }))));

  const requestBody = {
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: systemPrompt,
    messages: messages
  };

  const response = await fetch('https://zoro-proxy.amanansmr.workers.dev', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('[Zoro] Claude API HTTP error:', response.status, errText);
    throw new Error(`${response.status}: ${errText}`);
  }

  // FIX: Robust response parsing with full logging
  let resData;
  try {
    resData = await response.json();
  } catch (parseErr) {
    const raw = await response.text();
    console.error('[Zoro] Failed to parse response JSON. Raw response:', raw);
    throw new Error('Server returned non-JSON response. Check console.');
  }

  console.log('[Zoro] Raw API response:', JSON.stringify(resData));

  // FIX: Handle all possible response shapes
  // Shape 1: Standard Claude API — { content: [{ type: 'text', text: '...' }] }
  if (resData.content && Array.isArray(resData.content)) {
    const textBlock = resData.content.find(b => b.type === 'text' && b.text);
    if (textBlock) {
      console.log('[Zoro] Parsed via content[].text');
      return textBlock.text;
    }
    // Fallback: first block with any text
    const firstWithText = resData.content.find(b => b.text);
    if (firstWithText) {
      console.log('[Zoro] Parsed via first content block with text');
      return firstWithText.text;
    }
  }

  // Shape 2: Proxy may have unwrapped to { text: '...' }
  if (resData.text && typeof resData.text === 'string' && resData.text.trim()) {
    console.log('[Zoro] Parsed via resData.text');
    return resData.text;
  }

  // Shape 3: Proxy may have unwrapped to { message: '...' }
  if (resData.message && typeof resData.message === 'string' && resData.message.trim()) {
    console.log('[Zoro] Parsed via resData.message');
    return resData.message;
  }

  // Shape 4: Proxy may have unwrapped to { response: '...' }
  if (resData.response && typeof resData.response === 'string' && resData.response.trim()) {
    console.log('[Zoro] Parsed via resData.response');
    return resData.response;
  }

  // Shape 5: Plain string response
  if (typeof resData === 'string' && resData.trim()) {
    console.log('[Zoro] Parsed via raw string response');
    return resData;
  }

  // Nothing worked — log everything for debugging
  console.error('[Zoro] Could not extract text from response. Full resData:', JSON.stringify(resData));
  console.error('[Zoro] stop_reason:', resData.stop_reason);
  console.error('[Zoro] error field:', resData.error);

  if (resData.error) {
    throw new Error(`API error: ${resData.error.message || JSON.stringify(resData.error)}`);
  }

  throw new Error('Claude returned an empty or unrecognized response. Check browser console for the raw response shape.');
}

// ---------- Execute Zoro Actions ----------
async function executeZoroActions(replyText) {
  const actionRegex = /```zoro-action\s*([\s\S]*?)\s*```/;
  const match = replyText.match(actionRegex);
  if (!match) return;

  try {
    const actionObj = JSON.parse(match[1]);
    const { action, data } = actionObj;

    switch (action) {
      case 'log_food':
        if (data.name && data.calories !== undefined) {
          const entry = await addFoodToLog({
            name: data.name,
            calories: Number(data.calories) || 0,
            protein: Number(data.protein) || 0,
            carbs: Number(data.carbs) || 0,
            fat: Number(data.fat) || 0,
            fiber: Number(data.fiber) || 0,
            mealType: data.mealType || 'snack',
            source: 'zoro'
          }, getToday());
          if (entry) {
            showToast(`Logged food: ${data.name} (${data.calories} kcal)!`, 'success');
            await loadUserData();
          }
        }
        break;

      case 'log_water':
        if (data.glasses !== undefined) {
          let change = data.glasses;
          if (typeof change === 'string' && (change.startsWith('+') || change.startsWith('-'))) {
            change = todayWater + Number(change);
          } else {
            change = Number(change);
          }
          const finalWater = Math.max(0, change);
          await setWater(finalWater, getToday());
          showToast(`Water logged: ${finalWater} glasses total!`, 'success');
          await loadUserData();
        }
        break;

      case 'log_burned':
        if (data.calories) {
          await addBurned(Number(data.calories), getToday());
          showToast(`Logged activity: +${data.calories} kcal burned!`, 'success');
          await loadUserData();
        }
        break;

      case 'log_weight':
        if (data.weight) {
          const entry = await addWeightLog(Number(data.weight), getToday());
          if (entry) {
            currentProfile.weight = data.weight.toString();
            await setProfileInfo(currentProfile);
            showToast(`Logged weight: ${data.weight} kg!`, 'success');
            await loadUserData();
          }
        }
        break;

      case 'update_memory':
        if (data.fact) {
          const op = data.operation || 'add';
          const trimmedFact = data.fact.trim();
          if (op === 'add') {
            if (!zoroMemory.some(m => m.toLowerCase() === trimmedFact.toLowerCase())) {
              zoroMemory.push(trimmedFact);
              saveHistory();
              showToast(`Zoro updated your Memory Profile!`, 'info');
              renderMemoryList();
            }
          } else if (op === 'delete') {
            zoroMemory = zoroMemory.filter(m => m.toLowerCase() !== trimmedFact.toLowerCase());
            saveHistory();
            showToast(`Memory Profile updated`, 'info');
            renderMemoryList();
          }
        }
        break;

      default:
        break;
    }
  } catch (e) {
    console.error('Error executing Zoro action:', e);
  }
}

// ---------- Render Widgets ----------
function renderActionWidget(msgContentDiv, actionJson) {
  const { action, data } = actionJson;
  if (!data) return;

  const widgetDiv = document.createElement('div');
  widgetDiv.className = 'zoro-widget-card';

  switch (action) {
    case 'log_food':
      widgetDiv.innerHTML = `
        <div class="widget-header">
          <div class="widget-title">🍎 Logged Nutrient Entry</div>
          <span class="widget-badge" style="background:rgba(168,85,247,0.15);color:var(--accent-purple);">${data.mealType || 'snack'}</span>
        </div>
        <div class="flex justify-between items-center" style="padding:4px 0;">
          <div>
            <strong style="color:#fff;font-size:0.9rem;">${data.name}</strong>
            <div style="font-size:0.75rem;color:var(--text-secondary);margin-top:2px;">P: ${data.protein || 0}g | C: ${data.carbs || 0}g | F: ${data.fat || 0}g</div>
          </div>
          <span style="font-size:1rem;font-weight:700;color:var(--accent-purple);">${data.calories} kcal</span>
        </div>`;
      break;

    case 'log_water':
      widgetDiv.innerHTML = `
        <div class="widget-header">
          <div class="widget-title">💧 Logged Hydration Intake</div>
          <span class="widget-badge" style="background:rgba(56,189,248,0.15);color:#38bdf8;">water</span>
        </div>
        <div class="flex items-center gap-12" style="padding:4px 0;">
          <span style="font-size:1.8rem;">🥛</span>
          <div>
            <div style="font-weight:700;color:#fff;font-size:0.95rem;">Total Logged Today: ${todayWater} glasses</div>
            <div style="font-size:0.75rem;color:var(--text-secondary);margin-top:2px;">Target: ${currentGoals.water} glasses daily</div>
          </div>
        </div>`;
      break;

    case 'log_burned':
      widgetDiv.innerHTML = `
        <div class="widget-header">
          <div class="widget-title">🔥 Logged Active Energy</div>
          <span class="widget-badge" style="background:rgba(251,146,60,0.15);color:var(--accent-orange);">calories burned</span>
        </div>
        <div class="flex items-center gap-12" style="padding:4px 0;">
          <span style="font-size:1.8rem;">⚡</span>
          <div>
            <div style="font-weight:700;color:#fff;font-size:0.95rem;">Logged: ${data.calories} kcal</div>
            <div style="font-size:0.75rem;color:var(--text-secondary);margin-top:2px;">Total active burn today: ${todayBurned} kcal</div>
          </div>
        </div>`;
      break;

    case 'log_weight':
      widgetDiv.innerHTML = `
        <div class="widget-header">
          <div class="widget-title">⚖️ Logged Weight Metric</div>
          <span class="widget-badge" style="background:rgba(34,197,94,0.15);color:var(--accent-green);">body weight</span>
        </div>
        <div class="flex items-center gap-12" style="padding:4px 0;">
          <span style="font-size:1.8rem;">📉</span>
          <div>
            <div style="font-weight:700;color:#fff;font-size:0.95rem;">Recorded weight: ${data.weight} kg</div>
            <div style="font-size:0.75rem;color:var(--text-secondary);margin-top:2px;">Stored in health history logs</div>
          </div>
        </div>`;
      break;

    case 'render_diet':
      const meals = ['breakfast', 'lunch', 'dinner', 'snack'];
      let mealHtml = '';
      meals.forEach(m => {
        if (data[m]) {
          const item = data[m];
          const uid = 'dm_' + Date.now() + Math.floor(Math.random() * 1000);
          mealHtml += `
            <div class="meal-plan-item">
              <div class="meal-info">
                <div class="meal-name-row">
                  <span class="meal-name">${m.charAt(0).toUpperCase() + m.slice(1)}: ${item.name}</span>
                  <span class="meal-calories">(${item.calories} kcal)</span>
                </div>
                <div class="meal-details">${item.details || ''}</div>
                <div style="font-size:0.7rem;color:var(--text-muted);margin-top:2px;">P: ${item.protein || 0}g | C: ${item.carbs || 0}g | F: ${item.fat || 0}g</div>
              </div>
              <button class="btn btn-primary btn-sm" id="${uid}"
                onclick="logDietMealFromWidget('${uid}','${m}','${escapeString(item.name)}',${item.calories},${item.protein || 0},${item.carbs || 0},${item.fat || 0},${item.fiber || 0})"
                style="padding:4px 8px;font-size:0.7rem;border-radius:6px;">Log</button>
            </div>`;
        }
      });
      widgetDiv.innerHTML = `
        <div class="widget-header">
          <div class="widget-title">📋 ${data.title || 'Tailored Diet Plan'}</div>
          <span class="widget-badge" style="background:rgba(34,197,94,0.15);color:var(--accent-green);">custom menu</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;">${mealHtml}</div>
        <div style="border-top:1px solid rgba(255,255,255,0.05);padding-top:8px;">
          <span style="font-size:0.72rem;color:var(--text-secondary);">Interact with the buttons to log individual meals.</span>
        </div>`;
      break;

    case 'render_workout':
      let exerciseHtml = '';
      const estimatedBurn = data.calories || 200;
      if (Array.isArray(data.exercises)) {
        data.exercises.forEach(ex => {
          exerciseHtml += `
            <div class="exercise-item">
              <div class="exercise-checkbox" onclick="toggleExerciseCheckbox(this)">✓</div>
              <div class="exercise-info">
                <div class="exercise-title">${ex.title}</div>
                <div class="exercise-meta">${ex.sets} sets × ${ex.reps}</div>
              </div>
            </div>`;
        });
      }
      const workoutUid = 'wk_' + Date.now();
      widgetDiv.innerHTML = `
        <div class="widget-header">
          <div class="widget-title">💪 Workout: ${data.name || 'Strength split'}</div>
          <span class="widget-badge" style="background:rgba(251,146,60,0.15);color:var(--accent-orange);">${estimatedBurn} kcal burn</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;">${exerciseHtml}</div>
        <div style="border-top:1px solid rgba(255,255,255,0.05);padding-top:8px;display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:0.72rem;color:var(--text-secondary);">Check off exercises as you sweat!</span>
          <button class="btn btn-primary btn-sm" id="${workoutUid}"
            onclick="logWorkoutFromWidget('${workoutUid}',${estimatedBurn})"
            style="padding:4px 8px;font-size:0.7rem;border-radius:6px;">Complete & Log</button>
        </div>`;
      break;

    default:
      return;
  }

  msgContentDiv.appendChild(widgetDiv);
}

function escapeString(str) {
  return str.replace(/'/g, "\\'");
}

async function logDietMealFromWidget(buttonId, mealType, name, calories, protein, carbs, fat, fiber) {
  const btn = document.getElementById(buttonId);
  if (btn.disabled) return;
  btn.disabled = true;
  btn.textContent = '...';

  const entry = await addFoodToLog({ name, calories, protein, carbs, fat, fiber, mealType, source: 'zoro_widget' });
  if (entry) {
    btn.textContent = '✓';
    btn.style.background = 'var(--accent-green)';
    btn.style.borderColor = 'var(--accent-green)';
    btn.style.boxShadow = 'none';
    showToast(`Logged ${name} to your daily ${mealType}!`, 'success');
    await loadUserData();
  } else {
    btn.disabled = false;
    btn.textContent = 'Log';
  }
}

function toggleExerciseCheckbox(el) {
  el.classList.toggle('checked');
}

async function logWorkoutFromWidget(buttonId, calories) {
  const btn = document.getElementById(buttonId);
  if (btn.disabled) return;
  btn.disabled = true;
  btn.textContent = '...';

  await addBurned(calories, getToday());
  btn.textContent = '✓ Logged';
  btn.style.background = 'var(--accent-green)';
  btn.style.borderColor = 'var(--accent-green)';
  btn.style.boxShadow = 'none';
  showToast(`Congratulations! Logged +${calories} kcal active energy burn!`, 'success');
  await loadUserData();
}

// ---------- Clear History ----------
async function clearZoroHistory() {
  if (!confirm("Are you sure you want to reset your chat logs? This will erase your conversation and clear Zoro's memory profile.")) return;

  localStorage.removeItem('zoroChatHistory');
  localStorage.removeItem('zoroMemory');
  zoroChatHistory = [];
  zoroMemory = [];

  showToast('Zoro logs cleared successfully', 'success');
  await loadZoroHistoryAndMemory();
}

// ---------- Expose to window ----------
window.openSettingsModal = openSettingsModal;
window.closeSettingsModal = closeSettingsModal;
window.saveApiKey = saveApiKey;
window.handleImageAttachment = handleImageAttachment;
window.removeAttachedImage = removeAttachedImage;
window.sendQuickPrompt = sendQuickPrompt;
window.handleSendChat = handleSendChat;
window.clearZoroHistory = clearZoroHistory;
window.logDietMealFromWidget = logDietMealFromWidget;
window.toggleExerciseCheckbox = toggleExerciseCheckbox;
window.logWorkoutFromWidget = logWorkoutFromWidget;