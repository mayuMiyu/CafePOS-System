//realtime clock UI
  const clock = document.getElementById('realtime-clock');

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
