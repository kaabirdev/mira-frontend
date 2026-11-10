/* Mira status page: deterministic 60-day uptime bars and update subscription form. */
(function () {
  const ANOMALIES = {
    api: [{ day: 38, level: 'warn' }],
    dashboard: [],
    webpush: [{ day: 51, level: 'warn' }],
    fcm: [
      { day: 22, level: 'down' },
      { day: 23, level: 'warn' },
    ],
    apns: [],
    webhooks: [{ day: 44, level: 'warn' }],
  };

  const LABELS = { warn: 'Degraded performance', down: 'Partial outage' };
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function renderTracks() {
    const today = new Date();

    document.querySelectorAll('[data-uptime-track]').forEach((track) => {
      const seed = track.dataset.seed || 'api';
      const days = Number(track.dataset.days || 60);
      const anomalies = ANOMALIES[seed] || [];
      const fragment = document.createDocumentFragment();

      for (let i = 0; i < days; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - (days - 1 - i));
        const anomaly = anomalies.find((entry) => entry.day === i);
        const cell = document.createElement('span');
        cell.className = 'uptime-cell';
        if (anomaly) cell.classList.add('is-' + anomaly.level);
        const label = anomaly ? LABELS[anomaly.level] : 'Operational';
        cell.title =
          date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
          ' — ' +
          label;
        fragment.appendChild(cell);
      }

      track.replaceChildren(fragment);
    });
  }

  function initSubscribe() {
    const form = document.querySelector('[data-status-subscribe]');
    if (!form) return;
    const input = form.querySelector('input[type="email"]');
    const error = document.querySelector('[data-status-error]');

    const showError = (message) => {
      if (!error) return;
      const text = error.querySelector('span');
      if (text) text.textContent = message;
      error.classList.remove('hidden');
      input.setAttribute('aria-invalid', 'true');
    };

    const clearError = () => {
      if (error) error.classList.add('hidden');
      input.removeAttribute('aria-invalid');
    };

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const value = input.value.trim();
      if (!value) {
        showError('Enter the email address to notify.');
        input.focus();
        return;
      }
      if (!EMAIL.test(value)) {
        showError('Enter a valid email address, e.g. you@company.com.');
        input.focus();
        return;
      }
      clearError();
      form.reset();
      window.Mira.toast({
        title: 'Subscription received',
        message: 'Confirm via the email sent to ' + value + '.',
        type: 'success',
      });
    });

    input.addEventListener('input', clearError);
  }

  function initClock() {
    const el = document.querySelector('[data-last-checked]');
    if (!el) return;
    const render = () => {
      el.textContent =
        new Date().toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'UTC',
        }) + ' UTC';
    };
    render();
    window.setInterval(render, 60000);
  }

  function init() {
    renderTracks();
    initSubscribe();
    initClock();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
