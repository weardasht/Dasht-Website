/* ====== EDIT THIS: paste your Google Apps Script Web App URL here ====== */
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzZtGuMlhCMQvYadIp0EsUghtEKp4B9VzwYIEvIxjd1tz1oAR-SiA8ErpM8nxhp3zYojg/exec";
const SHIPPING_FEE = 250;
const FREE_SHIPPING_THRESHOLD = 10000;

/* Single source of truth for product data. Used by the homepage grid,
   every product detail page's Add to Cart button, and the cart drawer. */
const PRODUCTS = [
  { id:'saqi',     word:'ساقی',      meaning:'Saqi',      originalPrice:2999, salePrice:1699, color:'White' },
  { id:'chainama', word:'چائے نامہ', meaning:'Chai-Nama', originalPrice:2999, salePrice:1699, color:'White' },
  { id:'sitare',   word:'ستارے',     meaning:'Sitare',    originalPrice:2999, salePrice:1699, color:'Black' },
  { id:'bazeecha', word:'بازیچہ',    meaning:'Bazeecha',  originalPrice:2999, salePrice:1699, color:'Black' },
];
const SIZES = ['S','M','L','XL'];

let cart = JSON.parse(localStorage.getItem('dasht_cart') || '[]');
let selectedSize = {};
let searchTerm = '';

/* ---------- fallback line-art (used only if a product photo fails to load) ---------- */
function teeSVG(p){
  return `<svg class="tee-svg" viewBox="0 0 160 160" width="80%" height="80%">
    <path class="body" d="M50 30 L30 45 L20 65 L35 72 L40 60 L40 140 L120 140 L120 60 L125 72 L140 65 L130 45 L110 30 L95 40 L65 40 Z" />
    <text x="80" y="98" text-anchor="middle" class="tee-word">${p.word}</text>
  </svg>`;
}

/* ---------- homepage product grid ---------- */
function renderGrid(){
  const grid = document.getElementById('grid');
  if(!grid) return;
  const visible = PRODUCTS.filter(p =>
    !searchTerm || p.meaning.toLowerCase().includes(searchTerm) || p.word.includes(searchTerm)
  );
  if(visible.length === 0){
    grid.innerHTML = `<div class="no-results">No tees match "${searchTerm}"</div>`;
    return;
  }
  grid.innerHTML = visible.map(p => {
    selectedSize[p.id] = selectedSize[p.id] || null;
    return `
    <div class="card">
      <a class="card-link" href="products/${p.id}.html">
        <span class="card-badge">Sale</span>
        <div class="tee-art">${teeSVG(p)}</div>
        <div class="card-tag">
          <span class="card-word">${p.word}</span>
          <span class="card-meaning">${p.meaning} · ${p.color}</span>
        </div>
      </a>
      <div class="size-row" id="sizes-${p.id}">
        ${SIZES.map(s => `<button class="size-btn" onclick="pickSize('${p.id}','${s}')" id="size-${p.id}-${s}">${s}</button>`).join('')}
      </div>
      <div class="card-bottom">
        <div class="price-block">
          <span class="price-original mono">Rs ${p.originalPrice.toLocaleString()}</span>
          <span class="price-sale mono">Rs ${p.salePrice.toLocaleString()}</span>
        </div>
        <button class="add-btn" id="add-${p.id}" onclick="addToCart('${p.id}')">Add</button>
      </div>
    </div>`;
  }).join('');
}

function applySearch(){
  const input = document.getElementById('searchInput');
  if(!input) return;
  searchTerm = input.value.trim().toLowerCase();
  renderGrid();
}
function toggleSearch(){
  const bar = document.getElementById('searchBar');
  if(!bar) return;
  bar.classList.toggle('open');
  if(bar.classList.contains('open')) document.getElementById('searchInput').focus();
}

function toggleNav(open){
  document.getElementById('navDrawer').classList.toggle('open', open);
  document.getElementById('navOverlay').classList.toggle('open', open);
}

/* ---------- size selection (shared by grid cards and product detail page) ---------- */
function pickSize(pid, size){
  selectedSize[pid] = size;
  SIZES.forEach(s => {
    const el = document.getElementById(`size-${pid}-${s}`);
    if(el) el.classList.toggle('selected', s === size);
  });
}

function addToCart(pid){
  const size = selectedSize[pid];
  if(!size){
    const row = document.getElementById(`sizes-${pid}`);
    if(row){
      row.style.outline = '1px solid #9C4A2E';
      setTimeout(()=> row.style.outline = 'none', 900);
    }
    return;
  }
  const product = PRODUCTS.find(p => p.id === pid);
  const existing = cart.find(i => i.id === pid && i.size === size);
  if(existing){ existing.qty += 1; }
  else{ cart.push({ id:pid, word:product.word, meaning:product.meaning, price:product.salePrice, size, qty:1 }); }
  saveCart();
  const btn = document.getElementById(`add-${pid}`);
  if(btn){
    const original = btn.textContent;
    btn.textContent = 'Added ✓'; btn.classList.add('added');
    setTimeout(()=>{ btn.textContent = original; btn.classList.remove('added'); }, 1200);
  }
}

function changeQty(idx, delta){
  cart[idx].qty += delta;
  if(cart[idx].qty <= 0) cart.splice(idx, 1);
  saveCart();
}
function removeItem(idx){ cart.splice(idx, 1); saveCart(); }

function saveCart(){
  localStorage.setItem('dasht_cart', JSON.stringify(cart));
  renderCart();
}

function subtotal(){ return cart.reduce((a,i) => a + i.qty * i.price, 0); }
function shippingCost(){ return (cart.length === 0 || subtotal() >= FREE_SHIPPING_THRESHOLD) ? 0 : SHIPPING_FEE; }
function grandTotal(){ return subtotal() + shippingCost(); }

/* ---------- cart drawer (present on every page) ---------- */
function renderCart(){
  const itemsEl = document.getElementById('drawerItems');
  const countEl = document.getElementById('cartCount');
  const toCheckoutBtn = document.getElementById('toCheckoutBtn');
  if(!itemsEl || !countEl || !toCheckoutBtn) return;

  countEl.textContent = cart.reduce((a,i) => a + i.qty, 0);
  document.getElementById('cartTotal').textContent = `Rs ${subtotal().toLocaleString()}`;

  if(cart.length === 0){
    itemsEl.innerHTML = `<div class="empty-cart">Your cart is empty.<br>Add a word that means something to you.</div>`;
    toCheckoutBtn.classList.add('disabled');
  } else {
    toCheckoutBtn.classList.remove('disabled');
    itemsEl.innerHTML = cart.map((item, idx) => `
      <div class="drawer-item">
        <div>
          <div class="di-word">${item.word}</div>
          <div class="di-meta">${item.meaning} · Size ${item.size}</div>
          <div class="di-qty">
            <button class="qty-btn" onclick="changeQty(${idx},-1)">−</button>
            <span class="mono">${item.qty}</span>
            <button class="qty-btn" onclick="changeQty(${idx},1)">+</button>
          </div>
          <span class="di-remove" onclick="removeItem(${idx})">Remove</span>
        </div>
        <span class="di-price mono">Rs ${(item.price * item.qty).toLocaleString()}</span>
      </div>
    `).join('');
  }
}

function openCart(){
  document.getElementById('overlay').classList.add('open');
  document.getElementById('drawer').classList.add('open');
  backToCart();
}
function closeCart(){
  document.getElementById('overlay').classList.remove('open');
  document.getElementById('drawer').classList.remove('open');
}

function goToCheckout(){
  if(cart.length === 0) return;
  document.getElementById('cartView').classList.remove('active');
  document.getElementById('checkoutView').classList.add('active');
  document.getElementById('successView').classList.remove('active');
  document.getElementById('orderSummaryMini').innerHTML = cart.map(i =>
    `${i.meaning} (${i.word}) · Size ${i.size} × ${i.qty} — Rs ${(i.price*i.qty).toLocaleString()}`
  ).join('<br>');
  const ship = shippingCost();
  document.getElementById('checkoutSubtotal').textContent = `Rs ${subtotal().toLocaleString()}`;
  document.getElementById('checkoutShipping').textContent = ship === 0 ? 'Free' : `Rs ${ship.toLocaleString()}`;
  document.getElementById('checkoutTotal').textContent = `Rs ${grandTotal().toLocaleString()}`;
  document.getElementById('freeShipNote').style.display = ship === 0 ? 'block' : 'none';
}

function backToCart(){
  document.getElementById('cartView').classList.add('active');
  document.getElementById('checkoutView').classList.remove('active');
  document.getElementById('successView').classList.remove('active');
}

async function placeOrder(){
  const name = document.getElementById('fName').value.trim();
  const phone = document.getElementById('fPhone').value.trim();
  const address = document.getElementById('fAddress').value.trim();
  const city = document.getElementById('fCity').value.trim();
  const notes = document.getElementById('fNotes').value.trim();

  if(!name || !phone || !address || !city){
    document.getElementById('checkoutForm').reportValidity();
    return;
  }

  const itemsText = cart.map(i => `${i.meaning} (${i.word}) x${i.qty} [${i.size}]`).join(', ');
  const ship = shippingCost();
  const payload = {
    type: 'order', name, phone, address, city, notes,
    items: itemsText,
    total: `Rs ${grandTotal().toLocaleString()} (shipping: ${ship === 0 ? 'Free' : 'Rs ' + ship})`
  };

  const btn = document.getElementById('placeOrderBtn');
  btn.textContent = 'Placing order...';
  btn.classList.add('disabled');

  try{
    await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST', mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload)
    });
  } catch(err){ console.error('Order send failed', err); }

  cart = [];
  saveCart();
  document.getElementById('cartView').classList.remove('active');
  document.getElementById('checkoutView').classList.remove('active');
  document.getElementById('successView').classList.add('active');
  btn.textContent = 'Place Order';
  btn.classList.remove('disabled');
}

async function joinVIP(e){
  e.preventDefault();
  const email = document.getElementById('vipEmail').value.trim();
  const msg = document.getElementById('vipMsg');
  if(!email) return false;
  msg.textContent = 'Joining...';
  try{
    await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST', mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ type: 'newsletter', email })
    });
  } catch(err){ console.error('VIP signup failed', err); }
  msg.textContent = "You're on the list.";
  document.getElementById('vipEmail').value = '';
  return false;
}

function openPolicy(name){ document.getElementById(name + 'Modal').classList.add('open'); }
function closePolicy(name){ document.getElementById(name + 'Modal').classList.remove('open'); }
function openSizeChart(){ document.getElementById('sizeChartModal').classList.add('open'); }
function closeSizeChart(){ document.getElementById('sizeChartModal').classList.remove('open'); }

/* ---------- product detail page image gallery ---------- */
function initGallery(){
  const main = document.getElementById('galleryMain');
  const thumbs = document.querySelectorAll('.gallery-thumb');
  if(!main || thumbs.length === 0) return;
  thumbs.forEach(thumb => {
    thumb.addEventListener('click', () => {
      main.src = thumb.getAttribute('data-full');
      thumbs.forEach(t => t.classList.remove('active'));
      thumb.classList.add('active');
    });
  });
}

/* run on every page load */
renderGrid();
renderCart();
initGallery();
