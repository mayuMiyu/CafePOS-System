//realtime clock UI
const clock = document.getElementById('realtime-clock');
const cashierNav = document.querySelector('.nav');

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

document.querySelectorAll('[data-nav-target]').forEach(button => {
    button.addEventListener('click', () => {
        cashierNav?.style.setProperty('--active-index', button.dataset.navIndex);
        setTimeout(() => {
            window.location.href = button.dataset.navTarget;
        }, 170);
    });
});

//category active detector
const categoryBtns = document.querySelectorAll('.category-btn, .category-all-btn');

categoryBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        categoryBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    });
});
