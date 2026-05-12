const metricTotalTransactions = document.getElementById('metric-total-transactions');
const metricTotalRevenue = document.getElementById('metric-total-revenue');
const metricItemsSold = document.getElementById('metric-items-sold');
const metricAvgTransaction = document.getElementById('metric-avg-transaction');
const auditBody = document.getElementById('audit-body');
const currentDate = document.getElementById('current-date');
const pageTitle = document.getElementById('page-title');
const pageSubtitle = document.getElementById('page-subtitle');
const registrationsBody = document.getElementById('registrations-body');
const navItems = document.querySelectorAll('.nav-item[data-panel]');

const panelCopy = {
    manager: {
        title: 'Manager Dashboard',
        subtitle: "Welcome back! Here's what's happening today."
    },
    transactions: {
        title: 'Transactions',
        subtitle: 'Review transaction metrics and audit activity.'
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

function formatMoneyComparison(today, yesterday) {
    const difference = Number(today || 0) - Number(yesterday || 0);

    if (difference === 0) return 'No change vs yesterday';
    return `${difference > 0 ? '+' : '-'}${formatPeso(Math.abs(difference))} vs yesterday`;
}

function formatHoursComparison(today, yesterday) {
    const difference = Number(today || 0) - Number(yesterday || 0);

    if (difference === 0) return 'No change vs yesterday';
    return `${difference > 0 ? '+' : '-'}${Math.abs(difference).toFixed(1)}h vs yesterday`;
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

function renderDailyReport(report) {
    const hours = Number(report?.hoursClocked || 0);
    const staffCount = Number(report?.staffCount || 0);

    document.getElementById('daily-transactions').textContent = Number(report?.transactionsMade || 0).toLocaleString('en-PH');
    document.getElementById('daily-transactions-comparison').textContent = formatCountComparison(
        report?.transactionsMade,
        report?.transactionsMadeYesterday
    );

    document.getElementById('daily-revenue').textContent = formatPesoWhole(report?.dailyRevenue || 0);
    document.getElementById('daily-revenue-comparison').textContent = formatMoneyComparison(
        report?.dailyRevenue,
        report?.dailyRevenueYesterday
    );

    document.getElementById('daily-refunded').textContent = Number(report?.ordersRefunded || 0).toLocaleString('en-PH');
    document.getElementById('daily-refunded-comparison').textContent = formatCountComparison(
        report?.ordersRefunded,
        report?.ordersRefundedYesterday
    );

    document.getElementById('daily-voided').textContent = Number(report?.ordersVoided || 0).toLocaleString('en-PH');
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
                        <span>&times;</span>
                        <span>&check;</span>
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

function switchPanel(panelName) {
    document.querySelectorAll('.panel-section').forEach(panel => {
        panel.classList.toggle('active', panel.id === `panel-${panelName}`);
    });

    navItems.forEach(item => {
        item.classList.toggle('active', item.dataset.panel === panelName);
    });

    pageTitle.textContent = panelCopy[panelName].title;
    pageSubtitle.textContent = panelCopy[panelName].subtitle;
}

navItems.forEach(item => {
    item.addEventListener('click', () => {
        switchPanel(item.dataset.panel);
    });
});

setCurrentDate();
loadManagerDashboard();
