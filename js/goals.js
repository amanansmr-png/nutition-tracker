// ============================================
// Nutri Tracker — Goals & BMI (goals.js)
// Goal Setup, BMI Calculation, Dynamic Gauge, Weight Tracker
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
  await initAuthGuard('goals');
  await initGoalsPage();
});

async function initGoalsPage() {
  await loadProfileAndGoals();

  // Event Listeners
  const saveBtn = document.getElementById('saveGoalsBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', saveGoals);
  }

  const calcBtn = document.getElementById('calcBmiBtn');
  if (calcBtn) {
    calcBtn.addEventListener('click', calculateBMI);
  }

  const presetSelector = document.getElementById('goalPreset');
  if (presetSelector) {
    presetSelector.addEventListener('change', handlePresetChange);
  }
}

// ---------- Load Data ----------
async function loadProfileAndGoals() {
  // Load nutritional goals
  const goals = await getGoals();
  document.getElementById('goalCalories').value = Math.round(goals.calories);
  document.getElementById('goalProtein').value = Math.round(goals.protein);
  document.getElementById('goalCarbs').value = Math.round(goals.carbs);
  document.getElementById('goalFat').value = Math.round(goals.fat);
  document.getElementById('goalFiber').value = Math.round(goals.fiber);
  document.getElementById('goalWater').value = Math.round(goals.water);

  // Load profile data from API
  const profile = await getProfileInfo();
  document.getElementById('bmiWeight').value = profile.weight;
  document.getElementById('bmiHeight').value = profile.height;

  const presetSelector = document.getElementById('goalPreset');
  if (presetSelector && profile.goalPreset) {
    presetSelector.value = profile.goalPreset;
  }

  // Update BMI indicator on load if height and weight exist
  if (profile.weight && profile.height) {
    updateBMIDisplay(parseFloat(profile.weight), parseFloat(profile.height));
  } else {
    resetBMIDisplay();
  }

  // Load weight logs and chart
  await loadWeightTracker();
}

// ---------- Save Goals & Profile ----------
async function saveGoals() {
  const calories = parseInt(document.getElementById('goalCalories').value);
  const protein = parseFloat(document.getElementById('goalProtein').value);
  const carbs = parseFloat(document.getElementById('goalCarbs').value);
  const fat = parseFloat(document.getElementById('goalFat').value);
  const fiber = parseFloat(document.getElementById('goalFiber').value);
  const water = parseInt(document.getElementById('goalWater').value);

  // Validation
  if (isNaN(calories) || calories <= 0 ||
    isNaN(protein) || protein < 0 ||
    isNaN(carbs) || carbs < 0 ||
    isNaN(fat) || fat < 0 ||
    isNaN(fiber) || fiber < 0 ||
    isNaN(water) || water <= 0) {
    showToast('Please enter valid positive numbers for goals', 'warning');
    return;
  }

  await setGoals({ calories, protein, carbs, fat, fiber, water });

  // Update profile metrics
  const weight = document.getElementById('bmiWeight').value;
  const height = document.getElementById('bmiHeight').value;
  const goalPreset = document.getElementById('goalPreset').value;

  await setProfileInfo({ weight, height, goalPreset });

  // Add weight to log if valid
  if (weight && parseFloat(weight) > 0) {
    await addWeightLog(parseFloat(weight));
  }

  if (weight && height) {
    updateBMIDisplay(parseFloat(weight), parseFloat(height));
  }

  await loadWeightTracker();

  showToast('Goals and profile updated!', 'success');
}

// ---------- BMI Calculation ----------
async function calculateBMI() {
  const weightInput = document.getElementById('bmiWeight');
  const heightInput = document.getElementById('bmiHeight');
  const weight = parseFloat(weightInput.value);
  const height = parseFloat(heightInput.value);

  if (isNaN(weight) || weight <= 0 || isNaN(height) || height <= 0) {
    showToast('Please enter valid positive weight and height', 'warning');
    return;
  }

  updateBMIDisplay(weight, height);

  // Save changes to profile via API
  const profile = await getProfileInfo();
  profile.weight = weight.toString();
  profile.height = height.toString();
  await setProfileInfo(profile);

  // Also log to history
  await addWeightLog(weight);

  await loadWeightTracker();

  showToast('BMI calculated and profile updated!', 'success');
}

function updateBMIDisplay(weight, height) {
  // BMI = weight(kg) / height(m)^2
  const heightInMeters = height / 100;
  const bmi = weight / (heightInMeters * heightInMeters);
  const roundedBmi = roundNum(bmi, 1);

  const bmiNumber = document.getElementById('bmiNumber');
  const bmiCategory = document.getElementById('bmiCategory');
  const fill = document.getElementById('bmiGaugeFill');

  if (bmiNumber) bmiNumber.textContent = roundedBmi;

  let category = '';
  let color = 'var(--accent-green)';

  if (bmi < 18.5) {
    category = 'Underweight';
    color = 'var(--accent-cyan)';
  } else if (bmi >= 18.5 && bmi < 25) {
    category = 'Normal Weight';
    color = 'var(--accent-green)';
  } else if (bmi >= 25 && bmi < 30) {
    category = 'Overweight';
    color = 'var(--accent-yellow)';
  } else {
    category = 'Obese';
    color = 'var(--accent-red)';
  }

  if (bmiCategory) {
    bmiCategory.textContent = category;
    bmiCategory.style.color = color;
  }

  // Update semi-circle gauge
  const arcLength = 251.3;
  const minBmi = 15;
  const maxBmi = 35;
  const pct = Math.max(0, Math.min(1, (bmi - minBmi) / (maxBmi - minBmi)));
  const offset = arcLength - (pct * arcLength);

  if (fill) {
    fill.style.strokeDashoffset = offset;
    fill.style.stroke = color;
  }
}

function resetBMIDisplay() {
  const bmiNumber = document.getElementById('bmiNumber');
  const bmiCategory = document.getElementById('bmiCategory');
  const fill = document.getElementById('bmiGaugeFill');

  if (bmiNumber) bmiNumber.textContent = '--';
  if (bmiCategory) {
    bmiCategory.textContent = 'Enter stats below';
    bmiCategory.style.color = 'var(--text-muted)';
  }
  if (fill) {
    fill.style.strokeDashoffset = 251.3;
    fill.style.stroke = 'var(--border-glass)';
  }
}

// ---------- Goal Presets Handler ----------
function handlePresetChange(e) {
  const preset = e.target.value;
  const weightInput = document.getElementById('bmiWeight');
  const weight = parseFloat(weightInput.value) || 70;

  let cal = 2000;
  let protein = 150;
  let carbs = 250;
  let fat = 65;
  let fiber = 30;
  let water = 8;

  if (preset === 'lose') {
    cal = Math.round(weight * 24);
    protein = Math.round(weight * 2.0);
    fat = Math.round(weight * 0.8);
    carbs = Math.round((cal - (protein * 4 + fat * 9)) / 4);
    fiber = 30;
    water = 9;
  } else if (preset === 'gain') {
    cal = Math.round(weight * 36);
    protein = Math.round(weight * 2.2);
    fat = Math.round(weight * 1.0);
    carbs = Math.round((cal - (protein * 4 + fat * 9)) / 4);
    fiber = 35;
    water = 10;
  } else { // maintain
    cal = Math.round(weight * 30);
    protein = Math.round(weight * 1.8);
    fat = Math.round(weight * 0.9);
    carbs = Math.round((cal - (protein * 4 + fat * 9)) / 4);
    fiber = 30;
    water = 8;
  }

  document.getElementById('goalCalories').value = cal;
  document.getElementById('goalProtein').value = protein;
  document.getElementById('goalCarbs').value = carbs;
  document.getElementById('goalFat').value = fat;
  document.getElementById('goalFiber').value = fiber;
  document.getElementById('goalWater').value = water;

  showToast(`Autofilled recommendations for ${preset === 'lose' ? 'Weight Loss' : preset === 'gain' ? 'Muscle Gain' : 'Maintenance'}`, 'info');
}

// ---------- Weight Tracker Flow ----------
async function loadWeightTracker() {
  const logs = await getWeightLogs();

  logs.sort((a, b) => new Date(a.date) - new Date(b.date));

  const listContainer = document.getElementById('weightLogsList');
  if (listContainer) {
    if (logs.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-state" style="padding: 20px;">
          <p style="font-size:0.85rem;">No weight logs found</p>
        </div>
      `;
    } else {
      const displayLogs = [...logs].reverse();
      listContainer.innerHTML = displayLogs.map(log => `
        <div class="food-log-item" style="padding:10px 14px;">
          <div class="food-log-icon" style="background:rgba(168, 85, 247, 0.12); font-size:1.1rem; width:34px; height:34px;">⚖️</div>
          <div class="food-log-info">
            <div class="food-name" style="font-size:0.85rem; font-weight:600;">${log.weight} kg</div>
            <div class="food-meta" style="font-size:0.7rem;">${formatDate(log.date)}</div>
          </div>
        </div>
      `).join('');
    }
  }

  const chartContainer = document.getElementById('weightChartContainer');
  if (chartContainer) {
    if (logs.length < 2) {
      chartContainer.innerHTML = `<span class="text-muted" style="font-size: 0.85rem;">Log weight on multiple days to display trend line</span>`;
    } else {
      const weights = logs.map(l => l.weight);
      let maxW = Math.max(...weights);
      let minW = Math.min(...weights);

      if (maxW === minW) {
        maxW += 2;
        minW -= 2;
      } else {
        const diff = maxW - minW;
        maxW += diff * 0.15;
        minW -= diff * 0.15;
      }

      const svgWidth = 500;
      const svgHeight = 200;
      const paddingLeft = 50;
      const paddingRight = 30;
      const paddingTop = 35;
      const paddingBottom = 40;

      const chartW = svgWidth - paddingLeft - paddingRight;
      const chartH = svgHeight - paddingTop - paddingBottom;

      const points = logs.map((log, index) => {
        const x = paddingLeft + (index / (logs.length - 1)) * chartW;
        const y = paddingTop + chartH - ((log.weight - minW) / (maxW - minW)) * chartH;
        return { x, y, weight: log.weight, date: log.date };
      });

      const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
      const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${(paddingTop + chartH).toFixed(1)} L ${points[0].x.toFixed(1)} ${(paddingTop + chartH).toFixed(1)} Z`;

      const gridLevels = 3;
      let gridLines = '';
      for (let i = 0; i < gridLevels; i++) {
        const val = minW + (i / (gridLevels - 1)) * (maxW - minW);
        const y = paddingTop + chartH - (i / (gridLevels - 1)) * chartH;
        gridLines += `
          <line x1="${paddingLeft}" y1="${y}" x2="${svgWidth - paddingRight}" y2="${y}" stroke="rgba(255,255,255,0.06)" stroke-dasharray="4,4" />
          <text x="${paddingLeft - 10}" y="${y + 4}" fill="rgba(240, 238, 246, 0.4)" font-size="9" text-anchor="end">${val.toFixed(1)}</text>
        `;
      }

      const pointsSvg = points.map((p, i) => `
        <g class="chart-point-group" style="cursor: pointer;">
          <circle cx="${p.x}" cy="${p.y}" r="4" fill="var(--accent-purple)" stroke="rgba(255,255,255,0.8)" stroke-width="1.5" />
          <circle cx="${p.x}" cy="${p.y}" r="8" fill="var(--accent-purple)" opacity="0" class="hover-circle" />
          <text x="${p.x}" y="${p.y - 10}" fill="var(--text-primary)" font-size="9" font-weight="700" text-anchor="middle">${p.weight}</text>
          <text x="${p.x}" y="${svgHeight - 12}" fill="rgba(240,238,246,0.5)" font-size="8.5" text-anchor="middle">${formatDate(p.date)}</text>
        </g>
      `).join('');

      chartContainer.innerHTML = `
        <svg viewBox="0 0 ${svgWidth} ${svgHeight}" width="100%" height="100%" style="overflow: visible;">
          <defs>
            <linearGradient id="weightLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="var(--accent-purple)"/>
              <stop offset="100%" stop-color="var(--accent-cyan)"/>
            </linearGradient>
            <linearGradient id="weightAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="var(--accent-purple)" stop-opacity="0.25"/>
              <stop offset="100%" stop-color="var(--accent-purple)" stop-opacity="0"/>
            </linearGradient>
            <filter id="weightGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          
          ${gridLines}
          
          <path d="${areaPath}" fill="url(#weightAreaGrad)" />
          
          <path d="${linePath}" fill="none" stroke="url(#weightLineGrad)" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" filter="url(#weightGlow)" />
          
          ${pointsSvg}
        </svg>
      `;
    }
  }
}

async function logQuickWeight() {
  const input = document.getElementById('quickWeightInput');
  if (!input) return;
  const weight = parseFloat(input.value);
  if (isNaN(weight) || weight <= 0) {
    showToast('Please enter a valid weight in kg', 'warning');
    return;
  }

  await addWeightLog(weight);

  const bmiWeightInput = document.getElementById('bmiWeight');
  if (bmiWeightInput) {
    bmiWeightInput.value = weight;
  }

  const profile = await getProfileInfo();
  profile.weight = weight.toString();
  await setProfileInfo(profile);

  const bmiHeightInput = document.getElementById('bmiHeight');
  if (bmiHeightInput && bmiHeightInput.value) {
    updateBMIDisplay(weight, parseFloat(bmiHeightInput.value));
  }

  input.value = '';
  await loadWeightTracker();
  showToast(`Weight of ${weight} kg logged successfully!`, 'success');
}

window.logQuickWeight = logQuickWeight;
