// ============================================
// Nutri Tracker — History (history.js)
// 7-Day Chart + Daily Breakdown
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
  await initAuthGuard('history');
  await initHistory();
});

let selectedDay = null;

async function initHistory() {
  await renderChart();
  await renderWeekSummary();
}

// ---------- 7-Day Bar Chart ----------
async function renderChart() {
  const days = getLast7Days();
  const goals = await getGoals();
  const maxCal = goals.calories * 1.3; // Scale chart to 130% of goal
  
  const container = document.getElementById('chartBars');
  if (!container) return;
  
  const barsHtmlPromises = days.map(async (dateStr, i) => {
    const totals = await getDayTotals(dateStr);
    const cal = totals.calories;
    const pct = Math.min((cal / maxCal) * 100, 100);
    const isToday = dateStr === getToday();
    
    // Color based on goal adherence
    let barColor;
    const ratio = cal / goals.calories;
    if (cal === 0) barColor = 'rgba(255,255,255,0.08)';
    else if (ratio <= 0.9) barColor = 'var(--gradient-cool)';
    else if (ratio <= 1.1) barColor = 'var(--gradient-success)';
    else barColor = 'var(--gradient-warm)';
    
    return `
      <div class="chart-bar-wrapper" onclick="selectDay('${dateStr}')">
        <div class="chart-bar-value">${cal > 0 ? Math.round(cal) : '-'}</div>
        <div class="chart-bar" style="height:${Math.max(pct, 3)}%; background:${barColor}; animation-delay:${i * 100}ms; ${isToday ? 'box-shadow: 0 0 15px rgba(168,85,247,0.3);' : ''}"></div>
        <div class="chart-bar-label" style="${isToday ? 'color:var(--accent-purple); font-weight:700;' : ''}">${getDayName(dateStr)}</div>
        <div class="chart-bar-label" style="font-size:0.65rem;">${formatDate(dateStr)}</div>
      </div>
    `;
  });
  
  const barsHtml = await Promise.all(barsHtmlPromises);
  container.innerHTML = barsHtml.join('');
  
  // Goal line
  const goalLineContainer = document.getElementById('goalLine');
  if (goalLineContainer) {
    const goalPct = (goals.calories / maxCal) * 100;
    goalLineContainer.style.bottom = `calc(${goalPct}% + 20px)`;
    goalLineContainer.querySelector('.goal-line-label').textContent = `Goal: ${goals.calories} kcal`;
  }
  
  // Select today by default
  await selectDay(getToday());
}

// ---------- Select Day ----------
async function selectDay(dateStr) {
  selectedDay = dateStr;
  
  // Highlight active bar
  document.querySelectorAll('.chart-bar-wrapper').forEach(w => {
    w.style.opacity = '0.6';
  });
  const bars = document.querySelectorAll('.chart-bar-wrapper');
  const days = getLast7Days();
  const idx = days.indexOf(dateStr);
  if (idx >= 0 && bars[idx]) {
    bars[idx].style.opacity = '1';
  }
  
  await renderDayBreakdown(dateStr);
}

// ---------- Day Breakdown ----------
async function renderDayBreakdown(dateStr) {
  const totals = await getDayTotals(dateStr);
  const water = await getWater(dateStr);
  const burned = await getBurned(dateStr);
  const goals = await getGoals();
  const foods = await getFoodLogForDate(dateStr);
  
  const container = document.getElementById('dayBreakdown');
  if (!container) return;
  
  const isToday = dateStr === getToday();
  const dayLabel = isToday ? 'Today' : formatDate(dateStr) + ' (' + getDayName(dateStr) + ')';
  
  container.innerHTML = `
    <div class="section-header flex items-center justify-between">
      <div>
        <h2 style="font-size:1.2rem;">${dayLabel}</h2>
        <p style="font-size:0.8rem;">${foods.length} items logged</p>
      </div>
      <div style="font-size:0.8rem; color:var(--text-muted);">
        ${dateStr}
      </div>
    </div>
    
    <div class="day-breakdown">
      <div class="breakdown-item">
        <div class="breakdown-value text-purple">${Math.round(totals.calories)}</div>
        <div class="breakdown-label">Calories</div>
        <div style="font-size:0.65rem; color:var(--text-muted); margin-top:2px;">/ ${goals.calories}</div>
      </div>
      <div class="breakdown-item">
        <div class="breakdown-value text-cyan">${roundNum(totals.protein, 0)}g</div>
        <div class="breakdown-label">Protein</div>
        <div style="font-size:0.65rem; color:var(--text-muted); margin-top:2px;">/ ${goals.protein}g</div>
      </div>
      <div class="breakdown-item">
        <div class="breakdown-value text-orange">${roundNum(totals.carbs, 0)}g</div>
        <div class="breakdown-label">Carbs</div>
        <div style="font-size:0.65rem; color:var(--text-muted); margin-top:2px;">/ ${goals.carbs}g</div>
      </div>
      <div class="breakdown-item">
        <div class="breakdown-value text-pink">${roundNum(totals.fat, 0)}g</div>
        <div class="breakdown-label">Fat</div>
        <div style="font-size:0.65rem; color:var(--text-muted); margin-top:2px;">/ ${goals.fat}g</div>
      </div>
      <div class="breakdown-item">
        <div class="breakdown-value text-green">${roundNum(totals.fiber, 0)}g</div>
        <div class="breakdown-label">Fiber</div>
        <div style="font-size:0.65rem; color:var(--text-muted); margin-top:2px;">/ ${goals.fiber}g</div>
      </div>
      <div class="breakdown-item">
        <div class="breakdown-value" style="color:var(--accent-cyan);">${water} 💧</div>
        <div class="breakdown-label">Water</div>
        <div style="font-size:0.65rem; color:var(--text-muted); margin-top:2px;">/ ${goals.water} glasses</div>
      </div>
    </div>
    
    ${burned > 0 ? `
    <div style="margin-top:16px; padding:12px 16px; background:rgba(239,68,68,0.08); border-radius:var(--radius-sm); border:1px solid rgba(239,68,68,0.15);">
      <span style="font-size:0.8rem; color:var(--text-secondary);">🔥 Calories Burned:</span>
      <span style="font-weight:700; color:var(--accent-orange); margin-left:8px;">${burned} kcal</span>
    </div>
    ` : ''}
    
    ${foods.length > 0 ? `
    <div style="margin-top:20px;">
      <h3 style="font-size:1rem; font-weight:600; margin-bottom:12px;">Food Log</h3>
      <div class="scroll-list" style="max-height:300px;">
        ${foods.map(f => `
          <div class="food-log-item">
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
          </div>
        `).join('')}
      </div>
    </div>
    ` : `
    <div class="empty-state" style="padding:20px;">
      <p style="font-size:0.85rem;">No food logged on this day</p>
    </div>
    `}
  `;
}

// ---------- Week Summary ----------
async function renderWeekSummary() {
  const days = getLast7Days();
  let totalCal = 0, totalProtein = 0, totalCarbs = 0, totalFat = 0;
  let daysWithData = 0;
  
  for (const d of days) {
    const t = await getDayTotals(d);
    if (t.calories > 0) daysWithData++;
    totalCal += t.calories;
    totalProtein += t.protein;
    totalCarbs += t.carbs;
    totalFat += t.fat;
  }
  
  const avgCal = daysWithData > 0 ? Math.round(totalCal / daysWithData) : 0;
  
  const el = document.getElementById('weekSummary');
  if (!el) return;
  
  el.innerHTML = `
    <div class="grid-3" style="gap:12px;">
      <div class="stat-card text-center">
        <div class="stat-label">Total</div>
        <div class="stat-value text-purple" style="font-size:1.3rem;">${Math.round(totalCal)}</div>
        <div class="stat-unit">kcal this week</div>
      </div>
      <div class="stat-card text-center">
        <div class="stat-label">Average</div>
        <div class="stat-value text-cyan" style="font-size:1.3rem;">${avgCal}</div>
        <div class="stat-unit">kcal / day</div>
      </div>
      <div class="stat-card text-center">
        <div class="stat-label">Days Tracked</div>
        <div class="stat-value text-green" style="font-size:1.3rem;">${daysWithData}</div>
        <div class="stat-unit">of 7 days</div>
      </div>
    </div>
  `;
}

