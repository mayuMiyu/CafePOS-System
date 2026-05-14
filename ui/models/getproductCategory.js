const productGrid = document.getElementById('product-grid');
const itemsCount = document.getElementById('items-count');
const productCategoryButtons = document.querySelectorAll('.category-btn, .category-all-btn');
const orderBox = document.querySelector('.order-box');
const orderHeaderCount = document.querySelector('.order-header p');
const orderEmpty = document.querySelector('.order-empty');
const orderSummary = document.querySelector('.order-summary');
const checkoutButton = document.querySelector('.checkout-btn');
const checkoutButtonText = document.querySelector('.checkout-btn span');
const clearOrderButton = document.querySelector('.clear-btn');
const holdOrderButton = document.querySelector('.hold-btn');
const heldOrdersButton = document.getElementById('held-orders-button');
const heldOrdersCount = document.getElementById('held-orders-count');
const discountButton = document.getElementById('discount-button');
const notesButton = document.getElementById('notes-button');

let products = [];
let activeCategory = 'all';
let selectedProduct = null;
let selectedSize = null;
let selectedAddons = [];
let cartItems = [];
let isDiscountActive = false;
let orderNote = '';
let productCardObserver = null;
let lastProductScrollTop = 0;
let productScrollDirection = 'down';
let heldOrders = [];
const TAX_RATE = 0.12;
const DISCOUNT_RATE = 0.05;
const HELD_ORDERS_STORAGE_KEY = 'makuHeldOrders';
const PRODUCTS_CACHE_KEY = 'makuProductsCache';
let categoryFiltersBound = false;

const categoryFallbackImages = {
    1: '../models/assets/icons8-cafe-96.png',
    2: '../models/assets/icons8-greek-salad-64.png',
    3: '../models/assets/icons8-cherry-cheesecake-64.png',
    4: '../models/assets/icons8-kawaii-soda-64.png'
};

function formatPeso(value) {
    return `₱${Number(value).toLocaleString('en-PH', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    })}`;
}

function formatPesoWithCents(value) {
    return `â‚±${Number(value).toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
}

function formatPeso(value) {
    return `\u20B1${Number(value).toLocaleString('en-PH', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    })}`;
}

function formatPesoWithCents(value) {
    return `\u20B1${Number(value).toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
}

function getProductImage(product) {
    return product.image_url
        ? product.image_url
        : categoryFallbackImages[product.category_id];
}

function getCurrentOptionTotal() {
    const sizePrice = selectedSize ? Number(selectedSize.price) : Number(selectedProduct?.base_price ?? 0);
    const addonsTotal = selectedAddons.reduce((sum, addon) => sum + Number(addon.extra_price), 0);
    return sizePrice + addonsTotal;
}

function getCartItemKey(productId, sizeId, addons) {
    const addonKey = addons
        .map(addon => addon.id)
        .sort((a, b) => Number(a) - Number(b))
        .join(',');

    return `${productId}|${sizeId ?? 'base'}|${addonKey}`;
}

function getCartItemName(item) {
    const parts = [item.productName];

    if (item.sizeLabel) {
        parts.push(`(${item.sizeLabel})`);
    }

    if (item.addons.length > 0) {
        parts.push(`+ ${item.addons.map(addon => addon.name).join(', ')}`);
    }

    return parts.join(' ');
}

function getCartSubtotal() {
    return cartItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
}

function getCartTotals() {
    const subtotal = getCartSubtotal();
    const discount = isDiscountActive ? subtotal * DISCOUNT_RATE : 0;
    const tax = subtotal * TAX_RATE;
    const total = subtotal - discount + tax;

    return { subtotal, discount, tax, total };
}

function loadHeldOrders() {
    try {
        heldOrders = JSON.parse(localStorage.getItem(HELD_ORDERS_STORAGE_KEY) || '[]');
        if (!Array.isArray(heldOrders)) heldOrders = [];
    } catch {
        heldOrders = [];
    }

    updateHeldOrdersButton();
}

function saveHeldOrders() {
    localStorage.setItem(HELD_ORDERS_STORAGE_KEY, JSON.stringify(heldOrders));
    updateHeldOrdersButton();
}

function updateHeldOrdersButton() {
    if (!heldOrdersButton || !heldOrdersCount) return;

    heldOrdersButton.hidden = heldOrders.length === 0;
    heldOrdersCount.textContent = heldOrders.length;
}

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function getVisibleProducts() {
    if (activeCategory === 'all') return products;
    return products.filter(product => String(product.category_id) === activeCategory);
}

function updateItemsCount(visibleProducts) {
    const count = visibleProducts.length;
    itemsCount.textContent = `Showing ${count} ${count === 1 ? 'item' : 'items'}`;
}

function updateProductBadges() {
    const counts = { all: products.length };

    products.forEach(product => {
        counts[product.category_id] = (counts[product.category_id] || 0) + 1;
    });

    document.getElementById('badge-all').textContent = counts.all ?? 0;

    [1, 2, 3, 4].forEach(id => {
        const badge = document.getElementById(`badge-${id}`);
        if (badge) badge.textContent = counts[id] ?? 0;
    });
}

function renderProducts(shouldAnimate = true) {
    const visibleProducts = getVisibleProducts();
    updateItemsCount(visibleProducts);

    productGrid.innerHTML = visibleProducts.map((product, index) => {
        const imgSrc = getProductImage(product);
        const addButton = Number(product.has_options)
            ? `
                <button type="button" class="add-product-btn" data-product-id="${product.id}" aria-label="Add ${escapeHtml(product.name)}">
                    <img src="/assets/icons8-add-new-96.png" alt="">
                </button>
            `
            : '';

        return `
            <article class="product-card" data-product-id="${product.id}" data-enter-index="${index}" style="--enter-delay: ${(index % 4) * 35}ms">
                <div class="product-image-wrap"> <img class="product-image" src="${imgSrc}" alt="${product.name}"> </div>
                <div class="product-info">
                    <h3>${escapeHtml(product.name)}</h3>
                    <p>${escapeHtml(product.description)}</p>

                    <div class="product-footer">
                        <span class="product-price">${formatPeso(product.base_price)}</span>
                        ${addButton}
                    </div>
                </div>
            </article>
        `;
    }).join('');

    if (shouldAnimate) {
        requestAnimationFrame(animateProductCards);
    }
}

function readCachedProducts() {
    try {
        const cached = JSON.parse(sessionStorage.getItem(PRODUCTS_CACHE_KEY) || 'null');
        return Array.isArray(cached) ? cached : null;
    } catch {
        return null;
    }
}

function setProducts(nextProducts, shouldAnimate = true) {
    products = nextProducts;
    updateProductBadges();
    renderProducts(shouldAnimate);
}

function animateProductCards() {
    const cards = productGrid.querySelectorAll('.product-card');
    const scrollContainer = productGrid.closest('.center');

    if (!('IntersectionObserver' in window)) {
        cards.forEach(card => card.classList.add('product-enter'));
        return;
    }

    productCardObserver?.disconnect();
    productCardObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            const enterIndex = Number(entry.target.dataset.enterIndex || 0);
            const columnIndex = enterIndex % 4;
            const delayIndex = productScrollDirection === 'up' ? 3 - columnIndex : columnIndex;

            entry.target.style.setProperty(
                '--enter-y',
                productScrollDirection === 'up' ? '-10px' : '10px'
            );
            entry.target.style.setProperty('--enter-delay', `${delayIndex * 35}ms`);
            entry.target.classList.toggle('product-enter', entry.isIntersecting);
        });
    }, {
        root: scrollContainer || null,
        threshold: 0.12
    });

    cards.forEach(card => {
        card.addEventListener('animationend', () => {
            card.classList.remove('product-enter');
        });
        productCardObserver.observe(card);
    });
}

function trackProductScrollDirection() {
    const scrollContainer = productGrid.closest('.center');
    if (!scrollContainer) return;

    lastProductScrollTop = scrollContainer.scrollTop;
    scrollContainer.addEventListener('scroll', () => {
        const currentScrollTop = scrollContainer.scrollTop;
        productScrollDirection = currentScrollTop < lastProductScrollTop ? 'up' : 'down';
        lastProductScrollTop = currentScrollTop;
    }, { passive: true });
}

function ensureProductOptionsModal() {
    if (document.getElementById('product-options-modal')) return;

    document.body.insertAdjacentHTML('beforeend', `
        <div class="product-options-overlay" id="product-options-modal" aria-hidden="true">
            <div class="product-options-dialog" role="dialog" aria-modal="true" aria-labelledby="options-product-name">
                <div class="options-header">
                    <div class="options-product-media">
                        <img id="options-product-image" src="" alt="">
                    </div>
                    <div class="options-title-wrap">
                        <h2 id="options-product-name"></h2>
                        <p id="options-product-description"></p>
                    </div>
                    <button type="button" class="options-close-btn" id="options-close-btn" aria-label="Close">&times;</button>
                </div>

                <div class="options-body" id="options-body">
                    <section class="options-section" id="size-section">
                        <h3>Select Size</h3>
                        <div class="size-options" id="size-options"></div>
                    </section>

                    <section class="options-section" id="addons-section">
                        <h3>Add-ons <span>(Optional)</span></h3>
                        <div class="addon-options" id="addon-options"></div>
                    </section>

                    <section class="options-summary">
                        <h3>Summary</h3>
                        <div class="summary-line">
                            <span>Base Price:</span>
                            <strong id="summary-base-price"></strong>
                        </div>
                        <div class="summary-line" id="summary-size-line">
                            <span id="summary-size-label"></span>
                            <strong id="summary-size-price"></strong>
                        </div>
                        <div id="summary-addon-lines"></div>
                        <div class="summary-line options-total-line">
                            <span>Total:</span>
                            <strong id="summary-total"></strong>
                        </div>
                    </section>
                </div>

                <div class="options-actions">
                    <button type="button" class="options-cancel-btn" id="options-cancel-btn">Cancel</button>
                    <button type="button" class="options-add-btn" id="options-add-btn">+ Add to Cart</button>
                </div>
            </div>
        </div>
    `);

    document.getElementById('options-close-btn').addEventListener('click', closeProductOptionsModal);
    document.getElementById('options-cancel-btn').addEventListener('click', closeProductOptionsModal);
    document.getElementById('product-options-modal').addEventListener('click', (event) => {
        if (event.target.id === 'product-options-modal') closeProductOptionsModal();
    });
    document.getElementById('options-add-btn').addEventListener('click', addSelectedProductToCart);
}

function closeProductOptionsModal() {
    const modal = document.getElementById('product-options-modal');
    if (!modal) return;

    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
}

function renderProductOptions(options) {
    const sizeSection = document.getElementById('size-section');
    const sizeOptions = document.getElementById('size-options');
    const addonsSection = document.getElementById('addons-section');
    const addonOptions = document.getElementById('addon-options');

    if (options.sizes.length > 0) {
        sizeSection.hidden = false;
        selectedSize = options.sizes[0];
        sizeOptions.innerHTML = options.sizes.map((size, index) => `
            <button type="button" class="size-option ${index === 0 ? 'selected' : ''}" data-size-id="${size.id}">
                <span>${escapeHtml(size.label)}</span>
                <strong>${formatPeso(size.price)}</strong>
            </button>
        `).join('');
    } else {
        selectedSize = null;
        sizeSection.hidden = true;
        sizeOptions.innerHTML = '';
    }

    if (options.addons.length > 0) {
        addonsSection.hidden = false;
        addonOptions.innerHTML = options.addons.map(addon => `
            <label class="addon-option">
                <input type="checkbox" value="${addon.id}">
                <span>${escapeHtml(addon.name)}</span>
                <strong>+${formatPeso(addon.extra_price)}</strong>
            </label>
        `).join('');
    } else {
        addonsSection.hidden = true;
        addonOptions.innerHTML = '';
    }

    sizeOptions.querySelectorAll('.size-option').forEach(button => {
        button.addEventListener('click', () => {
            selectedSize = options.sizes.find(size => String(size.id) === button.dataset.sizeId);
            sizeOptions.querySelectorAll('.size-option').forEach(item => item.classList.remove('selected'));
            button.classList.add('selected');
            updateOptionsSummary();
        });
    });

    addonOptions.querySelectorAll('input').forEach(input => {
        input.addEventListener('change', () => {
            selectedAddons = options.addons.filter(addon => {
                const addonInput = addonOptions.querySelector(`input[value="${addon.id}"]`);
                return addonInput?.checked;
            });
            updateOptionsSummary();
        });
    });

    updateOptionsSummary();
}

function updateOptionsSummary() {
    const basePrice = Number(selectedProduct?.base_price ?? 0);
    const summarySizeLine = document.getElementById('summary-size-line');
    const summaryAddonLines = document.getElementById('summary-addon-lines');
    const total = getCurrentOptionTotal();

    document.getElementById('summary-base-price').textContent = formatPeso(basePrice);

    if (selectedSize) {
        summarySizeLine.hidden = false;
        document.getElementById('summary-size-label').textContent = `Size (${selectedSize.label}):`;
        document.getElementById('summary-size-price').textContent = formatPeso(selectedSize.price);
    } else {
        summarySizeLine.hidden = true;
    }

    summaryAddonLines.innerHTML = selectedAddons.map(addon => `
        <div class="summary-line">
            <span>${escapeHtml(addon.name)}:</span>
            <strong>+${formatPeso(addon.extra_price)}</strong>
        </div>
    `).join('');

    document.getElementById('summary-total').textContent = formatPeso(total);
    document.getElementById('options-add-btn').textContent = `+ Add to Cart - ${formatPeso(total)}`;
}

function addProductToCart(product, size = null, addons = []) {
    if (!product) return;

    const normalizedAddons = [...addons].sort((a, b) => Number(a.id) - Number(b.id));
    const key = getCartItemKey(product.id, size?.id, normalizedAddons);
    const existingItem = cartItems.find(item => item.key === key);
    const unitPrice = size ? Number(size.price) : Number(product.base_price ?? 0);

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cartItems.push({
            key,
            productId: product.id,
            productName: product.name,
            sizeId: size?.id ?? null,
            sizeLabel: size?.label ?? null,
            addons: normalizedAddons.map(addon => ({
                id: addon.id,
                name: addon.name,
                extra_price: Number(addon.extra_price)
            })),
            unitPrice: unitPrice + normalizedAddons.reduce((sum, addon) => sum + Number(addon.extra_price), 0),
            quantity: 1
        });
    }

    renderCurrentOrder();
    scrollOrderListToBottom();
}

function addSelectedProductToCart() {
    if (!selectedProduct) return;

    addProductToCart(selectedProduct, selectedSize, selectedAddons);
    closeProductOptionsModal();
}

function scrollOrderListToBottom() {
    requestAnimationFrame(() => {
        const orderItemsList = document.querySelector('.order-items-list');
        if (!orderItemsList) return;

        orderItemsList.scrollTop = orderItemsList.scrollHeight;
    });
}

function renderCurrentOrder() {
    const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    const { subtotal, discount, tax, total } = getCartTotals();

    orderHeaderCount.textContent = `${totalQuantity} item(s)`;
    orderEmpty.classList.toggle('has-items', cartItems.length > 0);

    if (cartItems.length === 0) {
        orderEmpty.innerHTML = `
            <p>No items in cart</p>
            <span>Add items from menu</span>
        `;
    } else {
        orderEmpty.innerHTML = `
            <div class="order-items-list">
                ${cartItems.map(item => `
                    <article class="order-item" data-cart-key="${escapeHtml(item.key)}">
                        <div class="order-item-main">
                            <h4>${escapeHtml(getCartItemName(item))}</h4>
                            <button type="button" class="order-item-delete" aria-label="Remove ${escapeHtml(item.productName)}">×</button>
                        </div>
                        <p class="order-item-unit-price">${formatPeso(item.unitPrice)}</p>
                        <div class="order-item-footer">
                            <div class="quantity-control">
                                <button type="button" class="quantity-btn" data-action="decrease" aria-label="Decrease quantity">−</button>
                                <span>${item.quantity}</span>
                                <button type="button" class="quantity-btn" data-action="increase" aria-label="Increase quantity">+</button>
                            </div>
                            <strong>${formatPesoWithCents(item.unitPrice * item.quantity)}</strong>
                        </div>
                    </article>
                `).join('')}
            </div>
        `;
    }

    orderSummary.innerHTML = `
        <div class="summary-row">
            <span>Subtotal:</span>
            <span>${formatPesoWithCents(subtotal)}</span>
        </div>

        ${isDiscountActive ? `
            <div class="summary-row discount-summary-row">
                <span>Discount (5%):</span>
                <span>-${formatPesoWithCents(discount)}</span>
            </div>
        ` : ''}

        <div class="summary-row">
            <span>Tax (12%):</span>
            <span>${formatPesoWithCents(tax)}</span>
        </div>

        <div class="summary-row total-row">
            <span>Total:</span>
            <span>${formatPesoWithCents(total)}</span>
        </div>
    `;

    checkoutButton.disabled = cartItems.length === 0;
    checkoutButton.classList.toggle('ready', cartItems.length > 0);
    checkoutButtonText.textContent = `Checkout - ${formatPesoWithCents(total)}`;
}

function updateCartItemQuantity(key, change) {
    const item = cartItems.find(cartItem => cartItem.key === key);
    if (!item) return;

    item.quantity += change;

    if (item.quantity <= 0) {
        cartItems = cartItems.filter(cartItem => cartItem.key !== key);
    }

    renderCurrentOrder();
}

function removeCartItem(key) {
    cartItems = cartItems.filter(item => item.key !== key);
    renderCurrentOrder();
}

function ensureNoteModal() {
    if (document.getElementById('note-modal')) return;

    document.body.insertAdjacentHTML('beforeend', `
        <div class="note-overlay" id="note-modal" aria-hidden="true">
            <div class="note-dialog" role="dialog" aria-modal="true" aria-labelledby="note-modal-title">
                <h2 id="note-modal-title">Note:</h2>
                <textarea id="order-note-input" class="note-input" rows="5" placeholder="Add order note..."></textarea>
                <div class="note-actions">
                    <button type="button" class="note-clear-btn" id="note-clear-btn">Clear</button>
                    <button type="button" class="note-confirm-btn" id="note-confirm-btn">Confirm</button>
                </div>
            </div>
        </div>
    `);

    document.getElementById('note-modal').addEventListener('click', (event) => {
        if (event.target.id === 'note-modal') closeNoteModal();
    });
    document.getElementById('note-clear-btn').addEventListener('click', () => {
        document.getElementById('order-note-input').value = '';
        orderNote = '';
        updateNoteButtonState();
        closeNoteModal();
    });
    document.getElementById('note-confirm-btn').addEventListener('click', () => {
        orderNote = document.getElementById('order-note-input').value.trim();
        updateNoteButtonState();
        closeNoteModal();
    });
}

function openNoteModal() {
    ensureNoteModal();
    document.getElementById('order-note-input').value = orderNote;

    const modal = document.getElementById('note-modal');
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.getElementById('order-note-input').focus();
}

function closeNoteModal() {
    const modal = document.getElementById('note-modal');
    if (!modal) return;

    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
}

function holdCurrentOrder() {
    if (cartItems.length === 0) return;

    const heldOrder = {
        id: `hold-${Date.now()}`,
        createdAt: new Date().toISOString(),
        items: structuredClone(cartItems),
        isDiscountActive,
        note: orderNote
    };

    heldOrders.unshift(heldOrder);
    saveHeldOrders();

    cartItems = [];
    isDiscountActive = false;
    orderNote = '';
    discountButton.classList.remove('active');
    updateNoteButtonState();
    renderCurrentOrder();
}

function ensureHeldOrdersModal() {
    if (document.getElementById('held-orders-modal')) return;

    document.body.insertAdjacentHTML('beforeend', `
        <div class="held-overlay" id="held-orders-modal" aria-hidden="true">
            <div class="held-dialog" role="dialog" aria-modal="true" aria-labelledby="held-orders-title">
                <div class="held-header">
                    <div>
                        <h2 id="held-orders-title">Held Orders</h2>
                        <p>Continue or discard parked transactions</p>
                    </div>
                    <button type="button" class="held-close-btn" id="held-close-btn" aria-label="Close">&times;</button>
                </div>
                <div class="held-body" id="held-orders-body"></div>
            </div>
        </div>
    `);

    document.getElementById('held-close-btn').addEventListener('click', closeHeldOrdersModal);
    document.getElementById('held-orders-modal').addEventListener('click', event => {
        if (event.target.id === 'held-orders-modal') closeHeldOrdersModal();
    });
    document.getElementById('held-orders-body').addEventListener('click', event => {
        const actionButton = event.target.closest('[data-held-action]');
        if (!actionButton) return;

        const heldId = actionButton.dataset.heldId;
        if (actionButton.dataset.heldAction === 'continue') {
            continueHeldOrder(heldId);
        } else {
            discardHeldOrder(heldId);
        }
    });
}

function openHeldOrdersModal() {
    ensureHeldOrdersModal();
    renderHeldOrdersModal();

    const modal = document.getElementById('held-orders-modal');
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
}

function closeHeldOrdersModal() {
    const modal = document.getElementById('held-orders-modal');
    if (!modal) return;

    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
}

function renderHeldOrdersModal() {
    const body = document.getElementById('held-orders-body');
    if (!body) return;

    if (heldOrders.length === 0) {
        body.innerHTML = '<div class="held-empty">No held orders yet</div>';
        return;
    }

    body.innerHTML = heldOrders.map((order, index) => {
        const totals = getHeldOrderTotals(order);
        const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
        const created = new Date(order.createdAt).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });

        return `
            <article class="held-order-card">
                <div class="held-order-top">
                    <div>
                        <h3>Held Order #${heldOrders.length - index}</h3>
                        <p>${created} · ${itemCount} item(s)</p>
                    </div>
                    <strong class="held-total">${formatPesoWithCents(totals.total)}</strong>
                </div>

                <div class="held-lines">
                    ${order.items.map(item => `
                        <div class="held-line">
                            <div>
                                <strong>${escapeHtml(getCartItemName(item))}</strong>
                                <p>${formatPeso(item.unitPrice)} x ${item.quantity}</p>
                            </div>
                            <strong>${formatPesoWithCents(item.unitPrice * item.quantity)}</strong>
                        </div>
                    `).join('')}
                </div>

                <div class="held-actions">
                    <button type="button" class="held-discard-btn" data-held-action="discard" data-held-id="${order.id}">Discard</button>
                    <button type="button" class="held-continue-btn" data-held-action="continue" data-held-id="${order.id}">Continue Order</button>
                </div>
            </article>
        `;
    }).join('');
}

function getHeldOrderTotals(order) {
    const subtotal = order.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const discount = order.isDiscountActive ? subtotal * DISCOUNT_RATE : 0;
    const tax = subtotal * TAX_RATE;
    const total = subtotal - discount + tax;

    return { subtotal, discount, tax, total };
}

function continueHeldOrder(heldId) {
    const heldOrder = heldOrders.find(order => order.id === heldId);
    if (!heldOrder) return;

    if (cartItems.length > 0 && !confirm('Replace the current order with this held order?')) {
        return;
    }

    cartItems = structuredClone(heldOrder.items);
    isDiscountActive = heldOrder.isDiscountActive;
    orderNote = heldOrder.note || '';
    heldOrders = heldOrders.filter(order => order.id !== heldId);
    saveHeldOrders();

    discountButton.classList.toggle('active', isDiscountActive);
    updateNoteButtonState();
    renderCurrentOrder();
    closeHeldOrdersModal();
}

function discardHeldOrder(heldId) {
    heldOrders = heldOrders.filter(order => order.id !== heldId);
    saveHeldOrders();
    renderHeldOrdersModal();
}

function updateNoteButtonState() {
    notesButton.classList.toggle('active', orderNote.length > 0);
}

function ensureReceiptOverviewModal() {
    if (document.getElementById('receipt-overview-modal')) return;

    document.body.insertAdjacentHTML('beforeend', `
        <div class="receipt-overlay" id="receipt-overview-modal" aria-hidden="true">
            <div class="receipt-dialog" role="dialog" aria-modal="true" aria-labelledby="receipt-title">
                <div class="receipt-header">
                    <div>
                        <p class="receipt-kicker" id="receipt-mode-label">Checkout</p>
                        <h2 id="receipt-title">Receipt Overview</h2>
                    </div>
                    <button type="button" class="receipt-close-btn" id="receipt-close-btn" aria-label="Close">&times;</button>
                </div>

                <div class="receipt-note">
                    <span>Note</span>
                    <p id="receipt-note-text">No note added yet.</p>
                </div>

                <div class="receipt-body">
                    <div class="receipt-section-title">
                        <h3>Order Details</h3>
                        <span id="receipt-item-count"></span>
                    </div>
                    <div class="receipt-items" id="receipt-items"></div>
                    <div class="receipt-totals" id="receipt-totals"></div>
                </div>

                <div class="receipt-payment">
                    <h3>Payment Option</h3>
                    <div class="payment-options">
                        <label class="payment-option selected">
                            <input type="radio" name="payment-method" value="cash" checked>
                            <span>Cash</span>
                        </label>
                        <label class="payment-option">
                            <input type="radio" name="payment-method" value="gcash">
                            <span>GCash</span>
                        </label>
                    </div>
                </div>

                <div class="receipt-actions">
                    <button type="button" class="receipt-secondary-btn" id="receipt-cancel-btn">Cancel</button>
                    <button type="button" class="receipt-primary-btn" id="receipt-confirm-btn">Confirm Checkout</button>
                </div>
            </div>
        </div>
    `);

    document.getElementById('receipt-close-btn').addEventListener('click', closeReceiptOverviewModal);
    document.getElementById('receipt-cancel-btn').addEventListener('click', closeReceiptOverviewModal);
    document.getElementById('receipt-confirm-btn').addEventListener('click', confirmCheckout);
    document.getElementById('receipt-overview-modal').addEventListener('click', (event) => {
        if (event.target.id === 'receipt-overview-modal') closeReceiptOverviewModal();
    });

    document.querySelectorAll('.payment-option input').forEach(input => {
        input.addEventListener('change', () => {
            document.querySelectorAll('.payment-option').forEach(option => option.classList.remove('selected'));
            input.closest('.payment-option').classList.add('selected');
        });
    });
}

function openReceiptOverviewModal(mode = 'checkout') {
    if (cartItems.length === 0) return;

    ensureReceiptOverviewModal();
    renderReceiptOverview(mode);

    const modal = document.getElementById('receipt-overview-modal');
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
}

function closeReceiptOverviewModal() {
    const modal = document.getElementById('receipt-overview-modal');
    if (!modal) return;

    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
}

function renderReceiptOverview(mode) {
    const { subtotal, discount, tax, total } = getCartTotals();
    const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    const modeLabel = mode === 'hold' ? 'Hold Order' : 'Checkout';

    document.getElementById('receipt-mode-label').textContent = modeLabel;
    document.getElementById('receipt-confirm-btn').textContent = mode === 'hold' ? 'Confirm Hold' : 'Confirm Checkout';
    document.getElementById('receipt-item-count').textContent = `${totalQuantity} item(s)`;
    document.getElementById('receipt-note-text').textContent = orderNote || 'No note added yet.';

    document.getElementById('receipt-items').innerHTML = cartItems.map(item => `
        <article class="receipt-item">
            <div>
                <h4>${escapeHtml(getCartItemName(item))}</h4>
                <p>${formatPeso(item.unitPrice)} x ${item.quantity}</p>
            </div>
            <strong>${formatPesoWithCents(item.unitPrice * item.quantity)}</strong>
        </article>
    `).join('');

    document.getElementById('receipt-totals').innerHTML = `
        <div class="receipt-total-row">
            <span>Subtotal</span>
            <strong>${formatPesoWithCents(subtotal)}</strong>
        </div>
        ${isDiscountActive ? `
            <div class="receipt-total-row discount-summary-row">
                <span>Discount (5%)</span>
                <strong>-${formatPesoWithCents(discount)}</strong>
            </div>
        ` : ''}
        <div class="receipt-total-row">
            <span>Tax (12%)</span>
            <strong>${formatPesoWithCents(tax)}</strong>
        </div>
        <div class="receipt-total-row receipt-grand-total">
            <span>Total</span>
            <strong>${formatPesoWithCents(total)}</strong>
        </div>
    `;
}

async function confirmCheckout() {
    if (cartItems.length === 0) return;

    const selectedPayment = document.querySelector('input[name="payment-method"]:checked')?.value || 'cash';
    const { subtotal, discount, tax, total } = getCartTotals();
    const confirmButton = document.getElementById('receipt-confirm-btn');

    confirmButton.disabled = true;
    confirmButton.textContent = 'Saving...';

    try {
        const res = await fetch('/api/orders/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                items: cartItems,
                subtotal,
                discount_amount: discount,
                tax_amount: tax,
                total,
                payment_method: selectedPayment,
                notes: orderNote
            })
        });

        const data = await res.json();

        if (!data.success) {
            alert(data.message || 'Checkout failed');
            return;
        }

        cartItems = [];
        isDiscountActive = false;
        orderNote = '';
        discountButton.classList.remove('active');
        updateNoteButtonState();
        renderCurrentOrder();
        closeReceiptOverviewModal();
    } catch (err) {
        console.error('Checkout failed:', err);
        alert('Checkout failed');
    } finally {
        confirmButton.disabled = false;
        confirmButton.textContent = 'Confirm Checkout';
    }
}

async function openProductOptions(productId) {
    const product = products.find(item => String(item.id) === String(productId));
    if (!product) return;

    ensureProductOptionsModal();
    selectedProduct = product;
    selectedSize = null;
    selectedAddons = [];

    document.getElementById('options-product-image').src = getProductImage(product);
    document.getElementById('options-product-image').alt = product.name;
    document.getElementById('options-product-name').textContent = product.name;
    document.getElementById('options-product-description').textContent = product.description ?? '';

    const modal = document.getElementById('product-options-modal');
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');

    try {
        const res = await fetch(`/api/products/${product.id}/options`);
        const data = await res.json();

        if (!data.success) {
            closeProductOptionsModal();
            alert(data.message || 'Failed to load product options');
            return;
        }

        renderProductOptions(data);
    } catch (err) {
        console.error('Failed to load product options:', err);
        closeProductOptionsModal();
        alert('Failed to load product options');
    }
}

productGrid.addEventListener('click', (event) => {
    const button = event.target.closest('.add-product-btn');
    const card = event.target.closest('.product-card');
    if (!card) return;

    const productId = button?.dataset.productId || card.dataset.productId;
    const product = products.find(item => String(item.id) === String(productId));
    if (!product) return;

    if (Number(product.has_options)) {
        openProductOptions(productId);
        return;
    }

    addProductToCart(product);
});

orderBox.addEventListener('click', (event) => {
    const orderItem = event.target.closest('.order-item');

    if (event.target.closest('.order-item-delete') && orderItem) {
        removeCartItem(orderItem.dataset.cartKey);
        return;
    }

    const quantityButton = event.target.closest('.quantity-btn');
    if (quantityButton && orderItem) {
        const change = quantityButton.dataset.action === 'increase' ? 1 : -1;
        updateCartItemQuantity(orderItem.dataset.cartKey, change);
    }
});

clearOrderButton.addEventListener('click', () => {
    cartItems = [];
    renderCurrentOrder();
});

holdOrderButton?.addEventListener('click', holdCurrentOrder);
heldOrdersButton?.addEventListener('click', openHeldOrdersModal);

discountButton.addEventListener('click', () => {
    isDiscountActive = !isDiscountActive;
    discountButton.classList.toggle('active', isDiscountActive);
    renderCurrentOrder();
});

notesButton.addEventListener('click', openNoteModal);

checkoutButton.addEventListener('click', () => {
    openReceiptOverviewModal('checkout');
});

function bindCategoryFilters() {
    if (categoryFiltersBound) return;
    categoryFiltersBound = true;

    productCategoryButtons.forEach(button => {
        button.addEventListener('click', () => {
            activeCategory = button.dataset.category;
            renderProducts();
        });
    });
}

async function loadProducts() {
    bindCategoryFilters();
    sessionStorage.removeItem(PRODUCTS_CACHE_KEY);

    try {
        const res = await fetch('/api/products');
        const data = await res.json();

        if (!data.success) return;

        const nextRaw = JSON.stringify(data.products);
        sessionStorage.setItem(PRODUCTS_CACHE_KEY, nextRaw);
        setProducts(data.products, true);
    } catch (err) {
        console.error('Failed to load products:', err);
        updateItemsCount([]);
    }
}

trackProductScrollDirection();
loadHeldOrders();
loadProducts();
renderCurrentOrder();
