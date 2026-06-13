// js/progress.js
// Progress Dashboard Controller
// Uses existing API helpers from app.js (e.g., getWeightLogs, getFoodLogForDate, getBurned, getGoals, getProfileInfo)
// This module is loaded as a <script type="module"> on progress.html

// Utility to format numbers
const fmt = (n, d = 1) => Math.round(n * Math.pow(10, d)) / Math.pow(10, d);

// ---------- Streak Calculation ----------
async function renderStreak() {
  // Fetch all food logs (object keyed by date) and determine consecutive days with any entry
  const logs = await fetch('/api/logs/food/all').then(r => r.json()).catch(() => ({}));
  const dates = Object.keys(logs).sort((a, b) => new Date(a) - new Date(b));
  const today = new Date().toISOString().slice(0, 10);
  let streak = 0;
  for (let i = dates.length - 1; i >= 0; i--) {
    const d = dates[i];
    if (new Date(d) > new Date(today)) continue; // future dates ignored
    const diff = (new Date(today) - new Date(d)) / (1000 * 60 * 60 * 24);
    if (diff === streak) {
      streak++;
    } else {
      break;
    }
  }
  const container = document.getElementById('streakCard');
  if (!container) return;
  container.innerHTML = `
    <div class="flex items-center gap-4">
      <span style="font-size:2rem;">🔥</span>
      <div>
        <div class="text-2xl font-bold" id="streakCount">${streak} Days</div>
        <div class="streak-dots" id="streakDots"></div>
      </div>
    </div>
    <div class="flex items-center gap-4 mt-4">
      <span style="font-size:2rem;">🏆</span>
      <div>
        <div class="text-xl font-semibold" id="badgeCount">0 Earned</div>
      </div>
    </div>`;
  // render weekday dots (Mon‑Sun) with active colour for days present in the streak
  const weekDays = ['S','M','T','W','T','F','S'];
  const dotContainer = document.getElementById('streakDots');
  const recentWeek = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    recentWeek.push(d.toISOString().slice(0,10));
  }
  dotContainer.innerHTML = recentWeek.map(d => {
    const active = dates.includes(d);
    return `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;margin:1px;background:${active?'var(--accent-pink)':'var(--text-muted)'}"></span>`;
  }).join('');
}

// ---------- Weight Chart ----------
function drawWeightChart(data, rangeLabel) {
  const svg = document.getElementById('weightChart');
  if (!svg) return;
  const width = svg.clientWidth || 300;
  const height = 180;
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  // clear previous
  while (svg.firstChild) svg.removeChild(svg.firstChild);
  if (data.length === 0) return;
  const dates = data.map(p => new Date(p.date));
  const weights = data.map(p => p.weight);
  const minW = Math.min(...weights);
  const maxW = Math.max(...weights);
  const xStep = width / (dates.length - 1);
  const yScale = (val) => height - ((val - minW) / (maxW - minW)) * height;
  const points = data.map((p, i) => `${i * xStep},${yScale(p.weight)}`).join(' ');
  const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
  poly.setAttribute('points', points);
  poly.setAttribute('fill', 'none');
  poly.setAttribute('stroke', 'var(--accent-purple)');
  poly.setAttribute('stroke-width', '2');
  svg.appendChild(poly);
  // simple goal line (example: target weight from goals)
  const goal = document.getElementById('weightGoal');
  if (goal) goal.textContent = `${fmt(maxW)} kg`;
}

async function renderWeightChart(range = '90') {
  const all = await getWeightLogs(); // returns [] of {date, weight}
  if (!Array.isArray(all)) return;
  let filtered = all;
  const today = new Date();
  if (range !== 'all') {
    const days = parseInt(range, 10);
    const cutoff = new Date();
    cutoff.setDate(today.getDate() - days);
    filtered = all.filter(p => new Date(p.date) >= cutoff);
  }
  drawWeightChart(filtered);
}

// ---------- Calorie & Burned Chart ----------
function drawCalorieChart(consumed, burned) {
  const svg = document.getElementById('calorieChart');
  if (!svg) return;
  const width = svg.clientWidth || 300;
  const height = 150;
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  while (svg.firstChild) svg.removeChild(svg.firstChild);
  const maxVal = Math.max(...consumed, ...burned, 0);
  const barWidth = width / (consumed.length * 2 + 1);
  for (let i = 0; i < consumed.length; i++) {
    const cHeight = (consumed[i] / maxVal) * height;
    const bHeight = (burned[i] / maxVal) * height;
    const xC = barWidth * (i * 2);
    const xB = barWidth * (i * 2 + 1);
    const rectC = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rectC.setAttribute('x', xC);
    rectC.setAttribute('y', height - cHeight);
    rectC.setAttribute('width', barWidth);
    rectC.setAttribute('height', cHeight);
    rectC.setAttribute('fill', 'var(--accent-orange)');
    const rectB = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rectB.setAttribute('x', xB);
    rectB.setAttribute('y', height - bHeight);
    rectB.setAttribute('width', barWidth);
    rectB.setAttribute('height', bHeight);
    rectB.setAttribute('fill', 'var(--accent-green)');
    svg.appendChild(rectC);
    svg.appendChild(rectB);
  }
}

async function renderCalorieChart(weekOffset = 0) {
  // weekOffset 0 = this week, 1 = last week, etc.
  const start = new Date();
  start.setDate(start.getDate() - start.getDay() - weekOffset * 7);
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d.toISOString().slice(0,10));
  }
  const consumed = [];
  const burned = [];
  for (const d of days) {
    const foods = await getFoodLogForDate(d);
    const totalC = foods.reduce((a,f)=>a+(f.calories||0),0);
    consumed.push(totalC);
    const b = await getBurned(d);
    burned.push(b||0);
  }
  drawCalorieChart(consumed, burned);
}

// ---------- Expenditure Changes ----------
async function renderExpenditure() {
  const periods = [3,7,14,30,90]; // days
  const list = document.getElementById('expenditureList');
  if (!list) return;
  const profile = await getProfileInfo();
  const weight = parseFloat(profile.weight) || 0;
  const height = parseFloat(profile.height) || 0;
  const goal = await getGoals();
  const goalCal = goal.calories || 2000;
  const today = new Date();

  const entries = await Promise.all(periods.map(async p => {
    const start = new Date();
    start.setDate(today.getDate() - p);
    const startStr = start.toISOString().slice(0,10);
    const endStr = today.toISOString().slice(0,10);
    // fetch aggregated data (placeholder: sum of food - burned)
    const foods = await fetch(`/api/logs/food/range?start=${startStr}&end=${endStr}`).then(r=>r.json()).catch(()=>[]);
    const totalC = foods.reduce((a,f)=>a+(f.calories||0),0);
    const burned = await fetch(`/api/logs/burned/range?start=${startStr}&end=${endStr}`).then(r=>r.json()).catch(()=>[]);
    const totalB = (burned||[]).reduce((a,b)=>a+(b.calories||0),0);
    const diff = totalC - totalB;
    return {days:p, diff};
  }));

  list.innerHTML = entries.map(e=>{
    const sign = e.diff>=0?'+':'-';
    const cls = e.diff>=0?'text-primary':'text-accent-red';
    return `<li>${e.days}d: <span class="${cls}">${sign}${Math.abs(e.diff)} kcal</span></li>`;
  }).join('');
}

// ---------- BMI Gauge ----------
async function renderBMIGauge() {
  const profile = await getProfileInfo();
  const weight = parseFloat(profile.weight);
  const heightCm = parseFloat(profile.height);
  if (!weight || !heightCm) return;
  const heightM = heightCm/100;
  const bmi = weight / (heightM*heightM);
  const gauge = document.getElementById('bmiGauge');
  const pointer = document.getElementById('bmiPointer');
  const valueEl = document.getElementById('bmiValue');
  if (!gauge || !pointer || !valueEl) return;
  const minBMI = 15; const maxBMI = 40;
  const ratio = (bmi - minBMI) / (maxBMI - minBMI);
  const gaugeWidth = 300; // matches viewBox width
  const xPos = Math.min(Math.max(ratio,0),1) * gaugeWidth;
  pointer.setAttribute('transform', `translate(${xPos},0)`);
  valueEl.textContent = bmi.toFixed(1);
  // status badge
  const statusBadge = document.createElement('span');
  statusBadge.className='badge';
  let status='';
  if (bmi < 18.5) status='Underweight';
  else if (bmi < 25) status='Normal';
  else if (bmi < 30) status='Overweight';
  else status='Obese';
  statusBadge.textContent = status;
  const container = document.getElementById('bmi-gauge');
  const badgeDiv = container.querySelector('#bmi-status-badge') || container;
  if (badgeDiv) badgeDiv.innerHTML = `Status: <span class="badge">${status}</span>`;
}

// ---------- Initialization ----------
function initProgressPage() {
  renderStreak();
  renderWeightChart('90');
  renderCalorieChart(0);
  renderExpenditure();
  renderBMIGauge();

  // Hook filter buttons
  document.querySelectorAll('#weightControls button').forEach(btn => {
    btn.addEventListener('click', () => {
      const range = btn.getAttribute('data-range');
      renderWeightChart(range);
    });
  });
  document.querySelectorAll('#calorieControls button').forEach(btn => {
    btn.addEventListener('click', () => {
      const week = parseInt(btn.getAttribute('data-week'),10);
      renderCalorieChart(week);
    });
  });
}

// Run when DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initProgressPage);
} else {
  initProgressPage();
}
