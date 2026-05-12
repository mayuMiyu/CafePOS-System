const donut = document.getElementById('donut');
const eyeLeft = document.getElementById('lefteye');
const eyeRight = document.getElementById('righteye');

const MAX_OFFSET = 3.45;

const LEFT_EYE_X = 0.663;
const LEFT_EYE_Y = 0.387;
const RIGHT_EYE_X = 0.739;
const RIGHT_EYE_Y = 0.385;

//eye config
function positionEyes() {
    const rect = donut.getBoundingClientRect();
    
    const leftX = rect.left + rect.width * LEFT_EYE_X;
    const leftY = rect.top + rect.height * LEFT_EYE_Y;
    const rightX = rect.left + rect.width * RIGHT_EYE_X;
    const rightY = rect.top + rect.height * RIGHT_EYE_Y;

    eyeLeft.style.position = 'fixed';
    eyeLeft.style.left = leftX + 'px';
    eyeLeft.style.top = leftY + 'px';

    eyeRight.style.position = 'fixed';
    eyeRight.style.left = rightX + 'px';
    eyeRight.style.top = rightY + 'px';
}

positionEyes();
window.addEventListener('resize', positionEyes);

let baseLeftLeft, baseLeftTop, baseRightLeft, baseRightTop;

function updateBase() {
    baseLeftLeft = parseFloat(eyeLeft.style.left);
    baseLeftTop = parseFloat(eyeLeft.style.top);
    baseRightLeft = parseFloat(eyeRight.style.left);
    baseRightTop = parseFloat(eyeRight.style.top);
}

updateBase();
window.addEventListener('resize', updateBase);

//eye tracker
document.addEventListener('mousemove', (event) => {
    const rect = donut.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const dx = event.clientX - cx;
    const dy = event.clientY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;

    const offsetX = (dx / dist) * MAX_OFFSET;
    const offsetY = (dy / dist) * MAX_OFFSET;

    eyeLeft.style.left = (baseLeftLeft + offsetX) + 'px';
    eyeLeft.style.top = (baseLeftTop + offsetY) + 'px';
    eyeRight.style.left = (baseRightLeft + offsetX) + 'px';
    eyeRight.style.top = (baseRightTop + offsetY) + 'px';
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
