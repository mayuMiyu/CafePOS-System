//realtime clock UI
const clock = document.getElementById('realtime-clock');
const logoutButton = document.querySelector('.nav-item[aria-label="Logout"]');

function updateClock() {
  const now = new Date();
  clock.textContent = now.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
}

updateClock();
setInterval(updateClock, 1000);

async function logout() {
    try {
        await fetch('/api/logout', { method: 'POST' });
    } catch (err) {
        console.error('Logout failed:', err);
    } finally {
        window.location.href = '/';
    }
}

logoutButton?.addEventListener('click', logout);

//category active detector
const categoryBtns = document.querySelectorAll('.category-btn, .category-all-btn');

categoryBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        categoryBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    });
});
