// ============================================
// Nutri Tracker — Profile (profile.js)
// Profile settings, language chips, interactive diagrams
// ============================================

const AVAILABLE_LANGUAGES = [
  'English', 'Spanish', 'French', 'German', 'Mandarin', 'Hindi', 'Arabic', 'Japanese', 'Russian'
];

let selectedLanguages = [];
let userProfile = {};
let currentLoggedSteps = 5000; // Mock current daily steps count

document.addEventListener('DOMContentLoaded', async () => {
  await initAuthGuard('profile');
  await initProfilePage();
});

async function initProfilePage() {
  await loadProfileData();
  renderLanguageChips();
  updateStepGauge();
  updateWeightDeltaDiagram();
}

// ---------- Load Profile Data ----------
async function loadProfileData() {
  userProfile = await getProfileInfo();

  document.getElementById('profileName').value = userProfile.name || '';
  document.getElementById('profileAge').value = userProfile.age || '';
  document.getElementById('profileWeight').value = userProfile.weight || '';
  document.getElementById('profileGoalWeight').value = userProfile.goalWeight || '';
  document.getElementById('profileHeight').value = userProfile.height || '';
  document.getElementById('profileDob').value = userProfile.dob || '';
  document.getElementById('profileGender').value = userProfile.gender || 'unspecified';
  document.getElementById('profileStepGoal').value = userProfile.stepGoal || 10000;

  selectedLanguages = Array.isArray(userProfile.languages) ? userProfile.languages : [];

  // Set slider max to step goal or 25,000 (whichever is larger)
  const stepGoal = userProfile.stepGoal || 10000;
  const slider = document.getElementById('stepsInputSlider');
  if (slider) {
    slider.max = Math.max(stepGoal * 2, 25000);
    // Set initial mock steps to 60% of goal on first load
    currentLoggedSteps = Math.round(stepGoal * 0.6);
    slider.value = currentLoggedSteps;
    document.getElementById('loggedStepsLabel').textContent = `${currentLoggedSteps.toLocaleString()} steps`;
  }
}

// ---------- Save Profile ----------
async function saveUserProfile() {
  const name = document.getElementById('profileName').value.trim();
  const age = document.getElementById('profileAge').value;
  const weight = document.getElementById('profileWeight').value;
  const goalWeight = document.getElementById('profileGoalWeight').value;
  const height = document.getElementById('profileHeight').value;
  const dob = document.getElementById('profileDob').value;
  const gender = document.getElementById('profileGender').value;
  const stepGoal = parseInt(document.getElementById('profileStepGoal').value) || 10000;

  if (!name) {
    showToast('Name is required', 'warning');
    return;
  }

  const updatedProfile = {
    name,
    age: age ? parseInt(age) : '',
    weight: weight ? parseFloat(weight).toString() : '',
    goalWeight: goalWeight ? parseFloat(goalWeight).toString() : '',
    height: height ? parseFloat(height).toString() : '',
    dob,
    gender,
    stepGoal,
    languages: selectedLanguages
  };

  const res = await apiPost('/api/profile/info', updatedProfile);
  if (res) {
    userProfile = res;
    // Log the current weight into history if provided
    if (weight) {
      await addWeightLog(parseFloat(weight));
    }

    // Dynamically update sidebar user name display if changed
    const userNames = document.querySelectorAll('.user-name');
    userNames.forEach(el => el.textContent = name);
    const avatars = document.querySelectorAll('.sidebar-user-avatar');
    avatars.forEach(el => el.textContent = name.charAt(0).toUpperCase());

    // Update charts & delta diagrams
    updateStepGauge();
    updateWeightDeltaDiagram();

    showToast('Profile updated successfully!', 'success');
  } else {
    showToast('Failed to update profile', 'error');
  }
}

// ---------- Languages Chip Handling ----------
function renderLanguageChips() {
  const container = document.getElementById('languagesGrid');
  if (!container) return;

  container.innerHTML = AVAILABLE_LANGUAGES.map(lang => {
    const isActive = selectedLanguages.includes(lang);
    return `
      <div class="lang-chip ${isActive ? 'active' : ''}" onclick="toggleLanguage('${lang}')">
        <span>${isActive ? '✓' : '+'}</span>
        <span>${lang}</span>
      </div>
    `;
  }).join('');
}

function toggleLanguage(lang) {
  if (selectedLanguages.includes(lang)) {
    selectedLanguages = selectedLanguages.filter(l => l !== lang);
  } else {
    selectedLanguages.push(lang);
  }
  renderLanguageChips();
}

// ---------- Step Gauge Diagram ----------
function updateStepGauge() {
  const goalInput = document.getElementById('profileStepGoal');
  const stepGoal = parseInt(goalInput.value) || 10000;

  const percentage = Math.min(currentLoggedSteps / stepGoal, 1.5);

  const circumference = 2 * Math.PI * 80; // r = 80 -> ~502.6
  const offset = circumference - (percentage * circumference);

  const fill = document.getElementById('stepGaugeFill');
  const valueDisplay = document.getElementById('stepGaugeValue');

  if (fill) {
    fill.style.strokeDasharray = circumference;
    fill.style.strokeDashoffset = Math.max(offset, 0);

    // Color transitions based on target completion
    if (percentage >= 1.0) {
      fill.style.stroke = 'var(--accent-green)';
    } else if (percentage >= 0.5) {
      fill.style.stroke = 'url(#stepGrad)';
    } else {
      fill.style.stroke = 'var(--accent-pink)';
    }
  }

  if (valueDisplay) {
    valueDisplay.textContent = currentLoggedSteps.toLocaleString();
  }
}

function updateLoggedSteps(val) {
  currentLoggedSteps = parseInt(val);
  document.getElementById('loggedStepsLabel').textContent = `${currentLoggedSteps.toLocaleString()} steps`;
  updateStepGauge();
}

// ---------- Weight Delta Diagram ----------
function updateWeightDeltaDiagram() {
  const currentW = parseFloat(document.getElementById('profileWeight').value);
  const goalW = parseFloat(document.getElementById('profileGoalWeight').value);

  const startLabel = document.getElementById('startWeightLabel');
  const deltaLabel = document.getElementById('deltaWeightLabel');
  const targetLabel = document.getElementById('targetWeightLabel');
  const barFill = document.getElementById('weightDeltaFill');
  const instruction = document.getElementById('weightInstructionText');

  if (isNaN(currentW) || isNaN(goalW) || currentW <= 0 || goalW <= 0) {
    if (startLabel) startLabel.textContent = 'Current: -- kg';
    if (targetLabel) targetLabel.textContent = 'Goal: -- kg';
    if (deltaLabel) deltaLabel.textContent = '--';
    if (barFill) barFill.style.width = '0%';
    if (instruction) instruction.textContent = 'Please enter both current weight and target weight to plot progress.';
    return;
  }

  startLabel.textContent = `Current: ${currentW} kg`;
  targetLabel.textContent = `Goal: ${goalW} kg`;

  const diff = currentW - goalW;

  if (diff === 0) {
    deltaLabel.textContent = '🎯 Goal Reached!';
    deltaLabel.style.color = 'var(--accent-green)';
    barFill.style.width = '100%';
    instruction.textContent = 'Excellent! You have achieved your exact target weight.';
  } else if (diff > 0) {
    // Weight loss journey
    deltaLabel.textContent = `${diff.toFixed(1)} kg to lose`;
    deltaLabel.style.color = 'var(--accent-pink)';

    // Let's assume a baseline progression relative to a standard 10kg range
    const pct = Math.max(0, Math.min(100, 100 - (diff / 10) * 100));
    barFill.style.width = `${pct}%`;
    instruction.textContent = `You are currently in a calorie deficit goal. Keep tracking calories and active burn to drop ${diff.toFixed(1)} kg.`;
  } else {
    // Weight gain journey
    const toGain = Math.abs(diff);
    deltaLabel.textContent = `${toGain.toFixed(1)} kg to gain`;
    deltaLabel.style.color = 'var(--accent-cyan)';

    const pct = Math.max(0, Math.min(100, 100 - (toGain / 10) * 100));
    barFill.style.width = `${pct}%`;
    instruction.textContent = `You are on a muscle building goal. Consume a calorie surplus and hit your daily protein targets.`;
  }
}

// Expose slider and save handler globally for inline html events
window.updateLoggedSteps = updateLoggedSteps;
window.toggleLanguage = toggleLanguage;
window.saveUserProfile = saveUserProfile;
