const donut = document.getElementById('donut');
const donutWrapper = document.getElementById('donut-wrapper');
const eyeLeft = document.getElementById('lefteye');
const eyeRight = document.getElementById('righteye');
const loginIntro = document.getElementById('loginIntro');

function finishLoginIntro() {
    document.body.classList.add('intro-revealing');
    setTimeout(() => {
        loginIntro?.classList.add('is-finished');
        document.body.classList.remove('intro-running');
    }, 720);
    setTimeout(() => {
        loginIntro?.remove();
        document.body.classList.remove('intro-revealing');
    }, 1500);
}

if (loginIntro) {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
        finishLoginIntro();
    } else {
        setTimeout(finishLoginIntro, 4720);
    }
}

const MAX_OFFSET = 2.6;

document.addEventListener('mousemove', (event) => {
    if (!donut || !donutWrapper || !eyeLeft || !eyeRight) return;
    const rect = donut.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = event.clientX - cx;
    const dy = event.clientY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const offsetX = (dx / dist) * MAX_OFFSET;
    const offsetY = (dy / dist) * MAX_OFFSET;
    donutWrapper.style.setProperty('--eye-offset-x', `${offsetX}px`);
    donutWrapper.style.setProperty('--eye-offset-y', `${offsetY}px`);
});

document.addEventListener('mouseleave', () => {
    donutWrapper?.style.setProperty('--eye-offset-x', '0px');
    donutWrapper?.style.setProperty('--eye-offset-y', '0px');
});

// Toast
function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('fade-out');
        toast.addEventListener('animationend', () => toast.remove());
    }, duration);
}

// Login
document.querySelector('.form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.querySelector('input[name="username"]').value.trim();
    const password = document.querySelector('input[name="password"]').value;

    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await res.json();

        if (data.success) {
            const roleRedirects = {
                Cashier: '/cashier.html',
                Manager: '/manager.html',
                Kitchen: '/kitchen.html'
            };
            const role = data.user?.role || data.role;
            const redirectPath = roleRedirects[role];
            if (!redirectPath) {
                showToast('Account role is not supported.', 'error');
                return;
            }
            window.location.href = redirectPath;
        } else {
            showToast(data.message, 'error');
        }
    } catch (err) {
        console.error(err);
        showToast('Something went wrong. Please try again.', 'error');
    }
});

// Open register overlay
document.querySelector('.form h5 a').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('registerOverlay').classList.add('active');
});

// Close register overlay
document.getElementById('closeRegister').addEventListener('click', () => {
    const card = document.getElementById('registerCard');
    card.style.animation = 'slideDownFade 0.3s ease forwards';
    setTimeout(() => {
        document.getElementById('registerOverlay').classList.remove('active');
        card.style.animation = '';
    }, 300);
});

// Send verification code (register)
document.getElementById('sendCodeBtn').addEventListener('click', async () => {
    const email = document.getElementById('reg-email').value;
    if (!email) return showToast('Please enter your email first.', 'error');

    const btn = document.getElementById('sendCodeBtn');
    btn.disabled = true;
    btn.textContent = 'Sending...';

    try {
        const res = await fetch('/api/send-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        const data = await res.json();
        showToast(data.message, data.success ? 'success' : 'error');

        if (data.success) {
            let seconds = 60;
            const interval = setInterval(() => {
                btn.textContent = `Resend (${seconds}s)`;
                seconds--;
                if (seconds < 0) {
                    clearInterval(interval);
                    btn.disabled = false;
                    btn.textContent = 'Send Code';
                }
            }, 1000);
        } else {
            btn.disabled = false;
            btn.textContent = 'Send Code';
        }
    } catch (err) {
        showToast('Failed to send code.', 'error');
        btn.disabled = false;
        btn.textContent = 'Send Code';
    }
});

// Register
document.getElementById('registerBtn').addEventListener('click', async () => {
    const username = document.getElementById('reg-username').value;
    const fullName = document.getElementById('reg-name').value;
    const password = document.getElementById('reg-password').value;
    const email = document.getElementById('reg-email').value;
    const code = document.getElementById('reg-code').value;

    if (!username || !password || !email || !code) {
        return showToast('Please fill in all fields.', 'error');
    }

    try {
        const res = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, name: fullName, password, email, code })
        });

        const data = await res.json();
        showToast(data.message, data.success ? 'success' : 'error');

        if (data.success) {
            const card = document.getElementById('registerCard');
            card.style.animation = 'slideDownFade 0.3s ease forwards';
            setTimeout(() => {
                document.getElementById('registerOverlay').classList.remove('active');
                card.style.animation = '';
            }, 300);
        }
    } catch (err) {
        showToast('Registration failed. Please try again.', 'error');
    }
});

// Open forgot
document.querySelector('.form h4 a').addEventListener('click', (e) => {
    e.preventDefault();
    const loginContent = document.getElementById('LoginFormContent');
    const forgotCard = document.getElementById('forgotCard');
    loginContent.style.opacity = '0';
    loginContent.style.pointerEvents = 'none';
    setTimeout(() => {
        forgotCard.style.opacity = '1';
        forgotCard.style.pointerEvents = 'all';
    }, 400);
});

// Back to login
document.getElementById('backToLoginFromForgot').addEventListener('click', (e) => {
    e.preventDefault();
    const loginContent = document.getElementById('LoginFormContent');
    const forgotCard = document.getElementById('forgotCard');
    forgotCard.style.opacity = '0';
    forgotCard.style.pointerEvents = 'none';
    setTimeout(() => {
        loginContent.style.opacity = '1';
        loginContent.style.pointerEvents = 'all';
    }, 400);
});

// Send code (forgot password)
document.getElementById('forgotSendCodeBtn').addEventListener('click', async () => {
    const email = document.getElementById('forgot-email').value;
    if (!email) return showToast('Please enter your email first.', 'error');

    const btn = document.getElementById('forgotSendCodeBtn');
    btn.disabled = true;
    btn.textContent = 'Sending...';

    try {
        const res = await fetch('/api/send-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        const data = await res.json();
        showToast(data.message, data.success ? 'success' : 'error');

        if (data.success) {
            let seconds = 60;
            const interval = setInterval(() => {
                btn.textContent = `Resend (${seconds}s)`;
                seconds--;
                if (seconds < 0) {
                    clearInterval(interval);
                    btn.disabled = false;
                    btn.textContent = 'Send Code';
                }
            }, 1000);
        } else {
            btn.disabled = false;
            btn.textContent = 'Send Code';
        }
    } catch (err) {
        showToast('Failed to send code.', 'error');
        btn.disabled = false;
        btn.textContent = 'Send Code';
    }
});

// Reset password
document.getElementById('resetPasswordBtn').addEventListener('click', async () => {
    const email = document.getElementById('forgot-email').value;
    const code = document.getElementById('forgot-code').value;
    const newPassword = document.getElementById('forgot-newpassword').value;
    const confirmPassword = document.getElementById('forgot-confirmpassword').value;

    if (!email || !code || !newPassword || !confirmPassword) {
        return showToast('Please fill in all fields.', 'error');
    }

    if (newPassword !== confirmPassword) {
        return showToast('Passwords do not match.', 'error');
    }

    try {
        const res = await fetch('/api/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, code, newPassword })
        });

        const data = await res.json();
        showToast(data.message, data.success ? 'success' : 'error');

        if (data.success) {
            document.getElementById('backToLoginFromForgot').click();
        }
    } catch (err) {
        showToast('Reset failed. Please try again.', 'error');
    }
});
