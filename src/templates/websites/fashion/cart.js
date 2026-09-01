// مَدى — Demo shopping cart (client-side only).
// No backend, no real orders — state lives in memory + localStorage so the
// demo survives a page reload. Consumed by script.js.

const STORAGE_KEY = "mada-cart-v1";

let items = loadCart();
const listeners = new Set();

function loadCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCart() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Private browsing / storage disabled — cart still works for this session.
  }
}

function notify() {
  saveCart();
  listeners.forEach((callback) => callback(items));
}

function lineId(productId, size, colorName) {
  return `${productId}::${size}::${colorName}`;
}

export function onCartChange(callback) {
  listeners.add(callback);
  callback(items);
  return () => listeners.delete(callback);
}

export function addToCart(product, size, color, qty) {
  const id = lineId(product.id, size, color.name);
  const existing = items.find((item) => item.id === id);

  if (existing) {
    existing.qty += qty;
  } else {
    items.push({
      id,
      productId: product.id,
      name: product.name,
      image: product.image,
      alt: product.alt,
      price: product.price,
      size,
      colorName: color.name,
      colorHex: color.hex,
      qty,
    });
  }

  notify();
}

export function updateQty(id, qty) {
  const item = items.find((entry) => entry.id === id);
  if (!item) return;
  item.qty = Math.max(1, qty);
  notify();
}

export function removeFromCart(id) {
  items = items.filter((entry) => entry.id !== id);
  notify();
}

export function clearCart() {
  items = [];
  notify();
}

export function getItems() {
  return items;
}

export function getCount() {
  return items.reduce((total, item) => total + item.qty, 0);
}

export function getSubtotal() {
  return items.reduce((total, item) => total + item.price * item.qty, 0);
}
