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

    const username = document.querySelector('input[name="username"]').value;
    const password = document.querySelector('input[name="password"]').value;

    try {
        const res = await fetch('http://localhost:3000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await res.json();

        if (data.success) {
            if (data.role === 'Manager') {
                window.location.href = '/manager.html';
            } else {
                window.location.href = '/cashier.html';
            }
        } else {
            alert(data.message);
        }

    } catch (err) {
        console.error(err);
        alert('Something went wrong. Please try again.');
    }
});