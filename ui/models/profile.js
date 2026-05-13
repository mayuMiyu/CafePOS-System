const historyList = document.getElementById('history-list');
const statTransactions = document.getElementById('stat-transactions');
const statTotalTime = document.getElementById('stat-total-time');
const statSessionTime = document.getElementById('stat-session-time');
const statSessionRevenue = document.getElementById('stat-session-revenue');
const profileAvatar = document.getElementById('profile-avatar');
const profileName = document.getElementById('profile-name');
const clock = document.getElementById('realtime-clock');
const profileNav = document.querySelector('.nav');

let transactions = [];
let selectedTransactionId = null;
let selectedTransactionStatus = null;

function formatPeso(value) {
    return `\u20B1${Number(value).toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
}

function formatTime(seconds) {
    const totalSeconds = Number(seconds || 0);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
}

function formatDate(value) {
    if (!value) return '--';

    return new Date(value).toLocaleString('en-PH', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });
}

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function updateClock() {
    const now = new Date();
    clock.textContent = now.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });
}

document.querySelectorAll('[data-nav-target]').forEach(button => {
    button.addEventListener('click', () => {
        profileNav?.style.setProperty('--active-index', button.dataset.navIndex);
        setTimeout(() => {
            window.location.href = button.dataset.navTarget;
        }, 170);
    });
});

function getInitials(name = '') {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'JD';
    return parts.map(part => part[0]).join('').slice(0, 2).toUpperCase();
}

function getItemDisplayName(item) {
    const parts = [item.product_name];

    if (item.size_label) {
        parts.push(`(${item.size_label})`);
    }

    if (item.addons?.length) {
        parts.push(`+ ${item.addons.map(addon => addon.addon_name).join(', ')}`);
    }

    return parts.join(' ');
}

async function loadProfileTransactions() {
    try {
        const res = await fetch('/api/profile/transactions');
        const data = await res.json();

        if (!data.success) {
            historyList.innerHTML = `<div class="history-empty"><p>${escapeHtml(data.message || 'Failed to load transactions')}</p></div>`;
            return;
        }

        transactions = data.transactions;
        renderSummary(data.summary);
        renderCashier(data.cashier);
        renderTransactions();
    } catch (err) {
        console.error('Failed to load profile transactions:', err);
        historyList.innerHTML = '<div class="history-empty"><p>Failed to load transactions</p></div>';
    }
}

function renderCashier(cashier) {
    profileName.textContent = cashier?.name || cashier?.username || 'Cashier';
    profileAvatar.textContent = getInitials(cashier?.name || cashier?.username || 'Cashier');
}

function renderSummary(summary) {
    statTransactions.textContent = summary.totalTransactions ?? 0;
    statTotalTime.textContent = formatTime(summary.totalTimeSeconds);
    statSessionTime.textContent = formatTime(summary.sessionTimeSeconds);
    statSessionRevenue.textContent = formatPeso(summary.sessionRevenue);
}

function renderTransactions() {
    if (transactions.length === 0) {
        historyList.innerHTML = `
            <div class="history-empty">
                <img src="/assets/icons8-activity-history-100.png" alt="">
                <p>No transactions yet</p>
                <span>Completed transactions will appear here</span>
            </div>
        `;
        return;
    }

    historyList.innerHTML = transactions.map(transaction => `
        <button type="button" class="history-row" data-order-id="${transaction.id}">
            <div>
                <h3>Order #${transaction.id}</h3>
                <p>${formatDate(transaction.completed_at || transaction.created_at)} · ${Number(transaction.item_count || 0)} item(s)</p>
            </div>
            <div>
                <strong>${formatPeso(transaction.total)}</strong>
                <span class="status-pill status-${transaction.status}">${escapeHtml(transaction.status)}</span>
            </div>
        </button>
    `).join('');
}

function ensureTransactionModal() {
    if (document.getElementById('transaction-detail-modal')) return;

    document.body.insertAdjacentHTML('beforeend', `
        <div class="detail-overlay" id="transaction-detail-modal" aria-hidden="true">
            <div class="detail-dialog" role="dialog" aria-modal="true" aria-labelledby="transaction-detail-title">
                <div class="detail-header">
                    <div>
                        <h2 id="transaction-detail-title">Order Info</h2>
                        <p id="transaction-detail-subtitle">Transaction details</p>
                    </div>
                    <button type="button" class="detail-close" id="detail-close-btn" aria-label="Close">&times;</button>
                </div>

                <div class="detail-body">
                    <section class="detail-section">
                        <h3 id="detail-status-title">Pending Order</h3>
                        <div id="detail-order-info"></div>
                    </section>

                    <section class="detail-section">
                        <h3>Order Items</h3>
                        <div id="detail-items"></div>
                    </section>

                    <section class="detail-section">
                        <h3>Transaction Details</h3>
                        <div id="detail-payment"></div>
                    </section>
                </div>

                <div class="detail-actions">
                    <button type="button" class="void-btn" id="void-transaction-btn">Void</button>
                    <button type="button" class="refund-btn" id="refund-transaction-btn">Refund</button>
                </div>
            </div>
        </div>
    `);

    document.getElementById('detail-close-btn').addEventListener('click', closeTransactionModal);
    document.getElementById('transaction-detail-modal').addEventListener('click', (event) => {
        if (event.target.id === 'transaction-detail-modal') closeTransactionModal();
    });
    document.getElementById('void-transaction-btn').addEventListener('click', () => updateTransactionStatus('voided'));
    document.getElementById('refund-transaction-btn').addEventListener('click', () => updateTransactionStatus('refunded'));
}

async function openTransactionModal(orderId) {
    ensureTransactionModal();
    selectedTransactionId = orderId;

    try {
        const res = await fetch(`/api/profile/transactions/${orderId}`);
        const data = await res.json();

        if (!data.success) {
            alert(data.message || 'Failed to load transaction details');
            return;
        }

        selectedTransactionStatus = data.order.status;
        renderTransactionDetails(data.order, data.items);

        const modal = document.getElementById('transaction-detail-modal');
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
    } catch (err) {
        console.error('Failed to load transaction details:', err);
        alert('Failed to load transaction details');
    }
}

function closeTransactionModal() {
    const modal = document.getElementById('transaction-detail-modal');
    if (!modal) return;

    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
}

function renderTransactionDetails(order, items) {
    document.getElementById('transaction-detail-title').textContent = `Order #${order.id}`;
    document.getElementById('transaction-detail-subtitle').textContent = formatDate(order.completed_at || order.created_at);
    document.getElementById('detail-status-title').textContent = `${order.status.charAt(0).toUpperCase()}${order.status.slice(1)} Order`;

    document.getElementById('detail-order-info').innerHTML = `
        <div class="detail-line">
            <span>Status</span>
            <strong class="status-pill status-${order.status}">${escapeHtml(order.status)}</strong>
        </div>
        <div class="detail-line">
            <span>Created</span>
            <strong>${formatDate(order.created_at)}</strong>
        </div>
        <div class="detail-line">
            <span>Note</span>
            <strong>${escapeHtml(order.notes || 'No note')}</strong>
        </div>
    `;

    document.getElementById('detail-items').innerHTML = items.map(item => `
        <article class="detail-item">
            <h4>${escapeHtml(getItemDisplayName(item))}</h4>
            <p>${formatPeso(item.unit_price)} x ${item.quantity} · ${formatPeso(item.line_subtotal)}</p>
        </article>
    `).join('');

    document.getElementById('detail-payment').innerHTML = `
        <div class="detail-line">
            <span>Subtotal</span>
            <strong>${formatPeso(order.subtotal)}</strong>
        </div>
        <div class="detail-line">
            <span>Discount</span>
            <strong>-${formatPeso(order.discount_amount)}</strong>
        </div>
        <div class="detail-line">
            <span>Tax</span>
            <strong>${formatPeso(order.tax_amount)}</strong>
        </div>
        <div class="detail-line">
            <span>Total Amount</span>
            <strong>${formatPeso(order.total)}</strong>
        </div>
        <div class="detail-line">
            <span>Paid By</span>
            <strong>${escapeHtml(order.payment_method || 'Unpaid')}</strong>
        </div>
    `;

    const isFinal = ['voided', 'refunded'].includes(order.status);
    document.getElementById('void-transaction-btn').disabled = isFinal;
    document.getElementById('refund-transaction-btn').disabled = isFinal;
}

async function updateTransactionStatus(status) {
    if (!selectedTransactionId || ['voided', 'refunded'].includes(selectedTransactionStatus)) return;

    try {
        const res = await fetch(`/api/orders/${selectedTransactionId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });

        const data = await res.json();

        if (!data.success) {
            alert(data.message || 'Failed to update transaction');
            return;
        }

        closeTransactionModal();
        await loadProfileTransactions();
    } catch (err) {
        console.error('Failed to update transaction:', err);
        alert('Failed to update transaction');
    }
}

historyList.addEventListener('click', (event) => {
    const row = event.target.closest('.history-row');
    if (!row) return;

    openTransactionModal(row.dataset.orderId);
});

updateClock();
setInterval(updateClock, 1000);
loadProfileTransactions();
