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

//eye tracker
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

//JSON data for login 
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
                Manager: '/manager.html'
            };

            const role = data.user?.role || data.role;
            const redirectPath = roleRedirects[role];
            if (!redirectPath) {
                alert('Account role is not supported.');
                return;
            }

            window.location.href = redirectPath;
        } else {
            alert(data.message);
        }

    } catch (err) {
        console.error(err);
        alert('Something went wrong. Please try again.');
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

// Send verification code
document.getElementById('sendCodeBtn').addEventListener('click', async () => {
    const email = document.getElementById('reg-email').value;

    if (!email) return alert('Please enter your email first');

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
        alert(data.message);

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
        alert('Failed to send code');
        btn.disabled = false;
        btn.textContent = 'Send Code';
    }
});

// Register send data
document.getElementById('registerBtn').addEventListener('click', async () => {
    const username = document.getElementById('reg-username').value;
    const fullName = document.getElementById('reg-name').value;
    const password = document.getElementById('reg-password').value;
    const email = document.getElementById('reg-email').value;
    const code = document.getElementById('reg-code').value;

    if (!username || !password || !email || !code) {
        return alert('Please fill in all fields');
    }

    try {
        const res = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, name:fullName, password, email, code })
        });

        const data = await res.json();
        alert(data.message);

        if (data.success) {
            document.getElementById('registerOverlay').classList.remove('active');
        }
    } catch (err) {
        alert('Registration failed. Please try again.');
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

// Send code for forgot password
document.getElementById('forgotSendCodeBtn').addEventListener('click', async () => {
    const email = document.getElementById('forgot-email').value;
    if (!email) return alert('Please enter your email first');

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
        alert(data.message);

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
        alert('Failed to send code');
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
        return alert('Please fill in all fields');
    }

    if (newPassword !== confirmPassword) {
        return alert('Passwords do not match');
    }

    try {
        const res = await fetch('/api/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, code, newPassword })
        });

        const data = await res.json();
        alert(data.message);

        if (data.success) {
            document.getElementById('backToLoginFromForgot').click();
        }
    } catch (err) {
        alert('Reset failed. Please try again.');
    }
});
