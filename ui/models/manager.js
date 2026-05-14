const metricTotalTransactions = document.getElementById('metric-total-transactions');
const metricTotalRevenue = document.getElementById('metric-total-revenue');
const metricItemsSold = document.getElementById('metric-items-sold');
const metricAvgTransaction = document.getElementById('metric-avg-transaction');
const auditBody = document.getElementById('audit-body');
const currentDate = document.getElementById('current-date');
const pageTitle = document.getElementById('page-title');
const pageSubtitle = document.getElementById('page-subtitle');
const registrationsBody = document.getElementById('registrations-body');
const staffBody = document.getElementById('staff-body');
const managerFoodGrid = document.getElementById('manager-food-grid');
const navItems = document.querySelectorAll('.nav-item[data-panel]');
const managerNav = document.querySelector('.nav');
const foodFilterButtons = document.querySelectorAll('.food-filter');

let currentManagerId = null;
let managerProducts = [];
let activeFoodCategory = 'all';

const categoryFallbackImages = {
    1: '/assets/icons8-cafe-96.png',
    2: '/assets/icons8-greek-salad-64.png',
    3: '/assets/icons8-cherry-cheesecake-64.png',
    4: '/assets/icons8-kawaii-soda-64.png'
};

const panelCopy = {
    manager: {
        title: 'Manager Dashboard',
        subtitle: "Welcome back! Here's what's happening today."
    },
    transactions: {
        title: 'Transactions',
        subtitle: 'Review transaction metrics and audit activity.'
    },
    food: {
        title: 'Food Availability',
        subtitle: 'Set which menu items cashiers can sell.'
    },
    staff: {
        title: 'Staff Profiles',
        subtitle: 'Manage cashier and staff information.'
    }
};

function formatPeso(value) {
    return `\u20B1${Number(value).toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
}

function formatPesoWhole(value) {
    return `\u20B1${Number(value).toLocaleString('en-PH', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    })}`;
}

function formatCountComparison(today, yesterday) {
    const difference = Number(today || 0) - Number(yesterday || 0);

    if (difference === 0) return 'No change vs yesterday';
    return `${difference > 0 ? '+' : ''}${difference.toLocaleString('en-PH')} vs yesterday`;
}

function formatCountDelta(today, yesterday) {
    const difference = Number(today || 0) - Number(yesterday || 0);
    if (difference === 0) return '0';
    return `${difference > 0 ? '+' : ''}${difference.toLocaleString('en-PH')}`;
}

function formatMoneyComparison(today, yesterday) {
    const difference = Number(today || 0) - Number(yesterday || 0);

    if (difference === 0) return 'No change vs yesterday';
    return `${difference > 0 ? '+' : '-'}${formatPeso(Math.abs(difference))} vs yesterday`;
}

function formatMoneyDelta(today, yesterday) {
    const difference = Number(today || 0) - Number(yesterday || 0);
    if (difference === 0) return formatPesoWhole(0);
    return `${difference > 0 ? '+' : '-'}${formatPesoWhole(Math.abs(difference))}`;
}

function formatHoursComparison(today, yesterday) {
    const difference = Number(today || 0) - Number(yesterday || 0);

    if (difference === 0) return 'No change vs yesterday';
    return `${difference > 0 ? '+' : '-'}${Math.abs(difference).toFixed(1)}h vs yesterday`;
}

function formatHoursDelta(today, yesterday) {
    const difference = Number(today || 0) - Number(yesterday || 0);
    if (difference === 0) return '0h';
    return `${difference > 0 ? '+' : '-'}${Math.abs(difference).toFixed(1)}h`;
}

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function formatDate(value) {
    if (!value) return { date: '--', time: '--' };

    const date = new Date(value);
    return {
        date: date.toLocaleDateString('en-US', {
            month: 'numeric',
            day: 'numeric',
            year: 'numeric'
        }),
        time: date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        })
    };
}

function formatRegistrationDate(value) {
    if (!value) return { date: '--', time: '--' };

    const date = new Date(value);
    return {
        date: date.toLocaleDateString('en-US', {
            month: 'numeric',
            day: 'numeric',
            year: 'numeric'
        }),
        time: date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        })
    };
}

function getInitials(name = '') {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'NA';

    return parts.map(part => part[0]).join('').slice(0, 2).toUpperCase();
}

function getProductImage(product) {
    return product.image_url || categoryFallbackImages[product.category_id] || '/assets/icons8-cafe-96.png';
}

function setCurrentDate() {
    const now = new Date();
    currentDate.textContent = now.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });
}

async function loadManagerDashboard() {
    try {
        const res = await fetch('/api/manager/dashboard');
        const data = await res.json();

        if (!data.success) {
            auditBody.innerHTML = `
                <div class="audit-empty">
                    <img src="/assets/icons8-activity-history-100.png" alt="">
                    <p>${escapeHtml(data.message || 'Failed to load audit log')}</p>
                </div>
            `;
            return;
        }

        renderMetrics(data.stats);
        renderDailyReport(data.dailyReport);
        renderRegistrations(data.registrations);
        renderAuditRows(data.auditRows);
    } catch (err) {
        console.error('Failed to load manager dashboard:', err);
        auditBody.innerHTML = `
            <div class="audit-empty">
                <img src="/assets/icons8-activity-history-100.png" alt="">
                <p>Failed to load audit log</p>
            </div>
        `;
    }
}

async function loadRegistrations() {
    try {
        const res = await fetch('/api/manager/registrations');
        const data = await res.json();

        if (!data.success) {
            registrationsBody.innerHTML = `
                <div class="registration-empty">
                    <p>${escapeHtml(data.message || 'Failed to load registrations')}</p>
                </div>
            `;
            return;
        }

        renderRegistrations(data.registrations);
    } catch (err) {
        console.error('Failed to load registrations:', err);
        registrationsBody.innerHTML = `
            <div class="registration-empty">
                <p>Failed to load registrations</p>
            </div>
        `;
    }
}

async function loadStaffProfiles() {
    try {
        const res = await fetch('/api/manager/staff');
        const data = await res.json();

        if (!data.success) {
            staffBody.innerHTML = `
                <div class="registration-empty">
                    <p>${escapeHtml(data.message || 'Failed to load staff profiles')}</p>
                </div>
            `;
            return;
        }

        currentManagerId = data.currentUserId;
        renderStaffProfiles(data.staffProfiles);
    } catch (err) {
        console.error('Failed to load staff profiles:', err);
        staffBody.innerHTML = `
            <div class="registration-empty">
                <p>Failed to load staff profiles</p>
            </div>
        `;
    }
}

async function loadManagerProducts() {
    try {
        const res = await fetch('/api/manager/products');
        const data = await res.json();

        if (!data.success) {
            managerFoodGrid.innerHTML = `<div class="food-empty">${escapeHtml(data.message || 'Failed to load menu items')}</div>`;
            return;
        }

        managerProducts = data.products;
        renderManagerProducts();
    } catch (err) {
        console.error('Failed to load menu items:', err);
        managerFoodGrid.innerHTML = '<div class="food-empty">Failed to load menu items</div>';
    }
}

function renderDailyReport(report) {
    const hours = Number(report?.hoursClocked || 0);
    const staffCount = Number(report?.staffCount || 0);

    document.getElementById('daily-transactions').textContent = Number(report?.transactionsMade || 0).toLocaleString('en-PH');
    document.getElementById('daily-transactions-pill').textContent = formatCountDelta(
        report?.transactionsMade,
        report?.transactionsMadeYesterday
    );
    document.getElementById('daily-transactions-comparison').textContent = formatCountComparison(
        report?.transactionsMade,
        report?.transactionsMadeYesterday
    );

    document.getElementById('daily-revenue').textContent = formatPesoWhole(report?.dailyRevenue || 0);
    document.getElementById('daily-revenue-pill').textContent = formatMoneyDelta(
        report?.dailyRevenue,
        report?.dailyRevenueYesterday
    );
    document.getElementById('daily-revenue-comparison').textContent = formatMoneyComparison(
        report?.dailyRevenue,
        report?.dailyRevenueYesterday
    );

    document.getElementById('daily-refunded').textContent = Number(report?.ordersRefunded || 0).toLocaleString('en-PH');
    document.getElementById('daily-refunded-pill').textContent = formatCountDelta(
        report?.ordersRefunded,
        report?.ordersRefundedYesterday
    );
    document.getElementById('daily-refunded-comparison').textContent = formatCountComparison(
        report?.ordersRefunded,
        report?.ordersRefundedYesterday
    );

    document.getElementById('daily-voided').textContent = Number(report?.ordersVoided || 0).toLocaleString('en-PH');
    document.getElementById('daily-voided-pill').textContent = formatCountDelta(
        report?.ordersVoided,
        report?.ordersVoidedYesterday
    );
    document.getElementById('daily-voided-comparison').textContent = formatCountComparison(
        report?.ordersVoided,
        report?.ordersVoidedYesterday
    );

    document.getElementById('daily-hours').textContent = `${hours.toFixed(1)}h`;
    document.getElementById('daily-staff-count').textContent = `${staffCount} staff`;
    document.getElementById('daily-hours-comparison').textContent = formatHoursComparison(
        report?.hoursClocked,
        report?.hoursClockedYesterday
    );
}

function renderMetrics(stats) {
    metricTotalTransactions.textContent = Number(stats.totalTransactions || 0).toLocaleString('en-PH');
    metricTotalRevenue.textContent = formatPeso(stats.totalRevenue);
    metricItemsSold.textContent = Number(stats.itemsSold || 0).toLocaleString('en-PH');
    metricAvgTransaction.textContent = formatPeso(stats.avgTransaction);
}

function renderAuditRows(rows) {
    if (!rows || rows.length === 0) {
        auditBody.innerHTML = `
            <div class="audit-empty">
                <img src="/assets/icons8-activity-history-100.png" alt="">
                <p>No audit events yet</p>
                <span>Staff and transaction activity will appear here</span>
            </div>
        `;
        return;
    }

    auditBody.innerHTML = rows.map(row => {
        const eventDate = formatDate(row.event_time);
        const actionClass = `action-${row.action_type}`;
        const name = row.name || row.username || 'Staff';

        return `
            <div class="audit-row">
                <div class="audit-user">
                    <div class="audit-avatar">${escapeHtml(getInitials(name))}</div>
                    <div>
                        <strong>${escapeHtml(name)}</strong>
                        <span>@${escapeHtml(row.username)}</span>
                    </div>
                </div>
                <div>
                    <span class="audit-action ${actionClass}">${escapeHtml(row.action_label)}</span>
                </div>
                <div class="audit-details">${escapeHtml(row.details)}</div>
                <div class="audit-date">
                    <div>${eventDate.date}</div>
                    <div>${eventDate.time}</div>
                </div>
            </div>
        `;
    }).join('');
}

function renderRegistrations(registrations) {
    if (!registrations || registrations.length === 0) {
        registrationsBody.innerHTML = `
            <div class="registration-empty">
                <p>No pending registrations</p>
                <span>New cashier account requests will appear here</span>
            </div>
            <div class="registration-footer">
                <span>0 pending registrations awaiting review</span>
                <span>Approved accounts will appear in Staff Profiles</span>
            </div>
        `;
        return;
    }

    registrationsBody.innerHTML = `
        ${registrations.map(registration => {
            const submitted = formatRegistrationDate(registration.submitted_at);

            return `
                <div class="registration-row">
                    <div class="registration-user">
                        <div class="registration-avatar">${escapeHtml(getInitials(registration.name))}</div>
                        <strong>@${escapeHtml(registration.username)}</strong>
                    </div>
                    <strong>${escapeHtml(registration.name)}</strong>
                    <span class="registration-email">&#9993; ${escapeHtml(registration.email)}</span>
                    <span class="role-pill">${escapeHtml(registration.role)}</span>
                    <span class="registration-date">${submitted.date}<span>${submitted.time}</span></span>
                    <span class="registration-actions">
                        <button class="registration-action reject" type="button" data-registration-action="reject" data-registration-id="${registration.id}" aria-label="Delete ${escapeHtml(registration.username)} registration">&times;</button>
                        <button class="registration-action accept" type="button" data-registration-action="accept" data-registration-id="${registration.id}" aria-label="Accept ${escapeHtml(registration.username)} registration">&check;</button>
                    </span>
                </div>
            `;
        }).join('')}
        <div class="registration-footer">
            <span>${registrations.length} pending registration${registrations.length === 1 ? '' : 's'} awaiting review</span>
            <span>Review and approve to add to Staff Profiles</span>
        </div>
    `;
}

function renderStaffProfiles(staffProfiles) {
    if (!staffProfiles || staffProfiles.length === 0) {
        staffBody.innerHTML = `
            <div class="registration-empty">
                <p>No staff profiles yet</p>
                <span>Accepted accounts will appear here</span>
            </div>
            <div class="registration-footer">
                <span>0 staff profiles</span>
                <span>Use account status to enable or disable logins</span>
            </div>
        `;
        return;
    }

    staffBody.innerHTML = `
        ${staffProfiles.map(staff => {
            const isActive = staff.is_active === 'active';
            const isCurrentManager = Number(staff.id) === Number(currentManagerId);
            const nextStatus = isActive ? 'disabled' : 'active';

            return `
                <div class="registration-row staff-row">
                    <div class="registration-user">
                        <div class="registration-avatar">${escapeHtml(getInitials(staff.name))}</div>
                        <strong>@${escapeHtml(staff.username)}</strong>
                    </div>
                    <strong>${escapeHtml(staff.name)}</strong>
                    <span class="registration-email">&#9993; ${escapeHtml(staff.email)}</span>
                    <span class="role-pill">${escapeHtml(staff.role)}</span>
                    <span class="status-pill ${escapeHtml(staff.is_active)}">${escapeHtml(staff.is_active)}</span>
                    <span class="registration-actions">
                        <button
                            class="staff-toggle-btn ${isActive ? 'disable' : 'enable'}"
                            type="button"
                            data-staff-id="${staff.id}"
                            data-next-status="${nextStatus}"
                            ${isCurrentManager && isActive ? 'disabled title="You cannot disable your own account"' : ''}
                        >
                            ${isActive ? 'Disable' : 'Enable'}
                        </button>
                    </span>
                </div>
            `;
        }).join('')}
        <div class="registration-footer">
            <span>${staffProfiles.length} staff profile${staffProfiles.length === 1 ? '' : 's'}</span>
            <span>Disabled accounts cannot log in</span>
        </div>
    `;
}

function updateFoodCounts() {
    const counts = { all: managerProducts.length };

    managerProducts.forEach(product => {
        counts[product.category_id] = (counts[product.category_id] || 0) + 1;
    });

    ['all', '1', '2', '3', '4'].forEach(id => {
        const countEl = document.getElementById(`food-count-${id}`);
        if (countEl) countEl.textContent = counts[id] || 0;
    });
}

function renderManagerProducts() {
    updateFoodCounts();

    const visibleProducts = activeFoodCategory === 'all'
        ? managerProducts
        : managerProducts.filter(product => String(product.category_id) === activeFoodCategory);

    if (visibleProducts.length === 0) {
        managerFoodGrid.innerHTML = '<div class="food-empty">No menu items in this category</div>';
        return;
    }

    managerFoodGrid.innerHTML = visibleProducts.map(product => {
        const isAvailable = Number(product.is_available) === 1;

        return `
            <article class="manager-food-card ${isAvailable ? '' : 'unavailable'}">
                <div class="manager-food-media">
                    <img src="${escapeHtml(getProductImage(product))}" alt="${escapeHtml(product.name)}">
                </div>
                <div class="manager-food-body">
                    <div class="manager-food-top">
                        <h3>${escapeHtml(product.name)}</h3>
                        <span class="manager-food-category">${escapeHtml(product.category_name)}</span>
                    </div>
                    <p class="manager-food-description">${escapeHtml(product.description || 'No description available')}</p>
                    <div class="manager-food-footer">
                        <span class="manager-food-price">${formatPesoWhole(product.base_price)}</span>
                        <button
                            class="availability-toggle ${isAvailable ? 'available' : 'unavailable'}"
                            type="button"
                            data-product-id="${product.id}"
                            data-next-availability="${isAvailable ? '0' : '1'}"
                        >
                            ${isAvailable ? 'Available' : 'Unavailable'}
                        </button>
                    </div>
                </div>
            </article>
        `;
    }).join('');
}

async function handleRegistrationAction(action, registrationId) {
    if (action === 'reject' && !confirm('Delete this registration permanently?')) {
        return;
    }

    const endpoint = action === 'accept'
        ? `/api/manager/registrations/${registrationId}/accept`
        : `/api/manager/registrations/${registrationId}`;

    const method = action === 'accept' ? 'POST' : 'DELETE';

    try {
        const res = await fetch(endpoint, { method });
        const data = await res.json();

        if (!data.success) {
            alert(data.message || 'Registration action failed');
            return;
        }

        await loadRegistrations();
    } catch (err) {
        console.error('Registration action failed:', err);
        alert('Registration action failed');
    }
}

async function handleStaffStatusUpdate(staffId, nextStatus) {
    try {
        const res = await fetch(`/api/manager/staff/${staffId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_active: nextStatus })
        });
        const data = await res.json();

        if (!data.success) {
            alert(data.message || 'Failed to update staff status');
            return;
        }

        await loadStaffProfiles();
    } catch (err) {
        console.error('Failed to update staff status:', err);
        alert('Failed to update staff status');
    }
}

async function handleProductAvailabilityUpdate(productId, nextAvailability, button) {
    button.disabled = true;
    const originalText = button.textContent;
    button.textContent = 'Saving...';

    try {
        const res = await fetch(`/api/manager/products/${productId}/availability`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_available: Number(nextAvailability) })
        });
        const data = await res.json();

        if (!data.success) {
            alert(data.message || 'Failed to update availability');
            return;
        }

        const product = managerProducts.find(item => String(item.id) === String(productId));
        if (product) product.is_available = Number(nextAvailability);
        renderManagerProducts();
        sessionStorage.removeItem('makuProductsCache');
    } catch (err) {
        console.error('Failed to update product availability:', err);
        alert('Failed to update availability');
    } finally {
        button.disabled = false;
        button.textContent = originalText;
    }
}

function switchPanel(panelName) {
    document.querySelectorAll('.panel-section').forEach(panel => {
        panel.classList.toggle('active', panel.id === `panel-${panelName}`);
    });

    navItems.forEach(item => {
        item.classList.toggle('active', item.dataset.panel === panelName);
    });

    const activeItem = document.querySelector(`.nav-item[data-panel="${panelName}"]`);
    if (activeItem?.dataset.navIndex) {
        managerNav?.style.setProperty('--active-index', activeItem.dataset.navIndex);
    }

    pageTitle.textContent = panelCopy[panelName].title;
    pageSubtitle.textContent = panelCopy[panelName].subtitle;

    if (panelName === 'transactions' || panelName === 'manager') {
        loadManagerDashboard();
    }

    if (panelName === 'food') {
        loadManagerProducts();
    }
}

navItems.forEach(item => {
    item.addEventListener('click', () => {
        switchPanel(item.dataset.panel);
    });
});

registrationsBody.addEventListener('click', event => {
    const actionButton = event.target.closest('[data-registration-action]');
    if (!actionButton) return;

    handleRegistrationAction(
        actionButton.dataset.registrationAction,
        actionButton.dataset.registrationId
    );
});

staffBody.addEventListener('click', event => {
    const toggleButton = event.target.closest('[data-staff-id]');
    if (!toggleButton || toggleButton.disabled) return;

    handleStaffStatusUpdate(
        toggleButton.dataset.staffId,
        toggleButton.dataset.nextStatus
    );
});

managerFoodGrid.addEventListener('click', event => {
    const toggleButton = event.target.closest('[data-product-id]');
    if (!toggleButton || toggleButton.disabled) return;

    handleProductAvailabilityUpdate(
        toggleButton.dataset.productId,
        toggleButton.dataset.nextAvailability,
        toggleButton
    );
});

foodFilterButtons.forEach(button => {
    button.addEventListener('click', () => {
        activeFoodCategory = button.dataset.foodCategory;
        foodFilterButtons.forEach(item => item.classList.toggle('active', item === button));
        renderManagerProducts();
    });
});

setCurrentDate();
loadManagerDashboard();
loadRegistrations();
loadStaffProfiles();
loadManagerProducts();
