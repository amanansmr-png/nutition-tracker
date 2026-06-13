// ============================================
// Nutri Tracker — Dashboard (dashboard.js)
// Calorie Ring, Macros, Water, Food Log
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
  await initAuthGuard('dashboard');
  await initDashboard();
});

async function initDashboard() {
  const goals = await getGoals();
  const totals = await getDayTotals();
  const water = await getWater();
  const burned = await getBurned();
  const foods = await getFoodLogForDate(getToday());

  renderCalorieRing(goals, totals);
  renderMacros(goals, totals);
  renderWaterTracker(goals, water);
  renderBurnedCalories(burned);
  renderFoodLog(foods);
}

// ---------- Calorie Ring ----------
function renderCalorieRing(goals, totals) {
  const consumed = totals.calories;
  const goal = goals.calories;
  const pct = Math.min(consumed / goal, 1.2);
  const remaining = Math.max(goal - consumed, 0);

  const circumference = 2 * Math.PI * 85;
  const offset = circumference - (pct * circumference);

  const ringFill = document.getElementById('calorieRingFill');
  const calNumber = document.getElementById('calNumber');
  const calRemaining = document.getElementById('calRemaining');

  if (ringFill) {
    ringFill.style.strokeDasharray = circumference;
    ringFill.style.strokeDashoffset = circumference;
    // Animate after small delay
    setTimeout(() => {
      ringFill.style.strokeDashoffset = Math.max(offset, 0);
    }, 100);
  }

  if (calNumber) calNumber.textContent = Math.round(consumed);
  if (calRemaining) calRemaining.textContent = `${Math.round(remaining)} remaining`;

  // Change color if over
  if (consumed > goal && ringFill) {
    ringFill.style.stroke = 'var(--accent-red)';
  }
}

// ---------- Macro Progress Bars ----------
function renderMacros(goals, totals) {
  const macros = [
    { key: 'protein', label: 'Protein', color: 'var(--accent-cyan)', unit: 'g' },
    { key: 'carbs', label: 'Carbs', color: 'var(--accent-orange)', unit: 'g' },
    { key: 'fat', label: 'Fat', color: 'var(--accent-pink)', unit: 'g' },
    { key: 'fiber', label: 'Fiber', color: 'var(--accent-green)', unit: 'g' }
  ];

  const container = document.getElementById('macrosList');
  if (!container) return;

  container.innerHTML = macros.map(m => {
    const current = totals[m.key] || 0;
    const goal = goals[m.key] || 100;
    const pct = Math.min((current / goal) * 100, 100);

    return `
      <div class="macro-item" style="margin-bottom: 16px;">
        <div class="flex items-center justify-between mb-8">
          <span style="font-weight:600; font-size:0.85rem;">${m.label}</span>
          <span style="font-size:0.8rem; color:var(--text-secondary);">
            ${roundNum(current, 0)}${m.unit} / ${goal}${m.unit}
          </span>
        </div>
        <div class="progress-bar-track">
          <div class="progress-bar-fill" style="width:${pct}%; background:${m.color};"></div>
        </div>
      </div>
    `;
  }).join('');
}

// ---------- Water Tracker ----------
function renderWaterTracker(goals, current) {
  const maxGlasses = goals.water || 8;
  const container = document.getElementById('waterGlasses');
  if (!container) return;

  let html = '';
  for (let i = 1; i <= maxGlasses; i++) {
    html += `<div class="water-glass ${i <= current ? 'filled' : ''}" data-index="${i}" onclick="toggleWater(${i})"></div>`;
  }
  container.innerHTML = html;

  const label = document.getElementById('waterLabel');
  if (label) label.textContent = `${current} / ${maxGlasses} glasses`;
}

async function toggleWater(index) {
  const current = await getWater();
  if (index === current) {
    await setWater(index - 1);
  } else {
    await setWater(index);
  }
  await initDashboard();
  const newWater = await getWater();
  showToast(`Water updated: ${newWater} glasses`, 'success');
}

// ---------- Calories Burned ----------
function renderBurnedCalories(burned) {
  const el = document.getElementById('burnedValue');
  if (el) el.textContent = burned;
}

async function addBurnedCalories() {
  const input = document.getElementById('burnedInput');
  if (!input) return;
  const val = parseInt(input.value);
  if (!val || val <= 0) {
    showToast('Enter a valid number', 'warning');
    return;
  }
  await addBurned(val);
  input.value = '';
  await initDashboard();
  showToast(`Added ${val} kcal burned`, 'success');
}

// ---------- Food Log ----------
function renderFoodLog(foods) {
  const container = document.getElementById('foodLogList');
  if (!container) return;

  if (foods.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🍽️</div>
        <p>No food logged today</p>
        <p style="font-size:0.8rem; margin-top:8px; color:var(--text-muted);">
          Use AI Scan or Food Search to add meals
        </p>
      </div>
    `;
    return;
  }

  container.innerHTML = foods.map(f => `
    <div class="food-log-item animate-fade-in">
      <div class="food-log-icon" style="background:${getMealColor(f.mealType)}">
        ${getMealIcon(f.mealType)}
      </div>
      <div class="food-log-info">
        <div class="food-name">${f.name}</div>
        <div class="food-meta">
          <span class="meal-badge ${f.mealType || ''}">${f.mealType || 'meal'}</span>
          · P:${roundNum(f.protein||0,0)}g · C:${roundNum(f.carbs||0,0)}g · F:${roundNum(f.fat||0,0)}g
        </div>
      </div>
      <div class="food-log-cal">${Math.round(f.calories)} kcal</div>
      <button class="food-log-add" onclick="addSameFood('${f.id}')" title="Add more">+</button>
      <button class="food-log-delete" onclick="deleteFood('${f.id}')" title="Remove">✕</button>
    </div>
  `).join('');
}

async function addSameFood(foodId) {
  // Retrieve the current food entry details
  const foods = await getFoodLogForDate(getToday());
  const f = foods.find(item => item.id === foodId);
  if (!f) {
    showToast('Food not found', 'error');
    return;
  }
  // Re-use the same data to create a new log entry
  await addFoodToLog({
    name: f.name,
    calories: f.calories,
    protein: f.protein,
    carbs: f.carbs,
    fat: f.fat,
    fiber: f.fiber,
    mealType: f.mealType,
    source: 'log',
    portion: 1
  });
  await initDashboard();
  showToast('Food added', 'success');
}


async function deleteFood(foodId) {
  await removeFoodFromLog(foodId);
  await initDashboard();
  showToast('Food removed', 'info');
}

