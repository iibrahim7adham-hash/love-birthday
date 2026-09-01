// مَدى — Fashion template
// Vanilla JS: navbar scroll state, mobile drawer, product catalog rendering,
// product quick-view modal, demo shopping cart, scroll-reveal animations.

import { PRODUCTS, AVAILABILITY_LABELS } from "./products.js";
import {
  addToCart,
  updateQty,
  removeFromCart,
  getItems,
  getSubtotal,
  onCartChange,
  clearCart,
} from "./cart.js";

const header = document.getElementById("site-header");
const menuBtn = document.getElementById("menu-btn");
const drawer = document.getElementById("nav-drawer");

/* -------------------- Overlay open/close + body scroll lock --------------------
   Shared by the nav drawer, product modal, cart drawer and checkout modal so
   every overlay opens/closes with the same smooth, interruptible transition
   and never lets the page scroll behind it (iOS rubber-banding included). */

const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Each open/close call bumps a per-element token. A close's transitionend
// listener and fallback timer only apply `hidden = true` if the token they
// captured is still current — otherwise a reopen that happened while the
// previous close animation was still settling would get yanked invisible
// out from under the user once that stale callback fired.
const overlayTokens = new WeakMap();

function bumpOverlayToken(el) {
  const token = (overlayTokens.get(el) || 0) + 1;
  overlayTokens.set(el, token);
  return token;
}

function openOverlay(el) {
  if (!el) return;
  bumpOverlayToken(el);
  el.hidden = false;
  if (prefersReducedMotion()) {
    el.classList.add("is-open");
    return;
  }
  // Double rAF: guarantees the browser has painted the "closed" state
  // (post `hidden = false`) before the class flips, so the transition
  // actually runs instead of jumping straight to its end state.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => el.classList.add("is-open"));
  });
}

function closeOverlay(el, panelSelector) {
  if (!el || el.hidden) return;
  const token = bumpOverlayToken(el);
  el.classList.remove("is-open");
  if (prefersReducedMotion()) {
    el.hidden = true;
    return;
  }
  const panel = panelSelector ? el.querySelector(panelSelector) : null;
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    // If the overlay was reopened (or closed again) since this call, that
    // newer call owns `hidden` now — don't stomp on it.
    if (overlayTokens.get(el) === token) {
      el.hidden = true;
    }
  };
  if (panel) {
    panel.addEventListener("transitionend", finish, { once: true });
  }
  // Fallback in case transitionend doesn't fire (e.g. panel unmounted mid-transition).
  setTimeout(finish, 350);
}

let scrollLockCount = 0;
let lockedScrollY = 0;

function lockBodyScroll() {
  if (scrollLockCount === 0) {
    lockedScrollY = window.scrollY;
    document.body.style.top = `-${lockedScrollY}px`;
    document.body.style.position = "fixed";
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.classList.add("scroll-locked");
  }
  scrollLockCount++;
}

function unlockBodyScroll() {
  scrollLockCount = Math.max(0, scrollLockCount - 1);
  if (scrollLockCount === 0) {
    document.body.classList.remove("scroll-locked");
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.left = "";
    document.body.style.right = "";
    window.scrollTo(0, lockedScrollY);
  }
}

/* -------------------- Navbar scroll state -------------------- */

function updateHeaderState() {
  if (!header) return;
  header.classList.toggle("is-scrolled", window.scrollY > 8);
}

updateHeaderState();
window.addEventListener("scroll", updateHeaderState, { passive: true });

/* -------------------- Mobile drawer -------------------- */

function openDrawer() {
  if (!drawer || !menuBtn || !drawer.hidden) return;
  openOverlay(drawer);
  menuBtn.setAttribute("aria-expanded", "true");
  lockBodyScroll();
}

function closeDrawer() {
  if (!drawer || !menuBtn || drawer.hidden) return;
  closeOverlay(drawer, ".nav-drawer-panel");
  menuBtn.setAttribute("aria-expanded", "false");
  unlockBodyScroll();
}

menuBtn?.addEventListener("click", openDrawer);

drawer?.querySelectorAll("[data-drawer-close]").forEach((el) => {
  el.addEventListener("click", closeDrawer);
});

/* -------------------- Product catalog (demo data) -------------------- */

function formatPrice(amount) {
  return amount.toLocaleString("en-US");
}

function createProductCard(product) {
  const availabilityLabel = AVAILABILITY_LABELS[product.availability];
  const badge =
    product.availability === "available"
      ? ""
      : `<span class="product-badge product-badge--${product.availability}">${availabilityLabel}</span>`;

  const article = document.createElement("article");
  article.className = "product-card reveal";
  article.dataset.id = product.id;
  article.innerHTML = `
    <div class="product-media">
      <img src="${product.image}" alt="${product.alt}" loading="lazy" decoding="async" />
      ${badge}
    </div>
    <div class="product-info">
      <div class="product-info-text">
        <h3>${product.name}</h3>
        <p class="product-meta">${product.category} · ${availabilityLabel}</p>
      </div>
      <span class="product-price">${formatPrice(product.price)} <small>د.ع</small></span>
    </div>
    <button type="button" class="btn btn-outline product-action" data-product-id="${product.id}">
      عرض المنتج
    </button>
  `;
  return article;
}

function renderProducts() {
  const grid = document.getElementById("product-grid");
  if (!grid) return;
  const cards = document.createDocumentFragment();
  PRODUCTS.forEach((product) => {
    cards.appendChild(createProductCard(product));
  });
  grid.appendChild(cards);
}

renderProducts();

/* -------------------- Product quick-view modal + add-to-cart -------------------- */

const productModal = document.getElementById("product-modal");
const productModalImage = document.getElementById("product-modal-image");
const productModalBadge = document.getElementById("product-modal-badge");
const productModalCategory = document.getElementById("product-modal-category");
const productModalTitle = document.getElementById("product-modal-title");
const productModalPrice = document.getElementById("product-modal-price");
const productModalSizes = document.getElementById("product-modal-sizes");
const productModalColors = document.getElementById("product-modal-colors");
const productModalQtyValue = document.getElementById("product-modal-qty-value");
const addToCartBtn = document.getElementById("add-to-cart-btn");
const productModalFeedback = document.getElementById("product-modal-feedback");

let activeProduct = null;
let selectedSize = null;
let selectedColor = null;
let selectedQty = 1;
let feedbackTimer = null;

function renderModalSizes() {
  productModalSizes.innerHTML = activeProduct.sizes
    .map(
      (size) => `
        <button
          type="button"
          class="size-chip${size === selectedSize ? " is-selected" : ""}"
          data-size="${size}"
        >${size}</button>
      `,
    )
    .join("");
}

function renderModalColors() {
  productModalColors.innerHTML = activeProduct.colors
    .map(
      (color) => `
        <button
          type="button"
          class="color-swatch${color.name === selectedColor?.name ? " is-selected" : ""}"
          style="--swatch-color:${color.hex}"
          data-color-name="${color.name}"
          title="${color.name}"
        ></button>
      `,
    )
    .join("");
}

function updateAddToCartState() {
  if (activeProduct.availability === "soldout") {
    addToCartBtn.disabled = true;
    addToCartBtn.textContent = "غير متوفر حالياً";
  } else {
    addToCartBtn.disabled = false;
    addToCartBtn.textContent = "أضف للسلة";
  }
}

function openProductModal(product) {
  if (!productModal) return;

  activeProduct = product;
  selectedSize = product.sizes[0];
  selectedColor = product.colors[0];
  selectedQty = 1;

  productModalImage.src = product.image;
  productModalImage.alt = product.alt;
  productModalCategory.textContent = product.category;
  productModalTitle.textContent = product.name;
  productModalPrice.innerHTML = `${formatPrice(product.price)} <small>د.ع</small>`;
  productModalQtyValue.textContent = String(selectedQty);
  productModalFeedback.hidden = true;

  const availabilityLabel = AVAILABILITY_LABELS[product.availability];
  if (product.availability === "available") {
    productModalBadge.hidden = true;
  } else {
    productModalBadge.hidden = false;
    productModalBadge.textContent = availabilityLabel;
    productModalBadge.className = `product-badge product-badge--${product.availability}`;
  }

  renderModalSizes();
  renderModalColors();
  updateAddToCartState();

  openOverlay(productModal);
  lockBodyScroll();
}

function closeProductModal() {
  if (!productModal || productModal.hidden) return;
  closeOverlay(productModal, ".product-modal-panel");
  unlockBodyScroll();
  activeProduct = null;
  clearTimeout(feedbackTimer);
}

document.getElementById("product-grid")?.addEventListener("click", (event) => {
  const button = event.target.closest(".product-action");
  if (!button) return;
  const product = PRODUCTS.find((item) => item.id === button.dataset.productId);
  if (product) openProductModal(product);
});

productModal?.querySelectorAll("[data-modal-close]").forEach((el) => {
  el.addEventListener("click", closeProductModal);
});

productModalSizes?.addEventListener("click", (event) => {
  const chip = event.target.closest("[data-size]");
  if (!chip || !activeProduct) return;
  selectedSize = chip.dataset.size;
  renderModalSizes();
});

productModalColors?.addEventListener("click", (event) => {
  const swatch = event.target.closest("[data-color-name]");
  if (!swatch || !activeProduct) return;
  selectedColor = activeProduct.colors.find(
    (color) => color.name === swatch.dataset.colorName,
  );
  renderModalColors();
});

document.getElementById("product-modal-qty")?.addEventListener("click", (event) => {
  if (event.target.closest("[data-qty-increase]")) {
    selectedQty = Math.min(10, selectedQty + 1);
  } else if (event.target.closest("[data-qty-decrease]")) {
    selectedQty = Math.max(1, selectedQty - 1);
  } else {
    return;
  }
  productModalQtyValue.textContent = String(selectedQty);
});

addToCartBtn?.addEventListener("click", () => {
  if (!activeProduct || activeProduct.availability === "soldout") return;

  addToCart(activeProduct, selectedSize, selectedColor, selectedQty);

  productModalFeedback.hidden = false;
  clearTimeout(feedbackTimer);
  feedbackTimer = setTimeout(() => {
    productModalFeedback.hidden = true;
  }, 2200);
});

/* -------------------- Shopping cart drawer -------------------- */

const cartBtn = document.getElementById("cart-btn");
const cartCount = document.getElementById("cart-count");
const cartDrawer = document.getElementById("cart-drawer");
const cartItemsEl = document.getElementById("cart-items");
const cartEmptyEl = document.getElementById("cart-empty");
const cartSubtotalEl = document.getElementById("cart-subtotal");
const cartCheckoutBtn = document.getElementById("cart-checkout-btn");

function openCartDrawer() {
  if (!cartDrawer || !cartDrawer.hidden) return;
  openOverlay(cartDrawer);
  cartBtn?.setAttribute("aria-expanded", "true");
  lockBodyScroll();
}

function closeCartDrawer() {
  if (!cartDrawer || cartDrawer.hidden) return;
  closeOverlay(cartDrawer, ".cart-drawer-panel");
  cartBtn?.setAttribute("aria-expanded", "false");
  unlockBodyScroll();
}

cartBtn?.addEventListener("click", openCartDrawer);

cartDrawer?.querySelectorAll("[data-cart-close]").forEach((el) => {
  el.addEventListener("click", closeCartDrawer);
});

function renderCartItem(item) {
  const row = document.createElement("div");
  row.className = "cart-item";
  row.dataset.id = item.id;
  row.innerHTML = `
    <div class="cart-item-media">
      <img src="${item.image}" alt="${item.alt}" loading="lazy" decoding="async" />
    </div>
    <div class="cart-item-info">
      <div class="cart-item-top">
        <h4>${item.name}</h4>
        <button type="button" class="cart-item-remove" data-remove aria-label="إزالة المنتج">
          <svg class="icon" width="16" height="16"><use href="#icon-trash"></use></svg>
        </button>
      </div>
      <p class="cart-item-variant">مقاس ${item.size} · ${item.colorName}</p>
      <div class="cart-item-bottom">
        <div class="qty-stepper qty-stepper--sm">
          <button type="button" class="qty-btn" data-qty-decrease aria-label="تقليل الكمية">
            <svg class="icon" width="14" height="14"><use href="#icon-minus"></use></svg>
          </button>
          <span class="qty-value">${item.qty}</span>
          <button type="button" class="qty-btn" data-qty-increase aria-label="زيادة الكمية">
            <svg class="icon" width="14" height="14"><use href="#icon-plus"></use></svg>
          </button>
        </div>
        <span class="cart-item-price">${formatPrice(item.price * item.qty)} <small>د.ع</small></span>
      </div>
    </div>
  `;
  return row;
}

function renderCart(items) {
  cartItemsEl.innerHTML = "";
  const fragment = document.createDocumentFragment();
  items.forEach((item) => fragment.appendChild(renderCartItem(item)));
  cartItemsEl.appendChild(fragment);

  const isEmpty = items.length === 0;
  cartEmptyEl.hidden = !isEmpty;
  cartItemsEl.hidden = isEmpty;
  cartCheckoutBtn.disabled = isEmpty;

  cartSubtotalEl.innerHTML = `${formatPrice(getSubtotal())} <small>د.ع</small>`;

  const count = items.reduce((total, item) => total + item.qty, 0);
  if (count > 0) {
    cartCount.hidden = false;
    cartCount.textContent = String(count);
  } else {
    cartCount.hidden = true;
  }
}

cartItemsEl?.addEventListener("click", (event) => {
  const row = event.target.closest(".cart-item");
  if (!row) return;
  const id = row.dataset.id;

  if (event.target.closest("[data-remove]")) {
    removeFromCart(id);
    return;
  }

  const qtyValueEl = row.querySelector(".qty-value");
  const currentQty = Number(qtyValueEl.textContent);

  if (event.target.closest("[data-qty-increase]")) {
    updateQty(id, currentQty + 1);
  } else if (event.target.closest("[data-qty-decrease]")) {
    updateQty(id, currentQty - 1);
  }
});

onCartChange(renderCart);

cartCheckoutBtn?.addEventListener("click", () => {
  if (getItems().length === 0) return;
  closeCartDrawer();
  openCheckout();
});

/* -------------------- Checkout + demo order confirmation -------------------- */

const checkoutModal = document.getElementById("checkout-modal");
const checkoutFormView = document.getElementById("checkout-form-view");
const checkoutConfirmationView = document.getElementById("checkout-confirmation-view");
const checkoutForm = document.getElementById("checkout-form");
const checkoutSummaryItemsEl = document.getElementById("checkout-summary-items");
const checkoutSubtotalEl = document.getElementById("checkout-subtotal");
const checkoutTotalEl = document.getElementById("checkout-total");
const checkoutOrderNumberEl = document.getElementById("checkout-order-number");
const checkoutConfirmationSummaryEl = document.getElementById(
  "checkout-confirmation-summary",
);
const checkoutReturnBtn = document.getElementById("checkout-return-btn");

const checkoutFields = {
  name: document.getElementById("checkout-name"),
  phone: document.getElementById("checkout-phone"),
  governorate: document.getElementById("checkout-governorate"),
  address: document.getElementById("checkout-address"),
};

const requiredMessages = {
  name: "الرجاء إدخال الاسم الكامل.",
  phone: "الرجاء إدخال رقم هاتف صحيح.",
  governorate: "الرجاء اختيار المحافظة.",
  address: "الرجاء إدخال العنوان بالتفصيل.",
};

function renderCheckoutSummary() {
  const items = getItems();

  checkoutSummaryItemsEl.innerHTML = items
    .map(
      (item) => `
        <div class="checkout-summary-item">
          <img src="${item.image}" alt="${item.alt}" loading="lazy" decoding="async" />
          <div class="checkout-summary-item-info">
            <h5>${item.name}</h5>
            <p>مقاس ${item.size} · ${item.colorName} · الكمية ${item.qty}</p>
          </div>
          <span class="checkout-summary-item-price">${formatPrice(item.price * item.qty)} <small>د.ع</small></span>
        </div>
      `,
    )
    .join("");

  const subtotal = getSubtotal();
  checkoutSubtotalEl.innerHTML = `${formatPrice(subtotal)} <small>د.ع</small>`;
  checkoutTotalEl.innerHTML = `${formatPrice(subtotal)} <small>د.ع</small>`;
}

function clearFieldError(field) {
  const wrapper = field.closest(".form-field");
  const error = wrapper.querySelector(".form-error");
  wrapper.classList.remove("has-error");
  if (error) error.textContent = "";
}

function setFieldError(field, message) {
  const wrapper = field.closest(".form-field");
  const error = wrapper.querySelector(".form-error");
  wrapper.classList.add("has-error");
  if (error) error.textContent = message;
}

function validateCheckoutForm() {
  let firstInvalid = null;

  Object.entries(checkoutFields).forEach(([key, field]) => {
    clearFieldError(field);
    const value = field.value.trim();
    const isPhoneInvalid =
      key === "phone" && value.replace(/[^0-9]/g, "").length < 8;

    if (!value || isPhoneInvalid) {
      setFieldError(field, requiredMessages[key]);
      if (!firstInvalid) firstInvalid = field;
    }
  });

  return firstInvalid;
}

function generateOrderNumber() {
  return `MD-${1000 + Math.floor(Math.random() * 9000)}`;
}

function openCheckout() {
  if (!checkoutModal || !checkoutModal.hidden) return;
  renderCheckoutSummary();
  checkoutFormView.hidden = false;
  checkoutConfirmationView.hidden = true;
  openOverlay(checkoutModal);
  lockBodyScroll();
}

function closeCheckout() {
  if (!checkoutModal || checkoutModal.hidden) return;
  closeOverlay(checkoutModal, ".checkout-modal-panel");
  unlockBodyScroll();
}

checkoutModal?.querySelectorAll("[data-checkout-close]").forEach((el) => {
  el.addEventListener("click", closeCheckout);
});

Object.values(checkoutFields).forEach((field) => {
  field.addEventListener("input", () => clearFieldError(field));
  field.addEventListener("change", () => clearFieldError(field));
});

checkoutForm?.addEventListener("submit", (event) => {
  event.preventDefault();

  if (getItems().length === 0) return;

  const firstInvalid = validateCheckoutForm();
  if (firstInvalid) {
    firstInvalid.focus();
    return;
  }

  const orderNumber = generateOrderNumber();
  const itemCount = getItems().reduce((total, item) => total + item.qty, 0);
  const total = getSubtotal();
  const governorate = checkoutFields.governorate.value;

  checkoutOrderNumberEl.textContent = orderNumber;
  checkoutConfirmationSummaryEl.innerHTML = `
    <div class="checkout-confirmation-summary-row">
      <span>عدد القطع</span>
      <strong>${itemCount}</strong>
    </div>
    <div class="checkout-confirmation-summary-row">
      <span>الإجمالي</span>
      <strong>${formatPrice(total)} د.ع</strong>
    </div>
    <div class="checkout-confirmation-summary-row">
      <span>التوصيل إلى</span>
      <strong>${governorate}</strong>
    </div>
  `;

  checkoutFormView.hidden = true;
  checkoutConfirmationView.hidden = false;

  clearCart();
  checkoutForm.reset();
});

checkoutReturnBtn?.addEventListener("click", () => {
  closeCheckout();
});

/* -------------------- Shared Escape-to-close -------------------- */

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (drawer && !drawer.hidden) closeDrawer();
  if (productModal && !productModal.hidden) closeProductModal();
  if (checkoutModal && !checkoutModal.hidden) closeCheckout();
  else if (cartDrawer && !cartDrawer.hidden) closeCartDrawer();
});

/* -------------------- Scroll reveal -------------------- */

const revealTargets = document.querySelectorAll(".reveal");

if ("IntersectionObserver" in window && revealTargets.length) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: "0px 0px -10% 0px" },
  );

  revealTargets.forEach((el) => observer.observe(el));
} else {
  revealTargets.forEach((el) => el.classList.add("is-visible"));
}
