/* Mira shared UI: theme, project context, nav, command palette, dialogs, toasts. */
(function () {
  const data = window.MiraData || {};
  const base = window.MIRA_BASE || '';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const Mira = (window.Mira = window.Mira || {});
  Mira.base = base;
  Mira.data = data;
  Mira.projects = data.projects || [];

  /* ---------------- Formatting ---------------- */
  const nf = new Intl.NumberFormat('en-US');
  const fmt = (Mira.fmt = {
    num(value) {
      return nf.format(Number(value) || 0);
    },
    compact(value) {
      const n = Number(value) || 0;
      if (Math.abs(n) < 1000) return String(n);
      const units = [
        [1e9, 'b'],
        [1e6, 'm'],
        [1e3, 'k'],
      ];
      for (const [size, suffix] of units) {
        if (Math.abs(n) >= size) {
          const out = (n / size).toFixed(1).replace(/\.0$/, '');
          return out + suffix;
        }
      }
      return String(n);
    },
    pct(value, digits) {
      return Number(value).toFixed(digits == null ? 1 : digits) + '%';
    },
    ago(iso) {
      if (!iso) return '—';
      const diff = Date.now() - new Date(iso).getTime();
      if (diff < 45000) return 'just now';
      const mins = Math.round(diff / 60000);
      if (mins < 60) return mins + 'm ago';
      const hours = Math.round(mins / 60);
      if (hours < 24) return hours + 'h ago';
      const days = Math.round(hours / 24);
      if (days < 30) return days + 'd ago';
      return fmt.date(iso);
    },
    date(iso) {
      return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    },
    shortDate(iso) {
      return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    },
    dateTime(iso) {
      return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
    },
    time(iso) {
      return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    },
  });

  Mira.escape = function (value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
  };

  /* ---------------- Badges ---------------- */
  const STATUS = {
    active: ['success', 'Active'],
    completed: ['success', 'Completed'],
    accepted: ['success', 'Accepted'],
    processing: ['info', 'Processing'],
    queued: ['neutral', 'Queued'],
    pending: ['warning', 'Pending'],
    failed: ['danger', 'Failed'],
    expired: ['warning', 'Expired'],
    unsubscribed: ['neutral', 'Unsubscribed'],
    revoked: ['danger', 'Revoked'],
    disabled: ['neutral', 'Disabled'],
    live: ['success', 'Live'],
    test: ['warning', 'Test'],
    scheduled: ['info', 'Scheduled'],
    error: ['danger', 'Error'],
  };

  Mira.statusBadge = function (status, label) {
    const entry = STATUS[status] || ['neutral', status ? status[0].toUpperCase() + status.slice(1) : '—'];
    return `<span class="badge badge-${entry[0]}"><span class="dot"></span>${Mira.escape(label || entry[1])}</span>`;
  };

  Mira.platformBadge = function (platform) {
    const map = {
      web: ['globe', 'Web'],
      android: ['smartphone', 'Android'],
      ios: ['apple', 'iOS'],
    };
    const entry = map[platform] || ['globe', platform || '—'];
    return `<span class="badge badge-outline"><i data-lucide="${entry[0]}" class="size-3"></i>${entry[1]}</span>`;
  };

  /* ---------------- Theme ---------------- */
  Mira.themeMode = localStorage.getItem('mira-theme') || 'system';

  Mira.applyTheme = function (mode) {
    const dark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    document.documentElement.dataset.themeMode = mode;
    Mira.themeMode = mode;
    document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
      meta.content = dark ? '#080d17' : '#ffffff';
    });
  };

  Mira.setTheme = function (mode) {
    try {
      localStorage.setItem('mira-theme', mode);
    } catch (e) {}
    Mira.applyTheme(mode);
    window.dispatchEvent(new CustomEvent('mira:theme', { detail: mode }));
  };

  Mira.toggleTheme = function () {
    const isDark = document.documentElement.dataset.theme === 'dark';
    Mira.setTheme(isDark ? 'light' : 'dark');
  };

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (Mira.themeMode === 'system') Mira.applyTheme('system');
  });

  /* ---------------- Project context ---------------- */
  Mira.activeProject = function () {
    const id = localStorage.getItem('mira-project');
    return Mira.projects.find((p) => p.id === id) || Mira.projects[0] || {};
  };

  Mira.syncProjectUI = function (project) {
    document.querySelectorAll('.js-project-name').forEach((el) => (el.textContent = project.name || ''));
    document.querySelectorAll('.js-quota-used').forEach((el) => (el.textContent = fmt.num(project.usedToday)));
    document.querySelectorAll('.js-quota-limit').forEach((el) => (el.textContent = fmt.num(project.dailyLimit)));
    const pct = project.dailyLimit ? Math.min(100, Math.round((project.usedToday / project.dailyLimit) * 100)) : 0;
    document.querySelectorAll('.js-quota-percent').forEach((el) => (el.textContent = pct));
    document.querySelectorAll('.js-quota-fill').forEach((el) => (el.style.width = pct + '%'));
    document.querySelectorAll('#sidebar-quota-bar').forEach((el) => el.setAttribute('aria-valuenow', String(pct)));
  };

  Mira.setProject = function (id) {
    const project = Mira.projects.find((p) => p.id === id);
    if (!project) return;
    try {
      localStorage.setItem('mira-project', id);
    } catch (e) {}
    Mira.syncProjectUI(project);
    window.dispatchEvent(new CustomEvent('mira:project', { detail: project }));
    Mira.toast({ title: 'Project switched', message: project.name + ' · ' + project.env + ' environment', type: 'info' });
  };

  /* ---------------- Toasts ---------------- */
  Mira.toast = function ({ title, message, type = 'success', duration = 4200 }) {
    const region = document.getElementById('toast-region');
    if (!region) return;
    const icons = { success: 'circle-check', error: 'circle-alert', warning: 'triangle-alert', info: 'info' };
    const tones = {
      success: 'bg-success-soft text-success',
      error: 'bg-danger-soft text-danger',
      warning: 'bg-warning-soft text-warning',
      info: 'bg-info-soft text-info',
    };
    const el = document.createElement('div');
    el.className = 'toast';
    el.setAttribute('role', type === 'error' ? 'alert' : 'status');
    el.innerHTML = `
      <span class="toast-icon ${tones[type] || tones.success}"><i data-lucide="${icons[type] || icons.success}" class="size-4"></i></span>
      <div class="min-w-0 flex-1 pt-0.5">
        <p class="text-[13px] font-semibold leading-5 text-ink">${Mira.escape(title || '')}</p>
        ${message ? `<p class="mt-0.5 text-[12px] leading-5 text-sub">${Mira.escape(message)}</p>` : ''}
      </div>
      <button type="button" class="btn btn-ghost btn-icon !size-7 !rounded-md" aria-label="Dismiss notification">
        <i data-lucide="x" class="size-3.5"></i>
      </button>`;
    region.appendChild(el);
    if (window.lucide) window.lucide.createIcons();
    const remove = () => {
      if (!el.isConnected) return;
      el.style.opacity = '0';
      el.style.transform = 'translateY(6px)';
      el.style.transition = 'opacity .15s, transform .15s';
      window.setTimeout(() => el.remove(), 160);
    };
    el.querySelector('button').addEventListener('click', remove);
    window.setTimeout(remove, duration);
  };

  /* ---------------- Dialogs ---------------- */
  Mira.openDialog = function (id) {
    const dialog = typeof id === 'string' ? document.getElementById(id) : id;
    if (!dialog) return null;
    if (!dialog.open) dialog.showModal();
    const autofocus = dialog.querySelector('[data-autofocus]');
    if (autofocus) window.setTimeout(() => autofocus.focus(), 30);
    return dialog;
  };

  Mira.closeDialog = function (id) {
    const dialog = typeof id === 'string' ? document.getElementById(id) : id;
    if (dialog && dialog.open) dialog.close();
  };

  Mira.reopenFocus = function (dialog) {
    const trigger = dialog && dialog._trigger;
    if (trigger && trigger.isConnected) trigger.focus();
  };

  Mira.confirm = function ({ title, message, confirmLabel = 'Confirm', tone = 'danger', onConfirm }) {
    let dialog = document.getElementById('mira-confirm');
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.id = 'mira-confirm';
      dialog.className = 'modal max-w-md';
      dialog.innerHTML = `
        <form method="dialog" class="p-0">
          <div class="modal-header">
            <div class="flex items-start gap-3">
              <span class="grid size-9 shrink-0 place-items-center rounded-lg bg-danger-soft text-danger"><i data-lucide="alert-triangle" class="size-[18px]"></i></span>
              <div>
                <h2 class="text-[15px] font-semibold text-ink" data-confirm-title>Are you sure?</h2>
                <p class="mt-1 text-[13px] leading-relaxed text-sub" data-confirm-message></p>
              </div>
            </div>
            <button type="button" class="btn btn-ghost btn-icon !size-8" data-dialog-close aria-label="Close dialog"><i data-lucide="x" class="size-4"></i></button>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary btn-sm" data-dialog-close>Cancel</button>
            <button type="button" class="btn btn-danger btn-sm" data-confirm-action></button>
          </div>
        </form>`;
      document.body.appendChild(dialog);
      if (window.lucide) window.lucide.createIcons();
    }
    dialog.querySelector('[data-confirm-title]').textContent = title || 'Are you sure?';
    dialog.querySelector('[data-confirm-message]').textContent = message || '';
    const action = dialog.querySelector('[data-confirm-action]');
    action.textContent = confirmLabel;
    action.className = `btn btn-sm ${tone === 'danger' ? 'btn-danger' : 'btn-primary'}`;
    action.onclick = () => {
      dialog.close();
      if (onConfirm) onConfirm();
    };
    Mira.openDialog(dialog);
  };

  /* ---------------- Copy ---------------- */
  Mira.copy = async function (text, trigger) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
      }
      if (trigger) {
        const original = trigger.innerHTML;
        trigger.innerHTML = '<span class="inline-flex items-center gap-1.5"><svg xmlns="http://www.w3.org/2000/svg" class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>Copied</span>';
        window.setTimeout(() => (trigger.innerHTML = original), 1600);
      }
      Mira.toast({ title: 'Copied to clipboard', type: 'success', duration: 2200 });
    } catch (e) {
      Mira.toast({ title: 'Could not copy', message: 'Select the text and copy it manually.', type: 'error' });
    }
  };

  /* ---------------- Navigation & shell ---------------- */
  function initNav() {
    const page = document.body.dataset.page;
    if (page) {
      document.querySelectorAll('[data-nav]').forEach((link) => {
        if (link.dataset.nav === page) link.setAttribute('aria-current', 'page');
      });
    }
    const title = document.body.dataset.title;
    const titleEl = document.getElementById('page-title');
    if (titleEl && title) titleEl.textContent = title;
    document.querySelectorAll('.js-year').forEach((el) => (el.textContent = new Date().getFullYear()));
    Mira.syncProjectUI(Mira.activeProject());
  }

  function initSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (!sidebar) return;
    const openers = document.querySelectorAll('[data-sidebar-open]');
    const closers = document.querySelectorAll('[data-sidebar-close]');
    const setOpen = (open) => {
      sidebar.classList.toggle('-translate-x-full', !open);
      if (overlay) overlay.classList.toggle('hidden', !open);
      openers.forEach((btn) => btn.setAttribute('aria-expanded', String(open)));
      document.body.classList.toggle('overflow-hidden', open && window.innerWidth < 1024);
    };
    openers.forEach((btn) => btn.addEventListener('click', () => setOpen(true)));
    closers.forEach((btn) => btn.addEventListener('click', () => setOpen(false)));
    if (overlay) overlay.addEventListener('click', () => setOpen(false));
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !sidebar.classList.contains('-translate-x-full') && window.innerWidth < 1024) setOpen(false);
    });
    window.addEventListener('resize', () => {
      if (window.innerWidth >= 1024) {
        sidebar.classList.remove('-translate-x-full');
        if (overlay) overlay.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
      } else {
        sidebar.classList.add('-translate-x-full');
      }
    });
    if (window.innerWidth < 1024) sidebar.classList.add('-translate-x-full');
  }

  function initReveal() {
    const els = document.querySelectorAll('[data-reveal]');
    if (!els.length) return;
    if (reduceMotion.matches || !('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('is-revealed'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const delay = Number(entry.target.dataset.revealDelay || 0);
            window.setTimeout(() => entry.target.classList.add('is-revealed'), delay);
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
    );
    els.forEach((el) => io.observe(el));
  }

  function initCopyButtons() {
    document.addEventListener('click', (e) => {
      const trigger = e.target.closest('[data-copy], [data-copy-target]');
      if (!trigger) return;
      let text = trigger.dataset.copy;
      if (trigger.dataset.copyTarget) {
        const target = document.querySelector(trigger.dataset.copyTarget);
        text = target ? target.textContent : '';
      }
      if (!text) return;
      Mira.copy(text, trigger);
    });
  }

  function initDialogBehavior() {
    document.addEventListener('click', (e) => {
      const closer = e.target.closest('[data-dialog-close]');
      if (closer) {
        const dialog = closer.closest('dialog');
        if (dialog) dialog.close();
      }
      const dialog = e.target.closest('dialog');
      if (dialog && e.target === dialog) {
        const rect = dialog.getBoundingClientRect();
        const outside = e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom;
        if (outside) dialog.close();
      }
    });
    document.querySelectorAll('dialog').forEach((dialog) => {
      dialog.addEventListener('close', () => Mira.reopenFocus(dialog));
    });
  }

  /* ---------------- Command palette ---------------- */
  function initPalette() {
    const dialog = document.getElementById('command-palette');
    if (!dialog) return;
    const input = document.getElementById('palette-input');
    const results = document.getElementById('palette-results');
    if (!input || !results) return;

    const pages = [
      { label: 'Overview', group: 'Page', icon: 'layout-dashboard', href: 'app/index.html', keys: 'dashboard home stats' },
      { label: 'Projects', group: 'Page', icon: 'folder-kanban', href: 'app/projects.html', keys: 'environments switch' },
      { label: 'Subscribers', group: 'Page', icon: 'users', href: 'app/subscribers.html', keys: 'audience devices' },
      { label: 'Notifications', group: 'Page', icon: 'bell', href: 'app/notifications.html', keys: 'send campaigns' },
      { label: 'Delivery logs', group: 'Page', icon: 'list-checks', href: 'app/deliveries.html', keys: 'attempts errors providers' },
      { label: 'Analytics', group: 'Page', icon: 'chart-no-axes-combined', href: 'app/analytics.html', keys: 'charts trends usage' },
      { label: 'API keys', group: 'Page', icon: 'key-round', href: 'app/api-keys.html', keys: 'secret publishable tokens' },
      { label: 'Webhooks', group: 'Page', icon: 'webhook', href: 'app/webhooks.html', keys: 'events endpoints signatures' },
      { label: 'Usage & billing', group: 'Page', icon: 'gauge', href: 'app/usage.html', keys: 'quota plan invoice' },
      { label: 'Settings', group: 'Page', icon: 'settings', href: 'app/settings.html', keys: 'profile password 2fa theme' },
      { label: 'Documentation', group: 'Resource', icon: 'book-open', href: 'docs.html', keys: 'api reference guides' },
      { label: 'Send a notification', group: 'Action', icon: 'send', href: 'app/notifications.html?compose=1', keys: 'compose push' },
      { label: 'Create an API key', group: 'Action', icon: 'plus', href: 'app/api-keys.html?create=1', keys: 'generate token' },
      { label: 'Add a webhook endpoint', group: 'Action', icon: 'plus', href: 'app/webhooks.html?create=1', keys: 'register' },
      { label: 'Create a project', group: 'Action', icon: 'plus', href: 'app/projects.html?create=1', keys: 'new environment' },
    ];

    let items = [];
    let selected = 0;

    const render = () => {
      const q = input.value.trim().toLowerCase();
      items = pages.filter((p) => !q || (p.label + ' ' + p.keys).toLowerCase().includes(q));
      if (!items.length) {
        results.innerHTML = `<div class="px-3 py-8 text-center"><p class="text-[13px] font-medium text-ink">No results for “${Mira.escape(input.value)}”</p><p class="mt-1 text-xs text-muted">Try “subscribers”, “webhook” or “docs”.</p></div>`;
        input.removeAttribute('aria-activedescendant');
        return;
      }
      selected = Math.min(selected, items.length - 1);
      results.innerHTML = items
        .map(
          (item, i) => `
        <button type="button" class="palette-item" role="option" id="palette-opt-${i}" data-index="${i}" aria-selected="${i === selected}">
          <i data-lucide="${item.icon}" class="size-4 shrink-0 ${item.group === 'Action' ? 'text-link' : 'text-muted'}"></i>
          <span class="flex-1">${Mira.escape(item.label)}</span>
          <span class="text-[10.5px] uppercase tracking-wider text-muted">${item.group}</span>
        </button>`
        )
        .join('');
      if (window.lucide) window.lucide.createIcons();
      const active = results.querySelector('[aria-selected="true"]');
      if (active) input.setAttribute('aria-activedescendant', active.id);
    };

    const go = (item) => {
      if (!item) return;
      dialog.close();
      window.location.href = base + item.href;
    };

    const open = (trigger) => {
      dialog._trigger = trigger || document.activeElement;
      input.value = '';
      selected = 0;
      render();
      Mira.openDialog(dialog);
      window.setTimeout(() => input.focus(), 40);
    };

    document.querySelectorAll('[data-palette-open]').forEach((btn) => btn.addEventListener('click', () => open(btn)));
    window.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (dialog.open) dialog.close();
        else open(document.activeElement);
      }
      if (e.key === '/' && !dialog.open) {
        const tag = (document.activeElement && document.activeElement.tagName) || '';
        if (!['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) {
          e.preventDefault();
          open(document.activeElement);
        }
      }
    });

    input.addEventListener('input', () => {
      selected = 0;
      render();
    });

    input.addEventListener('keydown', (e) => {
      if (!items.length) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selected = (selected + 1) % items.length;
        render();
        results.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selected = (selected - 1 + items.length) % items.length;
        render();
        results.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        go(items[selected]);
      }
    });

    results.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-index]');
      if (btn) go(items[Number(btn.dataset.index)]);
    });

    results.addEventListener('mousemove', (e) => {
      const btn = e.target.closest('[data-index]');
      if (!btn) return;
      const idx = Number(btn.dataset.index);
      if (idx !== selected) {
        selected = idx;
        results.querySelectorAll('[data-index]').forEach((el) => el.setAttribute('aria-selected', String(Number(el.dataset.index) === idx)));
        input.setAttribute('aria-activedescendant', 'palette-opt-' + idx);
      }
    });

    if (input) input.setAttribute('aria-controls', 'palette-results');
  }

  function initKbdLabels() {
    const isMac = /Mac|iPhone|iPad/.test(navigator.platform || '');
    document.querySelectorAll('.js-kbd').forEach((el) => (el.textContent = isMac ? '⌘ K' : 'Ctrl K'));
  }

  function initThemeToggles() {
    document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
      btn.addEventListener('click', () => Mira.toggleTheme());
    });
  }

  function initTableHints() {
    document.querySelectorAll('.table-wrap').forEach((wrap) => {
      if (wrap.dataset.hintReady) return;
      wrap.dataset.hintReady = '1';
      const hint = document.createElement('p');
      hint.className = 'table-hint';
      hint.innerHTML = '<i data-lucide="move-horizontal" class="size-3.5 shrink-0" aria-hidden="true"></i><span>Scroll sideways to see every column</span>';
      wrap.before(hint);
      const sync = () => hint.classList.toggle('hidden', wrap.scrollWidth <= wrap.clientWidth + 2);
      wrap.addEventListener('scroll', sync, { passive: true });
      window.addEventListener('resize', sync);
      sync();
    });
    if (window.lucide) window.lucide.createIcons();
  }

  function init() {
    initNav();
    initSidebar();
    initReveal();
    initCopyButtons();
    initDialogBehavior();
    initPalette();
    initKbdLabels();
    initThemeToggles();
    initTableHints();
    if (window.lucide) window.lucide.createIcons();
    document.querySelectorAll('dialog').forEach((dialog) => {
      if (!dialog._bound) {
        dialog._bound = true;
        dialog.addEventListener('close', () => Mira.reopenFocus(dialog));
      }
    });
  }

  Mira.onReady = function (fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
    else fn();
  };

  Mira.onReady(init);
})();
