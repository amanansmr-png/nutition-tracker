// ============================================
// Nutri Tracker — AI Food Scanner (scan.js)
// Camera + Gemini Vision API Integration
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
  await initAuthGuard('scan');
  initScanner();
});

let stream = null;
let capturedImageData = null;

function initScanner() {
  checkApiKey();
}

function checkApiKey() {
  const key = getGeminiKey();
  const keyStatus = document.getElementById('apiKeyStatus');
  if (keyStatus) {
    if (key) {
      keyStatus.innerHTML = `<span class="text-green">✓ API Key configured</span>`;
    } else {
      keyStatus.innerHTML = `<span class="text-orange">⚠ No API Key — <a href="#" onclick="openSettingsModal()" style="color:var(--accent-purple);text-decoration:underline;">Set up now</a></span>`;
    }
  }
}

// ---------- Camera ----------
async function startCamera() {
  const video = document.getElementById('cameraVideo');
  const placeholder = document.getElementById('cameraPlaceholder');

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 960 } }
    });
    video.srcObject = stream;
    video.style.display = 'block';
    if (placeholder) placeholder.style.display = 'none';

    document.getElementById('startCameraBtn').style.display = 'none';
    document.getElementById('captureBtn').style.display = 'flex';
    document.getElementById('stopCameraBtn').style.display = 'flex';

    showToast('Camera active', 'success');
  } catch (err) {
    showToast('Camera access denied. Try uploading a photo instead.', 'error');
    console.error('Camera error:', err);
  }
}

function stopCamera() {
  if (stream) {
    stream.getTracks().forEach(t => t.stop());
    stream = null;
  }
  const video = document.getElementById('cameraVideo');
  video.style.display = 'none';
  video.srcObject = null;

  document.getElementById('cameraPlaceholder').style.display = 'flex';
  document.getElementById('startCameraBtn').style.display = 'flex';
  document.getElementById('captureBtn').style.display = 'none';
  document.getElementById('stopCameraBtn').style.display = 'none';
}

function capturePhoto() {
  const video = document.getElementById('cameraVideo');
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0);

  capturedImageData = canvas.toDataURL('image/jpeg', 0.8);

  // Show preview
  const preview = document.getElementById('capturedPreview');
  const previewImg = document.getElementById('previewImage');
  previewImg.src = capturedImageData;
  preview.style.display = 'block';

  // Hide camera viewport
  document.getElementById('scannerViewport').style.display = 'none';
  document.getElementById('cameraControls').style.display = 'none';

  stopCamera();
  showToast('Photo captured!', 'success');
}

// ---------- File Upload ----------
function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    showToast('Please select an image file', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    capturedImageData = e.target.result;

    const preview = document.getElementById('capturedPreview');
    const previewImg = document.getElementById('previewImage');
    previewImg.src = capturedImageData;
    preview.style.display = 'block';

    document.getElementById('scannerViewport').style.display = 'none';
    document.getElementById('cameraControls').style.display = 'none';

    showToast('Image loaded!', 'success');
  };
  reader.readAsDataURL(file);
}

// ---------- Retake ----------
function retakePhoto() {
  capturedImageData = null;
  document.getElementById('capturedPreview').style.display = 'none';
  document.getElementById('scannerViewport').style.display = 'block';
  document.getElementById('cameraControls').style.display = 'flex';
  document.getElementById('analysisResult').style.display = 'none';
  document.getElementById('startCameraBtn').style.display = 'flex';
}

// ---------- Gemini Vision API ----------
async function analyzeFood() {
  const apiKey = getGeminiKey();
  if (!apiKey) {
    openSettingsModal();
    showToast('Please enter your Gemini API key first', 'warning');
    return;
  }

  if (!capturedImageData) {
    showToast('Please capture or upload an image first', 'warning');
    return;
  }

  const analyzeBtn = document.getElementById('analyzeBtn');
  const loadingEl = document.getElementById('analysisLoading');
  const resultEl = document.getElementById('analysisResult');

  analyzeBtn.disabled = true;
  analyzeBtn.innerHTML = '<div class="spinner" style="width:20px;height:20px;border-width:2px;"></div> Analyzing...';
  loadingEl.style.display = 'flex';
  resultEl.style.display = 'none';

  // Extract base64 data (remove data URL prefix)
  const base64 = capturedImageData.split(',')[1];
  const mediaType = capturedImageData.split(';')[0].split(':')[1];

  try {
    const response = await fetch('/api/scan', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        base64: base64,
        mediaType: mediaType,
        clientApiKey: apiKey
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`API error: ${response.status}`);
    }

    const nutrition = await response.json();
    if (nutrition.error) {
      throw new Error(nutrition.error);
    }

    displayAnalysisResult(nutrition);
    showToast('Analysis complete!', 'success');

  } catch (err) {
    console.error('Analysis error:', err);
    showToast(err.message || 'Analysis failed. Check your API key.', 'error');
  } finally {
    analyzeBtn.disabled = false;
    analyzeBtn.innerHTML = '🔬 Analyze Food';
    loadingEl.style.display = 'none';
  }
}

// ---------- Display Results ----------
function displayAnalysisResult(nutrition) {
  const resultEl = document.getElementById('analysisResult');
  resultEl.style.display = 'block';

  // Store for adding to log
  window._scannedFood = nutrition;

  document.getElementById('resultFoodName').textContent = nutrition.name || 'Unknown Food';
  document.getElementById('resultServing').textContent = nutrition.servingSize || '1 serving';

  // Health score
  const score = nutrition.healthScore || 5;
  const scoreEl = document.getElementById('healthScoreValue');
  const scoreLabelEl = document.getElementById('healthScoreLabel');
  scoreEl.textContent = score;

  let scoreColor, scoreLabel;
  if (score >= 8) { scoreColor = 'var(--accent-green)'; scoreLabel = 'Excellent'; }
  else if (score >= 6) { scoreColor = 'var(--accent-cyan)'; scoreLabel = 'Good'; }
  else if (score >= 4) { scoreColor = 'var(--accent-yellow)'; scoreLabel = 'Moderate'; }
  else { scoreColor = 'var(--accent-red)'; scoreLabel = 'Poor'; }

  scoreEl.style.color = scoreColor;
  scoreLabelEl.textContent = scoreLabel;
  scoreLabelEl.style.color = scoreColor;

  // Nutrition grid
  const items = [
    { label: 'Calories', value: nutrition.calories, unit: 'kcal', color: 'var(--accent-purple)' },
    { label: 'Protein', value: nutrition.protein, unit: 'g', color: 'var(--accent-cyan)' },
    { label: 'Carbs', value: nutrition.carbs, unit: 'g', color: 'var(--accent-orange)' },
    { label: 'Fat', value: nutrition.fat, unit: 'g', color: 'var(--accent-pink)' },
    { label: 'Fiber', value: nutrition.fiber, unit: 'g', color: 'var(--accent-green)' },
    { label: 'Sugar', value: nutrition.sugar, unit: 'g', color: 'var(--accent-yellow)' },
    { label: 'Sodium', value: nutrition.sodium, unit: 'mg', color: 'var(--text-secondary)' },
    { label: 'Potassium', value: nutrition.potassium, unit: 'mg', color: 'var(--text-secondary)' },
    { label: 'Vitamin C', value: nutrition.vitaminC, unit: 'mg', color: 'var(--accent-yellow)' },
    { label: 'Calcium', value: nutrition.calcium, unit: 'mg', color: 'var(--text-secondary)' },
    { label: 'Iron', value: nutrition.iron, unit: 'mg', color: 'var(--accent-red)' },
    { label: 'Health', value: score + '/10', unit: '', color: scoreColor }
  ];

  const grid = document.getElementById('nutritionGrid');
  grid.innerHTML = items.map(item => `
    <div class="nutrition-item">
      <div class="nut-value" style="color:${item.color}">${typeof item.value === 'number' ? roundNum(item.value) : item.value}${item.unit ? ' ' : ''}${item.unit}</div>
      <div class="nut-label">${item.label}</div>
    </div>
  `).join('');

  // Scroll to result
  resultEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ---------- Add Scanned Food to Log ----------
function addScannedFood(mealType) {
  const food = window._scannedFood;
  if (!food) {
    showToast('No food data to add', 'warning');
    return;
  }

  addFoodToLog({
    name: food.name,
    calories: food.calories || 0,
    protein: food.protein || 0,
    carbs: food.carbs || 0,
    fat: food.fat || 0,
    fiber: food.fiber || 0,
    mealType: mealType,
    source: 'scan'
  });

  // Highlight selected meal button
  document.querySelectorAll('.meal-type-option').forEach(btn => btn.classList.remove('active'));
  event.target.closest('.meal-type-option').classList.add('active');

  showToast(`${food.name} added to ${mealType}!`, 'success');

  setTimeout(() => {
    window.location.href = 'dashboard.html';
  }, 1200);
}

// ---------- Settings Modal ----------
function openSettingsModal() {
  const modal = document.getElementById('settingsModal');
  const keyInput = document.getElementById('geminiKeyInput');
  keyInput.value = getGeminiKey();
  modal.classList.add('active');
}

function closeSettingsModal() {
  document.getElementById('settingsModal').classList.remove('active');
}

function saveApiKey() {
  const key = document.getElementById('geminiKeyInput').value.trim();
  setGeminiKey(key);
  closeSettingsModal();
  checkApiKey();
  showToast(key ? 'API key saved!' : 'API key removed', key ? 'success' : 'info');
}
