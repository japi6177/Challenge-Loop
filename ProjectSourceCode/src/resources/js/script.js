function parseLocalDates() {
  document.querySelectorAll('.local-date').forEach(el => {
    if (el.dataset.date && !el.dataset.formatted) {
      const date = new Date(el.dataset.date);
      el.innerText = date.toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      el.dataset.formatted = "true";
    }
  });
}

// ── Countdown Timers ──────────────────────────────────────────────────────
function formatCountdown(ms) {
  if (ms <= 0) return '00:00:00';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
}

// Track which reminder thresholds have already fired this session
const _reminded = new Set();

function showReminderToast(id, title, level) {
  const key = id + '-' + level;
  if (_reminded.has(key)) return;
  _reminded.add(key);

  const colors = {
    '1h': '#ff3b3b',
    '12h': '#ffaa00',
    '24h': '#caff00'
  };
  const labels = {
    '1h': 'Final Hour!',
    '12h': '12 Hours Left!',
    '24h': '24 Hours Left!'
  };
  const icons = {
    '1h': 'fa-fire',
    '12h': 'fa-hourglass-half',
    '24h': 'fa-clock'
  };

  const container = document.getElementById('toast-container') || (() => {
    const c = document.createElement('div');
    c.id = 'toast-container';
    c.style.cssText = 'position:fixed;bottom:1.5rem;right:1.5rem;z-index:9999;display:flex;flex-direction:column;gap:0.5rem;';
    document.body.appendChild(c);
    return c;
  })();

  const toast = document.createElement('div');
  toast.style.cssText = `background:#1c1c24;border:1px solid ${colors[level]};border-radius:12px;padding:1rem 1.25rem;max-width:320px;box-shadow:0 8px 24px rgba(0,0,0,0.6);display:flex;align-items:center;gap:0.75rem;animation:slideIn 0.3s ease;`;
  toast.innerHTML = `
            <i class="fa-solid ${icons[level]}" style="color:${colors[level]};font-size:1.25rem;flex-shrink:0;"></i>
            <div>
                <div style="font-weight:700;color:${colors[level]};">${labels[level]}</div>
                <div style="font-size:0.85rem;color:rgba(255,255,255,0.6);">${title}</div>
            </div>
            <button onclick="this.parentElement.remove()" style="background:none;border:none;color:rgba(255,255,255,0.4);font-size:1.1rem;margin-left:auto;cursor:pointer;">×</button>
        `;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 8000);
}

function tickCountdowns() {
  document.querySelectorAll('.countdown[data-end]').forEach(el => {
    const endMs = parseInt(el.dataset.end, 10);
    if (!endMs) return;
    const remaining = endMs - Date.now();
    el.textContent = formatCountdown(remaining);

    // Fire live reminder toasts as thresholds are crossed
    const hoursLeft = remaining / (1000 * 60 * 60);
    const id = el.dataset.challengeId || el.closest('[data-challenge-id]')?.dataset.challengeId;
    const title = el.dataset.challengeTitle || '';
    if (id) {
      if (hoursLeft <= 1 && hoursLeft > 0) showReminderToast(id, title, '1h');
      else if (hoursLeft <= 12 && hoursLeft > 1) showReminderToast(id, title, '12h');
      else if (hoursLeft <= 24 && hoursLeft > 12) showReminderToast(id, title, '24h');
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  parseLocalDates();
  tickCountdowns();
  setInterval(tickCountdowns, 1000);
});

document.addEventListener('htmx:afterSwap', () => {
  parseLocalDates();
  tickCountdowns();
});
