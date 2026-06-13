// ============================================
// Nutri Tracker — Nutri Store (store.js)
// Catalog, Shopping Cart, Checkout, Order History
// ============================================

const PRODUCTS = [
  {
    id: 'prod_whey',
    name: 'Whey Protein Gold Isolate',
    desc: 'Ultra-filtered cold-processed whey isolate. 25g protein, 1g carb, 120 kcal. Best for post-workout muscle recovery.',
    price: 54.99,
    badge: 'Best Seller',
    tags: ['Recovery', 'Whey', 'Fast-Absorbing'],
    imageSvg: `<svg viewBox="0 0 100 120" width="85" height="85">
      <defs>
        <linearGradient id="wheyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#a855f7" />
          <stop offset="100%" stop-color="#6366f1" />
        </linearGradient>
      </defs>
      <rect x="28" y="10" width="44" height="12" rx="4" fill="#11072c" stroke="rgba(255,255,255,0.3)" stroke-width="1.5"/>
      <rect x="20" y="22" width="60" height="88" rx="12" fill="url(#wheyGrad)" stroke="rgba(255,255,255,0.15)" stroke-width="1.5"/>
      <rect x="25" y="42" width="50" height="42" rx="6" fill="rgba(0,0,0,0.3)" stroke="rgba(255,255,255,0.1)" />
      <text x="50" y="58" fill="#ffffff" font-size="8" font-weight="900" text-anchor="middle" letter-spacing="0.5">WHEY</text>
      <text x="50" y="68" fill="#a855f7" font-size="7" font-weight="800" text-anchor="middle">100% ISO</text>
      <text x="50" y="76" fill="var(--accent-cyan)" font-size="5" font-weight="600" text-anchor="middle">25g PROTEIN</text>
    </svg>`
  },
  {
    id: 'prod_vegan',
    name: 'Organic Plant-Based Protein',
    desc: 'Premium organic pea, pumpkin seed & brown rice blend. 20g protein, zero sugar. Hypoallergenic and easy digestion.',
    price: 45.99,
    badge: 'Organic',
    tags: ['Vegan', 'Gluten-Free', 'Clean Keto'],
    imageSvg: `<svg viewBox="0 0 100 120" width="85" height="85">
      <defs>
        <linearGradient id="veganGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#10b981" />
          <stop offset="100%" stop-color="#06b6d4" />
        </linearGradient>
      </defs>
      <rect x="28" y="10" width="44" height="12" rx="4" fill="#022c22" stroke="rgba(255,255,255,0.3)" stroke-width="1.5"/>
      <rect x="20" y="22" width="60" height="88" rx="12" fill="url(#veganGrad)" stroke="rgba(255,255,255,0.15)" stroke-width="1.5"/>
      <rect x="25" y="42" width="50" height="42" rx="6" fill="rgba(0,0,0,0.3)" stroke="rgba(255,255,255,0.1)" />
      <text x="50" y="58" fill="#ffffff" font-size="8" font-weight="900" text-anchor="middle" letter-spacing="0.5">PLANT</text>
      <text x="50" y="68" fill="#10b981" font-size="7" font-weight="800" text-anchor="middle">ORGANIC</text>
      <text x="50" y="76" fill="#06b6d4" font-size="5" font-weight="600" text-anchor="middle">VEGAN BLEND</text>
    </svg>`
  },
  {
    id: 'prod_bars',
    name: 'Choco-Caramel Protein Bars',
    desc: 'Box of 12 delicious soft-baked caramel crunch protein bars. 20g protein, only 2g sugar, high fiber. Perfect guilt-free snack.',
    price: 29.99,
    badge: 'Popular',
    tags: ['Snack', 'On-the-go', 'Low Sugar'],
    imageSvg: `<svg viewBox="0 0 120 100" width="85" height="85">
      <defs>
        <linearGradient id="barGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#f97316" />
          <stop offset="100%" stop-color="#db2777" />
        </linearGradient>
      </defs>
      <g transform="rotate(-15 60 50)">
        <rect x="20" y="35" width="80" height="30" rx="6" fill="url(#barGrad)" stroke="rgba(255,255,255,0.2)" stroke-width="1.5"/>
        <line x1="35" y1="35" x2="45" y2="65" stroke="rgba(255,255,255,0.3)" stroke-width="3"/>
        <line x1="50" y1="35" x2="60" y2="65" stroke="rgba(255,255,255,0.3)" stroke-width="3"/>
        <text x="75" y="53" fill="#ffffff" font-size="7" font-weight="900" text-anchor="middle">BAR 20g</text>
      </g>
    </svg>`
  },
  {
    id: 'prod_cookies',
    name: 'Protein Cookie - Choco Chip',
    desc: 'Box of 12 rich chocolate chip protein cookies. 16g protein, 10g dietary fiber, baked soft and chewy. Satisfy sweet cravings healthily.',
    price: 24.99,
    badge: 'Soft-Baked',
    tags: ['Keto-Friendly', 'Fiber', 'Baked'],
    imageSvg: `<svg viewBox="0 0 100 100" width="85" height="85">
      <circle cx="50" cy="50" r="38" fill="#d97706" stroke="rgba(255,255,255,0.15)" stroke-width="2" />
      <!-- Chocolate Chips -->
      <circle cx="35" cy="35" r="4.5" fill="#451a03" />
      <circle cx="65" cy="40" r="5" fill="#451a03" />
      <circle cx="45" cy="65" r="4.5" fill="#451a03" />
      <circle cx="60" cy="65" r="4.5" fill="#451a03" />
      <circle cx="30" cy="55" r="4" fill="#451a03" />
      <rect x="35" y="44" width="30" height="12" rx="3" fill="rgba(0,0,0,0.4)" />
      <text x="50" y="52" fill="#ffffff" font-size="6.5" font-weight="900" text-anchor="middle">COOKIE</text>
    </svg>`
  },
  {
    id: 'prod_bcaa',
    name: 'Hydro BCAA Amino Fuel',
    desc: 'Advanced intra-workout recovery formula. 7g BCAA, coconut water hydration complex. Zero sugar, zero calories.',
    price: 34.99,
    badge: 'Hydration',
    tags: ['Intra-Workout', 'Amino Acids', 'Sugar Free'],
    imageSvg: `<svg viewBox="0 0 100 120" width="85" height="85">
      <defs>
        <linearGradient id="bcaaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#06b6d4" />
          <stop offset="100%" stop-color="#3b82f6" />
        </linearGradient>
      </defs>
      <rect x="30" y="12" width="40" height="12" rx="3" fill="#083344" stroke="rgba(255,255,255,0.2)" />
      <rect x="22" y="24" width="56" height="84" rx="10" fill="url(#bcaaGrad)" stroke="rgba(255,255,255,0.15)" stroke-width="1.5"/>
      <rect x="26" y="44" width="48" height="38" rx="4" fill="rgba(0,0,0,0.35)" />
      <text x="50" y="58" fill="#ffffff" font-size="8" font-weight="900" text-anchor="middle">BCAA</text>
      <text x="50" y="68" fill="var(--accent-cyan)" font-size="7" font-weight="800" text-anchor="middle">RECOVERY</text>
    </svg>`
  }
];

let cart = [];

document.addEventListener('DOMContentLoaded', async () => {
  await initAuthGuard('store');
  initStorePage();
});

function initStorePage() {
  renderCatalog();
  loadCartFromStorage();
  updateCartUI();
  loadOrderHistory();
}

// ---------- Render Catalog ----------
function renderCatalog() {
  const container = document.getElementById('productGrid');
  if (!container) return;

  container.innerHTML = PRODUCTS.map(p => `
    <div class="product-card">
      <div class="product-image-container">
        ${p.badge ? `<span class="product-badge">${p.badge}</span>` : ''}
        ${p.imageSvg}
      </div>
      <div class="product-details">
        <h3 class="product-name">${p.name}</h3>
        <p class="product-desc">${p.desc}</p>
        <div class="product-meta-tags">
          ${p.tags.map(t => `<span class="product-tag">${t}</span>`).join('')}
        </div>
        <div class="product-footer">
          <span class="product-price">$${p.price.toFixed(2)}</span>
          <button class="btn btn-primary btn-sm" onclick="addToCart('${p.id}')">Add to Cart</button>
        </div>
      </div>
    </div>
  `).join('');
}

// ---------- Cart State Functions ----------
function loadCartFromStorage() {
  const stored = localStorage.getItem('nutri_cart');
  if (stored) {
    try {
      cart = JSON.parse(stored);
    } catch {
      cart = [];
    }
  }
}

function saveCartToStorage() {
  localStorage.setItem('nutri_cart', JSON.stringify(cart));
}

function addToCart(productId) {
  const product = PRODUCTS.find(p => p.id === productId);
  if (!product) return;

  const existing = cart.find(item => item.product.id === productId);
  if (existing) {
    existing.quantity++;
  } else {
    cart.push({ product, quantity: 1 });
  }

  saveCartToStorage();
  updateCartUI();
  showToast(`Added ${product.name} to cart`, 'success');
  toggleCart(true); // Slide open cart drawer
}

function changeQty(productId, delta) {
  const item = cart.find(item => item.product.id === productId);
  if (!item) return;

  item.quantity += delta;
  if (item.quantity <= 0) {
    cart = cart.filter(item => item.product.id !== productId);
  }

  saveCartToStorage();
  updateCartUI();
}

function updateCartUI() {
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const total = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

  // Update counts
  const countLabels = ['cartCountLabel', 'floatingCartBadge'];
  countLabels.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = count;
      if (id === 'floatingCartBadge') {
        el.style.display = count > 0 ? 'flex' : 'none';
      }
    }
  });

  // Update total value
  const totalVal = document.getElementById('cartTotalVal');
  if (totalVal) {
    totalVal.textContent = `$${total.toFixed(2)}`;
  }

  // Populate list
  const list = document.getElementById('cartItemsList');
  if (!list) return;

  if (cart.length === 0) {
    list.innerHTML = `
      <div class="empty-state" style="padding: 40px 10px;">
        <div class="empty-icon" style="font-size: 2rem;">🛒</div>
        <p>Your shopping cart is empty</p>
      </div>
    `;
    return;
  }

  list.innerHTML = cart.map(item => `
    <div class="cart-item">
      <div class="cart-item-image">
        ${item.product.imageSvg}
      </div>
      <div class="cart-item-info">
        <div class="cart-item-name" title="${item.product.name}">${item.product.name}</div>
        <div class="cart-item-price">$${item.product.price.toFixed(2)}</div>
      </div>
      <div class="cart-item-controls">
        <button class="cart-qty-btn" onclick="changeQty('${item.product.id}', -1)">-</button>
        <span class="cart-qty-val">${item.quantity}</span>
        <button class="cart-qty-btn" onclick="changeQty('${item.product.id}', 1)">+</button>
      </div>
    </div>
  `).join('');
}

function toggleCart(open) {
  const drawer = document.getElementById('cartDrawer');
  const overlay = document.getElementById('cartOverlay');
  if (drawer && overlay) {
    if (open) {
      drawer.classList.add('open');
      overlay.style.display = 'block';
    } else {
      drawer.classList.remove('open');
      overlay.style.display = 'none';
    }
  }
}

// ---------- Checkout Flow ----------
async function checkoutCart() {
  if (cart.length === 0) {
    showToast('Your cart is empty', 'warning');
    return;
  }

  const shippingAddress = document.getElementById('shippingAddress').value.trim();
  if (!shippingAddress) {
    showToast('Please enter shipping address', 'warning');
    return;
  }

  const total = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const itemsLog = cart.map(item => ({
    productId: item.product.id,
    name: item.product.name,
    quantity: item.quantity,
    price: item.product.price
  }));

  const orderData = {
    items: itemsLog,
    totalPrice: total,
    shippingAddress
  };

  const response = await apiPost('/api/store/order', orderData);
  if (response) {
    showToast('Order placed successfully! 🚀', 'success');
    cart = [];
    saveCartToStorage();
    updateCartUI();
    toggleCart(false);
    await loadOrderHistory();
  } else {
    showToast('Failed to place order. Try again.', 'error');
  }
}

// ---------- Load Order History ----------
async function loadOrderHistory() {
  const orders = await apiGet('/api/store/orders');
  const container = document.getElementById('ordersList');
  if (!container) return;

  if (!orders || orders.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding: 20px;">
        <p style="font-size:0.85rem;">No past orders found</p>
      </div>
    `;
    return;
  }

  // Show newest order first
  const displayOrders = [...orders].reverse();
  container.innerHTML = displayOrders.map(order => `
    <div class="food-log-item" style="flex-direction:column; align-items: stretch; gap:8px; padding:16px;">
      <div class="flex justify-between items-center">
        <div>
          <span style="font-weight:700; color:var(--accent-cyan); font-size:0.9rem;">Order: ${order.id}</span>
          <span style="font-size:0.75rem; color:var(--text-muted); margin-left:8px;">${order.date}</span>
        </div>
        <span class="meal-badge lunch" style="font-size:0.65rem;">${order.status}</span>
      </div>
      <div style="font-size:0.8rem; color:var(--text-secondary); line-height: 1.5; border-top:1px solid rgba(255,255,255,0.04); padding-top:6px;">
        ${order.items.map(item => `
          <div>${item.quantity}x ${item.name} ($${item.price.toFixed(2)})</div>
        `).join('')}
      </div>
      <div class="flex justify-between items-center" style="border-top:1px solid rgba(255,255,255,0.04); padding-top:6px; font-size:0.8rem;">
        <span style="color:var(--text-muted);">Ship To: ${order.shippingAddress}</span>
        <span style="font-weight:700; color:var(--accent-purple);">Total: $${order.totalPrice.toFixed(2)}</span>
      </div>
    </div>
  `).join('');
}

// Expose functions globally for HTML inline onclick handlers
window.addToCart = addToCart;
window.changeQty = changeQty;
window.toggleCart = toggleCart;
window.checkoutCart = checkoutCart;
