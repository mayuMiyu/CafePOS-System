const ordersBoard = document.getElementById('orders-board');
const activeOrderCount = document.getElementById('active-order-count');
const oldestWait = document.getElementById('oldest-wait');
const lastUpdated = document.getElementById('last-updated');
const refreshButton = document.getElementById('refresh-orders');

let kitchenOrders = [];
let refreshTimer = null;

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function formatWait(createdAt) {
    const created = new Date(createdAt);
    const minutes = Math.max(0, Math.floor((Date.now() - created.getTime()) / 60000));
    if (minutes < 60) return `${minutes}m`;

    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    return `${hours}h ${remainder}m`;
}

function formatTime(value) {
    return new Date(value).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

function getItemName(item) {
    const parts = [item.product_name];
    if (item.size_label) parts.push(`(${item.size_label})`);
    return parts.join(' ');
}

function getAddonText(addons = []) {
    if (!addons.length) return '';
    return `Add-ons: ${addons.map(addon => addon.addon_name).join(', ')}`;
}

function updateStatusCards() {
    activeOrderCount.textContent = kitchenOrders.length;
    oldestWait.textContent = kitchenOrders.length ? formatWait(kitchenOrders[0].created_at) : '0m';
    lastUpdated.textContent = new Date().toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

function renderKitchenOrders() {
    updateStatusCards();

    if (!kitchenOrders.length) {
        ordersBoard.innerHTML = `
            <div class="orders-empty">
                <h2>No active kitchen orders</h2>
                <p>New receipts will appear here when cashiers checkout.</p>
            </div>
        `;
        return;
    }

    ordersBoard.innerHTML = kitchenOrders.map(order => `
        <article class="kitchen-ticket" data-order-id="${order.id}">
            <div class="ticket-head">
                <div>
                    <h2>Order #${order.id}</h2>
                    <p>${escapeHtml(order.cashier_name || order.cashier_username)} - ${formatTime(order.created_at)}</p>
                </div>
                <span class="ticket-time">${formatWait(order.created_at)}</span>
            </div>

            <div class="ticket-items">
                ${order.items.map(item => `
                    <div class="ticket-item">
                        <span class="item-qty">${Number(item.quantity || 1)}x</span>
                        <div>
                            <h3>${escapeHtml(getItemName(item))}</h3>
                            <p>${escapeHtml(getAddonText(item.addons)) || 'No add-ons'}</p>
                        </div>
                    </div>
                `).join('')}
            </div>

            ${order.notes ? `
                <div class="ticket-note">
                    <strong>Note</strong>
                    <span>${escapeHtml(order.notes)}</span>
                </div>
            ` : ''}

            <button class="ticket-complete-btn" type="button" data-complete-order="${order.id}">
                Mark Complete
            </button>
        </article>
    `).join('');

    bindTicketGestures();
}

async function loadKitchenOrders() {
    try {
        const res = await fetch('/api/kitchen/orders');
        const data = await res.json();

        if (!data.success) {
            ordersBoard.innerHTML = `
                <div class="orders-empty">
                    <h2>Unable to load orders</h2>
                    <p>${escapeHtml(data.message || 'Please try again.')}</p>
                </div>
            `;
            return;
        }

        kitchenOrders = data.orders;
        renderKitchenOrders();
    } catch (err) {
        console.error('Failed to load kitchen orders:', err);
        ordersBoard.innerHTML = `
            <div class="orders-empty">
                <h2>Unable to load orders</h2>
                <p>Please check the server connection.</p>
            </div>
        `;
    }
}

async function completeKitchenOrder(orderId, card) {
    if (!orderId || card?.classList.contains('completing')) return;

    if (card) {
        const releaseY = Number(card.dataset.releaseY || 0);
        card.style.setProperty('--release-y', `${releaseY}px`);
        card.style.setProperty('--release-rotate', `${releaseY / 28}deg`);
        card.style.transform = '';
        card.style.opacity = '';
        card.classList.add('completing');
    }

    try {
        const res = await fetch(`/api/kitchen/orders/${orderId}/complete`, {
            method: 'PATCH'
        });
        const data = await res.json();

        if (!data.success) {
            card?.classList.remove('completing');
            alert(data.message || 'Failed to complete order');
            return;
        }

        setTimeout(() => {
            kitchenOrders = kitchenOrders.filter(order => String(order.id) !== String(orderId));
            renderKitchenOrders();
        }, 520);
    } catch (err) {
        console.error('Failed to complete order:', err);
        card?.classList.remove('completing');
        alert('Failed to complete order');
    }
}

function bindTicketGestures() {
    document.querySelectorAll('.kitchen-ticket').forEach(card => {
        let startY = 0;
        let currentY = 0;
        let isDragging = false;

        card.addEventListener('pointerdown', event => {
            if (event.target.closest('button')) return;

            isDragging = true;
            startY = event.clientY;
            currentY = 0;
            card.classList.add('swiping');
            card.setPointerCapture(event.pointerId);
        });

        card.addEventListener('pointermove', event => {
            if (!isDragging) return;

            currentY = Math.min(0, event.clientY - startY);
            card.style.transform = `translateY(${currentY}px) rotate(${currentY / 28}deg)`;
            card.style.opacity = String(Math.max(0.42, 1 + currentY / 180));
        });

        card.addEventListener('pointerup', event => {
            if (!isDragging) return;

            isDragging = false;
            card.classList.remove('swiping');
            card.releasePointerCapture?.(event.pointerId);

            if (currentY < -84) {
                card.dataset.releaseY = String(currentY);
                completeKitchenOrder(card.dataset.orderId, card);
                return;
            }

            card.style.transform = '';
            card.style.opacity = '';
            card.dataset.releaseY = '0';
        });

        card.addEventListener('pointercancel', () => {
            isDragging = false;
            card.classList.remove('swiping');
            card.style.transform = '';
            card.style.opacity = '';
        });
    });
}

ordersBoard.addEventListener('click', event => {
    const button = event.target.closest('[data-complete-order]');
    if (!button) return;

    completeKitchenOrder(button.dataset.completeOrder, button.closest('.kitchen-ticket'));
});

refreshButton.addEventListener('click', loadKitchenOrders);

loadKitchenOrders();
refreshTimer = setInterval(loadKitchenOrders, 15000);
window.addEventListener('beforeunload', () => clearInterval(refreshTimer));
