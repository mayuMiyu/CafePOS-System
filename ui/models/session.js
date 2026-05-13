const sessionState = {
    user: null
};

function getInitialsFromName(name = '') {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'NA';
    return parts.map(part => part[0]).join('').slice(0, 2).toUpperCase();
}

function escapeSessionHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function injectSessionStyles() {
    if (document.getElementById('session-modal-styles')) return;

    const style = document.createElement('style');
    style.id = 'session-modal-styles';
    style.textContent = `
        .logout-confirm-overlay {
            position: fixed;
            inset: 0;
            z-index: 100;
            display: none;
            align-items: center;
            justify-content: center;
            padding: 24px;
            background: rgba(15, 23, 42, .58);
            font-family: "Segoe UI", Arial, sans-serif;
        }

        .logout-confirm-overlay.active {
            display: flex;
            animation: logoutOverlayFade .18s ease both;
        }

        .logout-confirm-dialog {
            width: min(500px, 100%);
            border-radius: 14px;
            background: #fff;
            overflow: hidden;
            box-shadow: 0 24px 80px rgba(15, 23, 42, .28);
        }

        .logout-confirm-overlay.active .logout-confirm-dialog {
            animation: logoutDialogEnter .24s ease-out both;
        }

        @keyframes logoutOverlayFade {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        @keyframes logoutDialogEnter {
            from {
                opacity: 0;
                transform: translateY(14px) scale(.98);
            }

            to {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
        }

        .logout-confirm-header {
            min-height: 104px;
            background: linear-gradient(135deg, #ff2d3d, #e80013);
            color: #fff;
            display: grid;
            grid-template-columns: 48px minmax(0, 1fr);
            align-items: center;
            gap: 18px;
            padding: 22px 32px;
        }

        .logout-alert-icon {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            background: rgba(255, 255, 255, .22);
            display: grid;
            place-items: center;
            font-size: 27px;
            font-weight: 800;
        }

        .logout-confirm-header h2 {
            font-size: 26px;
            line-height: 1.1;
            margin: 0 0 5px;
        }

        .logout-confirm-header p,
        .logout-confirm-body p {
            margin: 0;
        }

        .logout-confirm-body {
            padding: 32px;
        }

        .logout-session-box {
            border: 1px solid #fecaca;
            border-radius: 10px;
            background: #fff7f7;
            padding: 24px;
            margin-bottom: 24px;
        }

        .logout-session-box > p {
            color: #1f2937;
            font-size: 16px;
            margin-bottom: 16px;
        }

        .logout-user-card {
            border: 1px solid #fecaca;
            border-radius: 10px;
            background: #fff;
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 17px;
        }

        .logout-user-avatar {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            background: #f59e0b;
            color: #fff;
            display: grid;
            place-items: center;
            font-size: 18px;
            font-weight: 800;
        }

        .logout-user-card strong {
            display: block;
            color: #1f2937;
            font-size: 16px;
            margin-bottom: 4px;
        }

        .logout-user-card span,
        .logout-confirm-message {
            color: #64748b;
            font-size: 14px;
        }

        .logout-warning {
            border: 1px solid #fcd34d;
            border-radius: 10px;
            background: #fffbeb;
            color: #9a3412;
            line-height: 1.45;
            padding: 17px;
            margin-bottom: 24px;
            font-size: 14px;
        }

        .logout-warning strong {
            color: #9a3412;
        }

        .logout-confirm-actions {
            border-top: 1px solid #e5e7eb;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 18px;
            padding: 26px 32px;
        }

        .logout-cancel-btn,
        .logout-confirm-btn {
            height: 54px;
            border-radius: 10px;
            font: inherit;
            font-size: 16px;
            font-weight: 700;
            cursor: pointer;
        }

        .logout-cancel-btn {
            border: 1px solid #cbd5e1;
            background: #fff;
            color: #020617;
        }

        .logout-confirm-btn {
            border: none;
            background: #ff2d3d;
            color: #fff;
        }

        @media (prefers-reduced-motion: reduce) {
            .logout-confirm-overlay.active,
            .logout-confirm-overlay.active .logout-confirm-dialog {
                animation: none;
            }
        }
    `;

    document.head.appendChild(style);
}

function renderSessionIdentity(user) {
    const displayName = user?.name || user?.username || 'Current User';
    const initials = getInitialsFromName(displayName);

    document.querySelectorAll('.profile .avatar, .profile-mini .avatar').forEach(avatar => {
        avatar.textContent = initials;
    });

    document.querySelectorAll('.profile .profile-name, .profile-mini .profile-name').forEach(name => {
        name.textContent = displayName;
    });
}

async function loadCurrentSessionUser() {
    try {
        const res = await fetch('/api/me');
        const data = await res.json();

        if (!data.success) return null;

        sessionState.user = data.user;
        renderSessionIdentity(data.user);
        return data.user;
    } catch (err) {
        console.error('Failed to load session user:', err);
        return null;
    }
}

function ensureLogoutModal() {
    injectSessionStyles();

    if (document.getElementById('logout-confirm-modal')) return;

    document.body.insertAdjacentHTML('beforeend', `
        <div class="logout-confirm-overlay" id="logout-confirm-modal" aria-hidden="true">
            <div class="logout-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="logout-confirm-title">
                <div class="logout-confirm-header">
                    <div class="logout-alert-icon">!</div>
                    <div>
                        <h2 id="logout-confirm-title">Confirm Logout</h2>
                        <p>End your session</p>
                    </div>
                </div>

                <div class="logout-confirm-body">
                    <div class="logout-session-box">
                        <p>You are about to log out as:</p>
                        <div class="logout-user-card">
                            <div class="logout-user-avatar" id="logout-user-avatar">NA</div>
                            <div>
                                <strong id="logout-user-name">Current User</strong>
                                <span>Current Session</span>
                            </div>
                        </div>
                    </div>

                    <div class="logout-warning">
                        <strong>Warning:</strong> Any unsaved work or pending transactions will be lost.
                        Make sure to complete all transactions before logging out.
                    </div>

                    <p class="logout-confirm-message">
                        Are you sure you want to log out? You will need to sign in again to access the system.
                    </p>
                </div>

                <div class="logout-confirm-actions">
                    <button type="button" class="logout-cancel-btn" id="logout-cancel-btn">Cancel</button>
                    <button type="button" class="logout-confirm-btn" id="logout-confirm-btn">Logout</button>
                </div>
            </div>
        </div>
    `);

    document.getElementById('logout-cancel-btn').addEventListener('click', closeLogoutModal);
    document.getElementById('logout-confirm-btn').addEventListener('click', confirmLogout);
    document.getElementById('logout-confirm-modal').addEventListener('click', event => {
        if (event.target.id === 'logout-confirm-modal') closeLogoutModal();
    });
}

function openLogoutModal() {
    ensureLogoutModal();

    const user = sessionState.user;
    const displayName = user?.name || user?.username || 'Current User';

    document.getElementById('logout-user-avatar').textContent = getInitialsFromName(displayName);
    document.getElementById('logout-user-name').textContent = displayName;

    const modal = document.getElementById('logout-confirm-modal');
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
}

function closeLogoutModal() {
    const modal = document.getElementById('logout-confirm-modal');
    if (!modal) return;

    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
}

async function confirmLogout() {
    try {
        await fetch('/api/logout', { method: 'POST' });
    } catch (err) {
        console.error('Logout failed:', err);
    } finally {
        window.location.href = '/';
    }
}

function bindLogoutButtons() {
    document.querySelectorAll('.logout-nav, .nav-item[aria-label="Logout"]').forEach(button => {
        button.addEventListener('click', event => {
            event.preventDefault();
            openLogoutModal();
        });
    });
}

loadCurrentSessionUser();
bindLogoutButtons();
