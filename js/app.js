// ============================================
// Nutri Tracker — Shared Utilities (app.js)
// Navigation, Auth Guard, API Methods, Toasts
// ============================================

// ---------- Constants ----------
const STORAGE_KEYS = {
  GEMINI_KEY: 'nutri_gemini_key',
  USER_PROFILE: 'nutri_user_profile'
};

const DEFAULT_GOALS = {
  calories: 2000,
  protein: 150,
  carbs: 250,
  fat: 65,
  fiber: 30,
  water: 8
};

// ---------- API Helpers ----------
function getAuthHeaders() {
  const token = localStorage.getItem('nutri_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  };
}

async function apiGet(endpoint) {
  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    if (response.status === 401 || response.status === 403) {
      handleTokenExpiry();
      return null;
    }
    return await response.json();
  } catch (err) {
    console.error(`API GET [${endpoint}] failed:`, err);
    return null;
  }
}

async function apiPost(endpoint, body) {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(body)
    });
    if (response.status === 401 || response.status === 403) {
      handleTokenExpiry();
      return null;
    }
    return await response.json();
  } catch (err) {
    console.error(`API POST [${endpoint}] failed:`, err);
    return null;
  }
}

async function apiDelete(endpoint) {
  try {
    const response = await fetch(endpoint, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (response.status === 401 || response.status === 403) {
      handleTokenExpiry();
      return null;
    }
    return await response.json();
  } catch (err) {
    console.error(`API DELETE [${endpoint}] failed:`, err);
    return null;
  }
}

function handleTokenExpiry() {
  localStorage.removeItem('nutri_token');
  localStorage.removeItem('nutri_user');
  showToast('Session expired. Please log in again.', 'warning');
  setTimeout(() => {
    window.location.href = 'index.html';
  }, 1000);
}

// ---------- Date Utilities ----------
function getToday() {
  return new Date().toISOString().split('T')[0];
}

function getDateStr(date) {
  return date.toISOString().split('T')[0];
}

function getDayName(dateStr) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[new Date(dateStr + 'T00:00:00').getDay()];
}

function getLast7Days() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(getDateStr(d));
  }
  return days;
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ---------- Food Log APIs ----------
async function getFoodLogForDate(dateStr = getToday()) {
  const logs = await apiGet(`/api/logs/food?date=${dateStr}`);
  return logs || [];
}

async function addFoodToLog(food, dateStr = getToday()) {
  const entry = await apiPost('/api/logs/food', { ...food, date: dateStr });
  return entry;
}

async function removeFoodFromLog(foodId, dateStr = getToday()) {
  await apiDelete(`/api/logs/food/${foodId}?date=${dateStr}`);
}

async function getDayTotals(dateStr = getToday()) {
  const foods = await getFoodLogForDate(dateStr);
  return foods.reduce((acc, f) => {
    acc.calories += f.calories || 0;
    acc.protein += f.protein || 0;
    acc.carbs += f.carbs || 0;
    acc.fat += f.fat || 0;
    acc.fiber += f.fiber || 0;
    return acc;
  }, { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
}

// ---------- Water Tracker APIs ----------
async function getWater(dateStr = getToday()) {
  const res = await apiGet(`/api/logs/water?date=${dateStr}`);
  return res ? res.glasses : 0;
}

async function setWater(count, dateStr = getToday()) {
  await apiPost('/api/logs/water', { glasses: count, date: dateStr });
}

// ---------- Calories Burned APIs ----------
async function getBurned(dateStr = getToday()) {
  const res = await apiGet(`/api/logs/burned?date=${dateStr}`);
  return res ? res.calories : 0;
}

async function addBurned(amount, dateStr = getToday()) {
  const res = await apiPost('/api/logs/burned', { calories: amount, date: dateStr });
  return res ? res.calories : 0;
}

// ---------- Goals APIs ----------
async function getGoals() {
  const goals = await apiGet('/api/profile/goals');
  return goals || DEFAULT_GOALS;
}

async function setGoals(goals) {
  await apiPost('/api/profile/goals', goals);
}

// ---------- Profile Details APIs ----------
async function getProfileInfo() {
  const info = await apiGet('/api/profile/info');
  return info || { weight: '', height: '', goalPreset: 'maintain' };
}

async function setProfileInfo(info) {
  await apiPost('/api/profile/info', info);
}

// ---------- Weight APIs ----------
async function getWeightLogs() {
  const weights = await apiGet('/api/logs/weight');
  return weights || [];
}

async function addWeightLog(weight, date = getToday()) {
  const entry = await apiPost('/api/logs/weight', { weight, date });
  return entry;
}

// ---------- Gemini API Key ----------
function getGeminiKey() {
  return localStorage.getItem(STORAGE_KEYS.GEMINI_KEY) || '';
}

function setGeminiKey(key) {
  localStorage.setItem(STORAGE_KEYS.GEMINI_KEY, key);
}

// ---------- Toast Notifications ----------
function showToast(message, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
    warning: '⚠'
  };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <span>${message}</span>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// ---------- Navigation Component ----------
function renderNavigation(activePage) {
  const navItems = [
    { href: 'dashboard.html', icon: '📊', label: 'Dashboard', id: 'dashboard' },
    { href: 'scan.html', icon: '📷', label: 'AI Scan', id: 'scan' },
    { href: 'zoro.html', icon: '🤖', label: 'Zoro AI Coach', id: 'zoro' },
    { href: 'search.html', icon: '🔍', label: 'Food Search', id: 'search' },
    { href: 'progress.html', icon: '📈', label: 'Progress', id: 'progress' },
    { href: 'goals.html', icon: '🎯', label: 'Goals & BMI', id: 'goals' },
    { href: 'profile.html', icon: '👤', label: 'Profile', id: 'profile' }
  ];

  const user = auth.currentUser;
  const userName = user?.displayName || user?.email?.split('@')[0] || 'User';
  const userEmail = user?.email || '';
  const userInitial = userName.charAt(0).toUpperCase();

  const sidebarHTML = `
    <div class="sidebar" id="sidebar">
      <div class="sidebar-logo">
        <h1>Nutri</h1>
        <span>Nutrition Tracker</span>
      </div>
      <nav class="sidebar-nav">
        ${navItems.map(item => `
          <a href="${item.href}" class="${activePage === item.id ? 'active' : ''}" id="nav-${item.id}">
            <span class="nav-icon">${item.icon}</span>
            <span class="nav-label">${item.label}</span>
          </a>
        `).join('')}
      </nav>
      <div class="sidebar-user">
        <div class="sidebar-user-avatar">${userInitial}</div>
        <div class="sidebar-user-info">
          <div class="user-name">${userName}</div>
          <div class="user-email">${userEmail}</div>
        </div>
        <button class="sidebar-logout" onclick="handleLogout()" title="Sign Out">⏻</button>
      </div>
    </div>
    <div class="sidebar-overlay" id="sidebarOverlay"></div>
    <button class="hamburger" id="hamburger">
      <span></span><span></span><span></span>
    </button>
  `;

  document.querySelector('.app-container').insertAdjacentHTML('afterbegin', sidebarHTML);

  const hamburger = document.getElementById('hamburger');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');

  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    sidebar.classList.toggle('open');
    overlay.classList.toggle('active');
  });

  overlay.addEventListener('click', () => {
    hamburger.classList.remove('active');
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
  });
}

// ---------- Auth Guard ----------
function initAuthGuard(pageName) {
  return new Promise((resolve) => {
    auth.onAuthStateChanged(async (user) => {
      if (!user) {
        window.location.href = 'index.html';
      } else {
        renderNavigation(pageName);
        if (!getGeminiKey()) {
          try {
            const config = await apiGet('/api/config/key');
            if (config && config.apiKey) {
              setGeminiKey(config.apiKey);
            }
          } catch (e) {
            console.error('Failed to sync server API key:', e);
          }
        }
        resolve(user);
      }
    });
  });
}

// ---------- Logout ----------
function handleLogout() {
  auth.signOut().then(() => {
    window.location.href = 'index.html';
  }).catch(err => {
    showToast('Error signing out', 'error');
  });
}

// ---------- Meal Helpers ----------
function getMealIcon(mealType) {
  const icons = {
    breakfast: '🌅',
    lunch: '☀️',
    dinner: '🌙',
    snack: '🍿'
  };
  return icons[mealType] || '🍽️';
}

// Local Storage get helper
function storageGet(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

// Local Storage set helper
function storageSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Storage error:', e);
  }
}

function getMealColor(mealType) {
  const colors = {
    breakfast: 'rgba(251, 191, 36, 0.15)',
    lunch: 'rgba(34, 197, 94, 0.15)',
    dinner: 'rgba(168, 85, 247, 0.15)',
    snack: 'rgba(251, 146, 60, 0.15)'
  };
  return colors[mealType] || 'rgba(255, 255, 255, 0.05)';
}

// ---------- Number Formatting ----------
function roundNum(n, decimals = 1) {
  return Math.round(n * Math.pow(10, decimals)) / Math.pow(10, decimals);
}
