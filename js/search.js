// ============================================
// Nutri Tracker — Food Search (search.js)
// 50+ Food Database & Search
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
  await initAuthGuard('search');
  initSearch();
});

// ---------- Food Database ----------
const FOOD_DATABASE = [
  // Fruits
  { name: 'Apple', emoji: '🍎', category: 'fruits', calories: 95, protein: 0.5, carbs: 25, fat: 0.3, fiber: 4.4, serving: '1 medium (182g)' },
  { name: 'Banana', emoji: '🍌', category: 'fruits', calories: 105, protein: 1.3, carbs: 27, fat: 0.4, fiber: 3.1, serving: '1 medium (118g)' },
  { name: 'Orange', emoji: '🍊', category: 'fruits', calories: 62, protein: 1.2, carbs: 15.4, fat: 0.2, fiber: 3.1, serving: '1 medium (131g)' },
  { name: 'Mango', emoji: '🥭', category: 'fruits', calories: 99, protein: 1.4, carbs: 24.7, fat: 0.6, fiber: 2.6, serving: '1 cup (165g)' },
  { name: 'Grapes', emoji: '🍇', category: 'fruits', calories: 104, protein: 1.1, carbs: 27.3, fat: 0.2, fiber: 1.4, serving: '1 cup (151g)' },
  { name: 'Watermelon', emoji: '🍉', category: 'fruits', calories: 46, protein: 0.9, carbs: 11.5, fat: 0.2, fiber: 0.6, serving: '1 cup (152g)' },
  { name: 'Papaya', emoji: '🍈', category: 'fruits', calories: 55, protein: 0.9, carbs: 14, fat: 0.2, fiber: 2.5, serving: '1 cup (145g)' },
  { name: 'Pineapple', emoji: '🍍', category: 'fruits', calories: 82, protein: 0.9, carbs: 21.6, fat: 0.2, fiber: 2.3, serving: '1 cup (165g)' },
  { name: 'Strawberry', emoji: '🍓', category: 'fruits', calories: 49, protein: 1, carbs: 11.7, fat: 0.5, fiber: 3, serving: '1 cup (152g)' },
  { name: 'Blueberry', emoji: '🫐', category: 'fruits', calories: 84, protein: 1.1, carbs: 21.4, fat: 0.5, fiber: 3.6, serving: '1 cup (148g)' },

  // Vegetables
  { name: 'Spinach', emoji: '🥬', category: 'vegetables', calories: 7, protein: 0.9, carbs: 1.1, fat: 0.1, fiber: 0.7, serving: '1 cup raw (30g)' },
  { name: 'Broccoli', emoji: '🥦', category: 'vegetables', calories: 55, protein: 3.7, carbs: 11.2, fat: 0.6, fiber: 5.1, serving: '1 cup (156g)' },
  { name: 'Carrot', emoji: '🥕', category: 'vegetables', calories: 25, protein: 0.6, carbs: 5.8, fat: 0.1, fiber: 1.7, serving: '1 medium (61g)' },
  { name: 'Tomato', emoji: '🍅', category: 'vegetables', calories: 22, protein: 1.1, carbs: 4.8, fat: 0.2, fiber: 1.5, serving: '1 medium (123g)' },
  { name: 'Cucumber', emoji: '🥒', category: 'vegetables', calories: 16, protein: 0.7, carbs: 3.6, fat: 0.1, fiber: 0.5, serving: '1 cup (104g)' },
  { name: 'Bell Pepper', emoji: '🫑', category: 'vegetables', calories: 31, protein: 1, carbs: 6, fat: 0.3, fiber: 2.1, serving: '1 medium (119g)' },
  { name: 'Cauliflower', emoji: '🥬', category: 'vegetables', calories: 27, protein: 2.1, carbs: 5.3, fat: 0.3, fiber: 2.1, serving: '1 cup (107g)' },
  { name: 'Potato', emoji: '🥔', category: 'vegetables', calories: 161, protein: 4.3, carbs: 36.6, fat: 0.2, fiber: 3.8, serving: '1 medium (213g)' },
  { name: 'Onion', emoji: '🧅', category: 'vegetables', calories: 44, protein: 1.2, carbs: 10.3, fat: 0.1, fiber: 1.9, serving: '1 medium (110g)' },
  { name: 'Peas', emoji: '🟢', category: 'vegetables', calories: 118, protein: 7.9, carbs: 21, fat: 0.6, fiber: 8.8, serving: '1 cup (160g)' },

  // Proteins
  { name: 'Chicken Breast', emoji: '🍗', category: 'proteins', calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0, serving: '100g cooked' },
  { name: 'Eggs', emoji: '🥚', category: 'proteins', calories: 155, protein: 13, carbs: 1.1, fat: 11, fiber: 0, serving: '2 large (100g)' },
  { name: 'Salmon', emoji: '🐟', category: 'proteins', calories: 208, protein: 20, carbs: 0, fat: 13, fiber: 0, serving: '100g cooked' },
  { name: 'Tuna', emoji: '🐟', category: 'proteins', calories: 132, protein: 28, carbs: 0, fat: 1.3, fiber: 0, serving: '100g canned' },
  { name: 'Tofu', emoji: '🧈', category: 'proteins', calories: 76, protein: 8, carbs: 1.9, fat: 4.8, fiber: 0.3, serving: '100g' },
  { name: 'Greek Yogurt', emoji: '🥛', category: 'proteins', calories: 100, protein: 17, carbs: 6, fat: 0.7, fiber: 0, serving: '170g' },
  { name: 'Cottage Cheese', emoji: '🧀', category: 'proteins', calories: 98, protein: 11, carbs: 3.4, fat: 4.3, fiber: 0, serving: '100g' },
  { name: 'Lentils', emoji: '🫘', category: 'proteins', calories: 230, protein: 18, carbs: 40, fat: 0.8, fiber: 15.6, serving: '1 cup cooked (198g)' },
  { name: 'Chickpeas', emoji: '🫘', category: 'proteins', calories: 269, protein: 14.5, carbs: 45, fat: 4.2, fiber: 12.5, serving: '1 cup cooked (164g)' },
  { name: 'Almonds', emoji: '🌰', category: 'proteins', calories: 164, protein: 6, carbs: 6, fat: 14, fiber: 3.5, serving: '28g (23 almonds)' },

  // Grains
  { name: 'White Rice', emoji: '🍚', category: 'grains', calories: 206, protein: 4.3, carbs: 44.5, fat: 0.4, fiber: 0.6, serving: '1 cup cooked (158g)' },
  { name: 'Brown Rice', emoji: '🍚', category: 'grains', calories: 216, protein: 5, carbs: 44.8, fat: 1.8, fiber: 3.5, serving: '1 cup cooked (195g)' },
  { name: 'Oats', emoji: '🥣', category: 'grains', calories: 154, protein: 5.3, carbs: 27.4, fat: 2.6, fiber: 4, serving: '1/2 cup dry (40g)' },
  { name: 'Quinoa', emoji: '🍚', category: 'grains', calories: 222, protein: 8.1, carbs: 39.4, fat: 3.6, fiber: 5.2, serving: '1 cup cooked (185g)' },
  { name: 'Whole Wheat Bread', emoji: '🍞', category: 'grains', calories: 138, protein: 5.4, carbs: 23.6, fat: 2.4, fiber: 3.4, serving: '2 slices (56g)' },
  { name: 'Pasta', emoji: '🍝', category: 'grains', calories: 220, protein: 8.1, carbs: 43, fat: 1.3, fiber: 2.5, serving: '1 cup cooked (140g)' },

  // Indian Foods
  { name: 'Dal (Toor)', emoji: '🍲', category: 'indian', calories: 198, protein: 13, carbs: 34, fat: 1.2, fiber: 5, serving: '1 cup (200ml)' },
  { name: 'Roti', emoji: '🫓', category: 'indian', calories: 104, protein: 3.1, carbs: 18, fat: 3.7, fiber: 2.4, serving: '1 piece (40g)' },
  { name: 'Idli', emoji: '🥟', category: 'indian', calories: 58, protein: 2, carbs: 12.4, fat: 0.2, fiber: 0.6, serving: '1 piece (40g)' },
  { name: 'Dosa', emoji: '🥞', category: 'indian', calories: 133, protein: 3.9, carbs: 18.8, fat: 4.8, fiber: 0.9, serving: '1 piece (65g)' },
  { name: 'Biryani', emoji: '🍛', category: 'indian', calories: 290, protein: 12, carbs: 40, fat: 9, fiber: 1.5, serving: '1 cup (200g)' },
  { name: 'Paneer', emoji: '🧀', category: 'indian', calories: 265, protein: 18.3, carbs: 1.2, fat: 20.8, fiber: 0, serving: '100g' },
  { name: 'Sambar', emoji: '🍲', category: 'indian', calories: 130, protein: 6.5, carbs: 18, fat: 3.2, fiber: 3.5, serving: '1 cup (200ml)' },
  { name: 'Rajma', emoji: '🫘', category: 'indian', calories: 210, protein: 11, carbs: 35, fat: 2.5, fiber: 8, serving: '1 cup (200g)' },
  { name: 'Chole', emoji: '🫘', category: 'indian', calories: 240, protein: 12, carbs: 38, fat: 5, fiber: 9, serving: '1 cup (200g)' },
  { name: 'Poha', emoji: '🍚', category: 'indian', calories: 180, protein: 3.5, carbs: 32, fat: 5, fiber: 1.5, serving: '1 plate (150g)' },
  { name: 'Upma', emoji: '🍚', category: 'indian', calories: 195, protein: 4, carbs: 28, fat: 7, fiber: 2, serving: '1 plate (200g)' },
  { name: 'Paratha', emoji: '🫓', category: 'indian', calories: 230, protein: 5, carbs: 30, fat: 10, fiber: 2.5, serving: '1 piece (80g)' },
  { name: 'Naan', emoji: '🫓', category: 'indian', calories: 262, protein: 8.7, carbs: 43, fat: 5.5, fiber: 1.8, serving: '1 piece (90g)' },
  { name: 'Butter Chicken', emoji: '🍗', category: 'indian', calories: 240, protein: 18, carbs: 8, fat: 15, fiber: 1, serving: '1 cup (200g)' },
  { name: 'Palak Paneer', emoji: '🥬', category: 'indian', calories: 210, protein: 12, carbs: 8, fat: 14, fiber: 3, serving: '1 cup (200g)' }
];

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'fruits', label: '🍎 Fruits' },
  { id: 'vegetables', label: '🥬 Vegetables' },
  { id: 'proteins', label: '🥩 Proteins' },
  { id: 'grains', label: '🌾 Grains' },
  { id: 'indian', label: '🇮🇳 Indian' }
];

let currentCategory = 'all';
let selectedFood = null;

function initSearch() {
  renderCategoryTabs();
  renderFoodList();
  
  // Search input
  const searchInput = document.getElementById('foodSearchInput');
  searchInput.addEventListener('input', (e) => {
    renderFoodList(e.target.value.trim().toLowerCase());
  });
}

function renderCategoryTabs() {
  const container = document.getElementById('categoryTabs');
  container.innerHTML = CATEGORIES.map(cat => `
    <button class="category-tab ${cat.id === currentCategory ? 'active' : ''}" 
            onclick="selectCategory('${cat.id}')">
      ${cat.label}
    </button>
  `).join('');
}

function selectCategory(catId) {
  currentCategory = catId;
  renderCategoryTabs();
  const searchInput = document.getElementById('foodSearchInput');
  renderFoodList(searchInput.value.trim().toLowerCase());
}

function renderFoodList(searchQuery = '') {
  let foods = FOOD_DATABASE;
  
  if (currentCategory !== 'all') {
    foods = foods.filter(f => f.category === currentCategory);
  }
  
  if (searchQuery) {
    foods = foods.filter(f => f.name.toLowerCase().includes(searchQuery));
  }
  
  const container = document.getElementById('foodList');
  const countEl = document.getElementById('resultCount');
  
  if (countEl) countEl.textContent = `${foods.length} foods found`;
  
  if (foods.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <p>No foods found</p>
        <p style="font-size:0.8rem; margin-top:8px; color:var(--text-muted);">Try a different search or category</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = foods.map((f, i) => `
      <div class="food-search-card animate-fade-in" style="animation-delay:${i * 30}ms" onclick="openAddFoodModal(${FOOD_DATABASE.indexOf(f)})">
        <div class="food-emoji">${f.emoji}</div>
        <div class="food-details">
          <h4>${f.name}</h4>
          <div class="food-macros-preview">P: ${f.protein}g · C: ${f.carbs}g · F: ${f.fat}g · ${f.serving}</div>
        </div>
        <div class="food-cal-badge">${f.calories} kcal</div>
        <button class="add-food-btn" title="Add to log" onclick="addFoodFromSearch(${FOOD_DATABASE.indexOf(f)});event.stopPropagation();">+</button>
      </div>
    `).join('');
}

// ---------- Add Food Modal ----------
function openAddFoodModal(foodIndex) {
  selectedFood = FOOD_DATABASE[foodIndex];
  const modal = document.getElementById('addFoodModal');
  
  document.getElementById('modalFoodName').textContent = selectedFood.name;
  document.getElementById('modalFoodEmoji').textContent = selectedFood.emoji;
  document.getElementById('modalFoodCal').textContent = `${selectedFood.calories} kcal`;
  document.getElementById('modalFoodServing').textContent = selectedFood.serving;
  document.getElementById('modalFoodMacros').textContent = 
    `P: ${selectedFood.protein}g · C: ${selectedFood.carbs}g · F: ${selectedFood.fat}g · Fiber: ${selectedFood.fiber}g`;
  
  // Reset portion
  document.getElementById('portionMultiplier').value = '1';
  updatePortionPreview();
  
  // Reset meal type
  document.querySelectorAll('#addFoodModal .meal-type-option').forEach(btn => btn.classList.remove('active'));
  document.querySelector('#addFoodModal .meal-type-option[data-meal="lunch"]').classList.add('active');
  
  modal.classList.add('active');
}

function closeAddFoodModal() {
  document.getElementById('addFoodModal').classList.remove('active');
  selectedFood = null;
}

function selectMealType(el) {
  document.querySelectorAll('#addFoodModal .meal-type-option').forEach(btn => btn.classList.remove('active'));
  el.classList.add('active');
}

function updatePortionPreview() {
  const multiplier = parseFloat(document.getElementById('portionMultiplier').value) || 1;
  if (selectedFood) {
    const cal = Math.round(selectedFood.calories * multiplier);
    document.getElementById('portionCalPreview').textContent = `${cal} kcal`;
  }
}

async function addFoodFromSearch(index) {
  const food = FOOD_DATABASE[index];
  if (!food) {showToast('Food not found', 'error'); return;}
  const multiplier = 1; // default portion
  const mealType = 'lunch'; // default meal
  await addFoodToLog({
    name: food.name,
    calories: roundNum(food.calories * multiplier, 0),
    protein: roundNum(food.protein * multiplier, 1),
    carbs: roundNum(food.carbs * multiplier, 1),
    fat: roundNum(food.fat * multiplier, 1),
    fiber: roundNum(food.fiber * multiplier, 1),
    mealType: mealType,
    source: 'search',
    portion: multiplier
  });
  showToast(`${food.name} added!`, 'success');
  // Optional: refresh dashboard after short delay
  setTimeout(() => {
    window.location.href = 'dashboard.html';
  }, 500);
}
