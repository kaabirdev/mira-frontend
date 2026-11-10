/* Mira dashboard behaviour. Demo data is read from window.MiraData and
   shaped like the REST API responses so it can be swapped for fetch calls. */
(function () {
  const D = window.MiraData;
  const Mira = window.Mira;
  if (!D || !Mira) return;

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const base = window.MIRA_BASE || '';
  const icons = () => window.lucide && window.lucide.createIcons();
  const PLATFORM_LABEL = { web: 'Web Push', android: 'Android · FCM', ios: 'iOS · APNs' };

  function esc(value) {
    return Mira.escape(value);
  }

  function randomId(prefix, length = 10) {
    let out = '';
    const chars = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
    for (let i = 0; i < length; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return prefix + out;
  }

  function setError(fieldId, show) {
    const err = document.querySelector(`[data-error-for="${fieldId}"]`);
    if (err) err.classList.toggle('hidden', !show);
    const field = document.getElementById(fieldId);
    if (field) {
      const wrap = field.closest('div');
      if (wrap) wrap.classList.toggle('field-error', !!show);
      field.setAttribute('aria-invalid', show ? 'true' : 'false');
    }
  }

  const ERROR_FOCUS = {
    'key-scopes': '#key-dialog input[name="scope"]:not(:disabled)',
    'webhook-events': '#webhook-dialog input[name="event"]',
  };

  function moveFocus(fieldId) {
    if (!fieldId) return;
    const selector = ERROR_FOCUS[fieldId];
    const el = document.getElementById(fieldId) || (selector ? $(selector) : null);
    if (!el) return;
    el.focus();
  }

  function focusFirstInvalid(fieldIds) {
    const next = fieldIds.filter(Boolean).find((id) => {
      const err = document.querySelector(`[data-error-for="${id}"]`);
      return err && !err.classList.contains('hidden');
    });
    moveFocus(next);
  }

  function setBusy(button, busy, label) {
    if (!button) return;
    if (busy) {
      button.dataset.original = button.innerHTML;
      button.disabled = true;
      button.innerHTML = `<i data-lucide="loader-2" class="size-4 animate-spin"></i>${label || 'Working…'}`;
    } else {
      button.disabled = false;
      if (button.dataset.original) button.innerHTML = button.dataset.original;
    }
    icons();
  }

  function afterBusy(button, fn, delay = 650) {
    setBusy(button, true);
    window.setTimeout(() => {
      setBusy(button, false);
      if (fn) fn();
    }, delay);
  }

  function download(filename, text) {
    const blob = new Blob(['\uFEFF' + text], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
  }

  function csv(headers, rows) {
    const cell = (v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
    return [headers.map(cell).join(','), ...rows.map((row) => row.map(cell).join(','))].join('\r\n');
  }

  function openDialogFor(selector) {
    const dialog = document.querySelector(selector);
    if (dialog) {
      dialog._trigger = document.activeElement;
      Mira.openDialog(dialog);
    }
  }

  /* ---------------- Generic data table ---------------- */
  class DataTable {
    constructor(options) {
      this.options = options;
      this.tbody = typeof options.tbody === 'string' ? $(options.tbody) : options.tbody;
      this.table = this.tbody.closest('table');
      this.search = options.searchInput ? $(options.searchInput) : null;
      this.countEl = options.countEl ? $(options.countEl) : null;
      this.paginationEl = options.paginationEl ? $(options.paginationEl) : null;
      this.data = options.data || [];
      this.page = 1;
      this.pageSize = options.pageSize || 10;
      this.sortKey = options.sortKey || null;
      this.sortDir = options.sortDir || 'desc';
      this.view = [];
      this.bind();
      this.refresh();
    }

    bind() {
      if (this.search) {
        this.search.addEventListener('input', () => {
          this.page = 1;
          this.refresh();
        });
      }
      $$('[data-filter]').forEach((select) => {
        select.addEventListener('change', () => {
          this.page = 1;
          this.refresh();
        });
      });
      $$('[data-clear-filters]').forEach((btn) => {
        btn.addEventListener('click', () => {
          if (this.search) this.search.value = '';
          $$('[data-filter]').forEach((select) => (select.value = ''));
          this.page = 1;
          this.refresh();
        });
      });
      $$('[data-sort]', this.table).forEach((btn) => {
        btn.addEventListener('click', () => {
          const key = btn.dataset.sort;
          if (this.sortKey === key) this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
          else {
            this.sortKey = key;
            this.sortDir = 'asc';
          }
          this.page = 1;
          this.refresh();
        });
      });
      if (this.paginationEl) {
        this.paginationEl.addEventListener('click', (e) => {
          const btn = e.target.closest('[data-page]');
          if (!btn) return;
          const page = Number(btn.dataset.page);
          if (!page || page < 1) return;
          this.page = page;
          this.refresh();
          this.tbody.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        });
      }
      this.tbody.addEventListener('click', (e) => {
        const rowEl = e.target.closest('tr[data-id]');
        if (!rowEl) return;
        const row = this.data.find((r) => String(r.id) === rowEl.dataset.id);
        if (!row) return;
        if (e.target.closest('a, button, input, select')) {
          if (this.options.onAction) this.options.onAction(e, row);
          return;
        }
        if (this.options.onRowClick) this.options.onRowClick(row, e);
      });
    }

    setData(data) {
      this.data = data;
      this.page = 1;
      this.refresh();
    }

    refresh() {
      const q = this.search ? this.search.value.trim().toLowerCase() : '';
      const filters = $$('[data-filter]').filter((f) => f.value);
      let rows = this.data.slice();

      if (q) {
        rows = rows.filter((row) => {
          const text = this.options.searchText ? this.options.searchText(row) : JSON.stringify(row);
          return String(text).toLowerCase().includes(q);
        });
      }

      filters.forEach((select) => {
        const key = select.dataset.filter;
        const value = select.value;
        rows = rows.filter((row) => String(row[key] == null ? '' : row[key]) === value);
      });

      if (this.sortKey) {
        const key = this.sortKey;
        const dir = this.sortDir === 'asc' ? 1 : -1;
        const accessor = this.options.sortValue || ((row) => row[key]);
        rows.sort((a, b) => {
          const av = accessor(a, key);
          const bv = accessor(b, key);
          if (av == null && bv == null) return 0;
          if (av == null) return 1;
          if (bv == null) return -1;
          if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
          return String(av).localeCompare(String(bv)) * dir;
        });
      }

      this.view = rows;
      const totalPages = Math.max(1, Math.ceil(rows.length / this.pageSize));
      this.page = Math.min(this.page, totalPages);
      const start = (this.page - 1) * this.pageSize;
      const pageRows = rows.slice(start, start + this.pageSize);

      if (this.countEl) this.countEl.textContent = `${rows.length} result${rows.length === 1 ? '' : 's'}`;

      if (!pageRows.length) {
        const empty = this.options.empty || {};
        this.tbody.innerHTML = `
          <tr><td colspan="${this.options.columns.length}">
            <div class="empty-state">
              <span class="empty-icon"><i data-lucide="${empty.icon || 'search-x'}" class="size-5"></i></span>
              <p class="text-[13px] font-medium text-ink">${esc(empty.title || 'No results')}</p>
              <p class="mt-1 max-w-xs text-[11.5px] leading-relaxed text-muted">${esc(empty.message || 'Try adjusting your search or filters.')}</p>
              <button type="button" class="btn btn-secondary btn-sm mt-4" data-clear-filters>Clear filters</button>
            </div>
          </td></tr>`;
        const clear = $('[data-clear-filters]', this.tbody);
        if (clear) {
          clear.addEventListener('click', () => {
            if (this.search) this.search.value = '';
            $$('[data-filter]').forEach((select) => (select.value = ''));
            this.page = 1;
            this.refresh();
          });
        }
      } else {
        this.tbody.innerHTML = pageRows
          .map((row, i) => {
            const cells = this.options.columns
              .map((col) => `<td class="${col.className || ''}">${col.render(row, start + i)}</td>`)
              .join('');
            return `<tr data-id="${esc(row.id)}" class="${this.options.onRowClick ? 'cursor-pointer' : ''}">${cells}</tr>`;
          })
          .join('');
      }

      if (this.paginationEl) {
        const from = rows.length ? start + 1 : 0;
        const to = Math.min(start + this.pageSize, rows.length);
        this.paginationEl.innerHTML = `
          <div class="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-3">
            <p class="text-[11.5px] text-muted">Showing <span class="font-medium text-ink">${from}–${to}</span> of <span class="font-medium text-ink">${rows.length}</span></p>
            <div class="flex items-center gap-1.5">
              <button type="button" class="btn btn-secondary btn-sm !h-7 !px-2" data-page="${this.page - 1}" ${this.page <= 1 ? 'disabled' : ''} aria-label="Previous page"><i data-lucide="chevron-left" class="size-3.5"></i>Prev</button>
              <span class="px-1.5 text-[11.5px] text-muted">Page ${this.page} of ${totalPages}</span>
              <button type="button" class="btn btn-secondary btn-sm !h-7 !px-2" data-page="${this.page + 1}" ${this.page >= totalPages ? 'disabled' : ''} aria-label="Next page">Next<i data-lucide="chevron-right" class="size-3.5"></i></button>
            </div>
          </div>`;
      }

      $$('[data-sort]', this.table).forEach((btn) => {
        const active = btn.dataset.sort === this.sortKey;
        btn.dataset.direction = active ? this.sortDir : '';
        btn.removeAttribute('aria-sort');
        const th = btn.closest('th');
        if (th) th.setAttribute('aria-sort', active ? (this.sortDir === 'asc' ? 'ascending' : 'descending') : 'none');
      });

      icons();
    }
  }

  /* ---------------- Overview ---------------- */
  function initOverview() {
    const renderCharts = () => {
      window.MiraCharts.destroyAll();
      window.MiraCharts.deliveries('chart-deliveries');
      window.MiraCharts.platform('chart-platform');
    };
    window.MiraRenderCharts = renderCharts;
    renderCharts();

    const dataBody = $('#overview-data-body');
    if (dataBody) {
      dataBody.innerHTML = D.deliveriesSeries
        .slice(-7)
        .reverse()
        .map(
          (row) => `<tr><td class="cell-main">${row.label}</td><td class="font-mono">${Mira.fmt.num(row.accepted)}</td><td class="font-mono text-danger">${row.failed}</td><td class="font-mono">${row.successRate}%</td></tr>`
        )
        .join('');
    }

    const notifBody = $('#overview-notif-body');
    if (notifBody) {
      notifBody.innerHTML = D.notifications
        .slice(0, 5)
        .map(
          (n) => `
        <tr>
          <td><a href="notification.html?id=${encodeURIComponent(n.id)}" class="cell-main hover:text-link">${esc(n.title)}</a><div class="mt-0.5 font-mono text-[10px] text-muted">${esc(n.id)}</div></td>
          <td class="max-w-[140px] truncate text-[12px]">${esc(n.audience)}</td>
          <td>${Mira.statusBadge(n.status)}</td>
          <td class="text-right"><span class="font-mono text-[12px] text-ink">${Mira.fmt.num(n.accepted)}</span><span class="font-mono text-[11px] text-muted">/${Mira.fmt.num(n.total)}</span></td>
        </tr>`
        )
        .join('');
    }

    const activity = $('#activity-list');
    if (activity) {
      activity.innerHTML = D.activity
        .slice(0, 5)
        .map(
          (item) => `
        <li class="flex items-start gap-3 py-2.5">
          <span class="mt-0.5 grid size-7 shrink-0 place-items-center rounded-md border border-line bg-surface text-muted"><i data-lucide="${item.icon}" class="size-3.5"></i></span>
          <div class="min-w-0 flex-1">
            <p class="truncate text-[12px] font-medium text-ink">${esc(item.title)}</p>
            <p class="mt-0.5 truncate text-[10.5px] text-muted">${esc(item.meta)}</p>
          </div>
          <span class="shrink-0 whitespace-nowrap text-[10px] text-muted">${Mira.fmt.ago(item.at)}</span>
        </li>`
        )
        .join('');
    }

    const refresh = $('#overview-refresh');
    if (refresh) {
      refresh.addEventListener('click', () => {
        const icon = refresh.querySelector('svg');
        if (icon) icon.classList.add('animate-spin');
        window.setTimeout(() => {
          if (icon) icon.classList.remove('animate-spin');
          renderCharts();
          Mira.toast({ title: 'Dashboard refreshed', message: 'Delivery data is up to date.', type: 'success' });
        }, 700);
      });
    }

    $$('[data-toggle-table]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const panel = document.getElementById(btn.dataset.toggleTable);
        if (!panel) return;
        const isHidden = panel.classList.toggle('hidden');
        btn.setAttribute('aria-expanded', String(!isHidden));
        btn.textContent = isHidden ? 'View data table' : 'Hide data table';
      });
    });

    icons();
  }

  /* ---------------- Projects ---------------- */
  function initProjects() {
    const grid = $('#project-grid');
    if (!grid) return;

    const render = () => {
      const active = Mira.activeProject();
      grid.innerHTML = D.projects
        .map((p) => {
          const pct = Math.min(100, Math.round((p.usedToday / p.dailyLimit) * 100));
          const isActive = p.id === active.id;
          return `
          <article class="card flex flex-col ${isActive ? 'ring-1 ring-primary/40' : ''}">
            <div class="flex items-start justify-between gap-3 p-5">
              <div class="flex min-w-0 items-start gap-3">
                <span class="grid size-10 shrink-0 place-items-center rounded-lg ${isActive ? 'bg-primary text-onPrimary' : 'bg-sunken text-sub'} font-mono text-[12px] font-semibold">${esc(p.initials)}</span>
                <div class="min-w-0">
                  <h2 class="truncate text-[14.5px] font-semibold text-ink">${esc(p.name)}</h2>
                  <p class="mt-0.5 truncate font-mono text-[10px] text-muted">${esc(p.id)}</p>
                </div>
              </div>
              <div class="flex shrink-0 flex-col items-end gap-1.5">
                ${Mira.statusBadge(p.env)}
                ${isActive ? '<span class="text-[10px] font-medium text-link">Current</span>' : ''}
              </div>
            </div>
            <dl class="grid grid-cols-3 divide-x divide-line border-y border-line">
              <div class="px-4 py-3"><dt class="text-[10.5px] text-muted">Subscribers</dt><dd class="mt-0.5 font-mono text-[13px] text-ink">${Mira.fmt.num(p.subscribers)}</dd></div>
              <div class="px-4 py-3"><dt class="text-[10.5px] text-muted">Active</dt><dd class="mt-0.5 font-mono text-[13px] text-ink">${Mira.fmt.num(p.active)}</dd></div>
              <div class="px-4 py-3"><dt class="text-[10.5px] text-muted">Plan</dt><dd class="mt-0.5 text-[12px] font-medium text-ink">${esc(p.plan)}</dd></div>
            </dl>
            <div class="flex flex-1 flex-col justify-between gap-4 p-5">
              <div>
                <div class="flex items-center justify-between text-[11px]"><span class="text-muted">Today&rsquo;s quota</span><span class="font-mono text-[10.5px] text-sub">${Mira.fmt.num(p.usedToday)} / ${Mira.fmt.num(p.dailyLimit)}</span></div>
                <div class="mt-1.5 h-1.5 overflow-hidden rounded-full bg-sunken"><div class="h-full rounded-full ${pct >= 80 ? 'bg-warning' : 'bg-primary'}" style="width:${pct}%"></div></div>
              </div>
              <div class="flex items-center gap-2">
                <a href="index.html" class="btn btn-secondary btn-sm flex-1">Open</a>
                ${
                  isActive
                    ? '<span class="btn btn-ghost btn-sm flex-1 cursor-default text-muted">Active project</span>'
                    : `<button type="button" class="btn btn-primary btn-sm flex-1" data-project-switch="${esc(p.id)}">Switch</button>`
                }
              </div>
            </div>
          </article>`;
        })
        .join('');
      icons();
    };

    grid.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-project-switch]');
      if (!btn) return;
      Mira.setProject(btn.dataset.projectSwitch);
      render();
    });

    render();

    const form = $('#project-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const nameInput = $('#project-name');
        const name = nameInput.value.trim();
        setError('project-name', !name);
        if (!name) return moveFocus('project-name');
        const env = form.querySelector('input[name="env"]:checked').value;
        const project = {
          id: randomId('prj_', 8).toLowerCase(),
          name,
          initials: name
            .split(/\s+/)
            .slice(0, 2)
            .map((w) => w[0])
            .join('')
            .toUpperCase(),
          env,
          plan: 'Free',
          subscribers: 0,
          active: 0,
          usedToday: 0,
          dailyLimit: 1000,
          web: 0,
          android: 0,
          ios: 0,
          createdAt: new Date().toISOString(),
        };
        D.projects.unshift(project);
        Mira.projects = D.projects;
        render();
        form.reset();
        Mira.closeDialog('project-dialog');
        Mira.toast({ title: 'Project created', message: `${name} · ${env} environment is ready.`, type: 'success' });
      });
    }

    $$('[data-project-create]').forEach((btn) =>
      btn.addEventListener('click', () => {
        const form = $('#project-form');
        if (form) form.reset();
        setError('project-name', false);
        openDialogFor('#project-dialog');
      })
    );
    if (new URLSearchParams(location.search).get('create') === '1') openDialogFor('#project-dialog');
  }

  /* ---------------- Subscribers ---------------- */
  function initSubscribers() {
    const tbody = $('#subscribers-body');
    if (!tbody) return;

    const table = new DataTable({
      tbody,
      data: D.subscribers,
      pageSize: 10,
      searchInput: '#subscriber-search',
      countEl: '#subscriber-count',
      paginationEl: '#subscriber-pagination',
      sortKey: 'lastSeenAt',
      sortDir: 'desc',
      searchText: (row) => [row.id, row.device, row.country, row.platform, row.status, row.provider].join(' '),
      empty: { icon: 'users', title: 'No subscribers match', message: 'Try a different platform, status or search term.' },
      columns: [
        {
          key: 'id',
          render: (row) => `<div class="cell-main font-mono text-[12px]">${esc(row.id)}</div><div class="mt-0.5 text-[10.5px] text-muted">${esc(row.country)}</div>`,
        },
        { key: 'platform', render: (row) => Mira.platformBadge(row.platform) },
        {
          key: 'device',
          render: (row) => `<div class="text-[12px] text-ink">${esc(row.device)}</div><div class="mt-0.5 text-[10.5px] text-muted">${esc(row.provider)}</div>`,
        },
        { key: 'status', render: (row) => Mira.statusBadge(row.status) },
        { key: 'notifications', className: 'text-right font-mono text-[12px]', render: (row) => Mira.fmt.num(row.notifications) },
        {
          key: 'lastSeenAt',
          render: (row) => `<span title="${esc(Mira.fmt.dateTime(row.lastSeenAt))}">${Mira.fmt.ago(row.lastSeenAt)}</span>`,
        },
        {
          key: 'actions',
          className: 'text-right',
          render: (row) =>
            `<button type="button" class="btn btn-ghost btn-icon !size-7" data-subscriber-view="${esc(row.id)}" aria-label="View ${esc(row.id)}"><i data-lucide="arrow-up-right" class="size-3.5"></i></button>`,
        },
      ],
      onRowClick: (row) => showDetail(row),
    });

    const dialog = $('#subscriber-detail');
    let current = null;

    function showDetail(row) {
      current = row;
      $('[data-detail-id]', dialog).textContent = row.id;
      $('[data-detail-status]', dialog).innerHTML = Mira.statusBadge(row.status);
      $('[data-detail-platform]', dialog).textContent = PLATFORM_LABEL[row.platform] || row.platform;
      $('[data-detail-provider]', dialog).textContent = row.provider;
      $('[data-detail-device]', dialog).textContent = row.device;
      $('[data-detail-country]', dialog).textContent = row.country;
      $('[data-detail-created]', dialog).textContent = Mira.fmt.dateTime(row.createdAt);
      $('[data-detail-lastseen]', dialog).textContent = Mira.fmt.ago(row.lastSeenAt);
      $('[data-detail-notifications]', dialog).textContent = Mira.fmt.num(row.notifications);
      $('[data-detail-token]', dialog).textContent = row.token;
      $('[data-detail-copy]', dialog).dataset.copy = row.id;
      if (window.lucide) window.lucide.createIcons();
      dialog._trigger = document.activeElement;
      Mira.openDialog(dialog);
    }

    tbody.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-subscriber-view]');
      if (!btn) return;
      const row = D.subscribers.find((r) => r.id === btn.dataset.subscriberView);
      if (row) showDetail(row);
    });

    const removeBtn = $('[data-detail-remove]', dialog);
    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        if (!current) return;
        const row = current;
        Mira.confirm({
          title: 'Remove subscriber?',
          message: `This deletes ${row.id} and stops all future deliveries to this device. This cannot be undone.`,
          confirmLabel: 'Remove subscriber',
          onConfirm: () => {
            D.subscribers = D.subscribers.filter((r) => r.id !== row.id);
            table.setData(D.subscribers);
            Mira.closeDialog(dialog);
            Mira.toast({ title: 'Subscriber removed', message: row.id, type: 'success' });
          },
        });
      });
    }

    // Create subscriber
    const form = $('#subscriber-form');
    if (form) {
      const idInput = $('#subscriber-id');
      const openCreate = () => {
        form.reset();
        idInput.value = randomId('sub_01J', 10);
        setError('subscriber-platform', false);
        openDialogFor('#subscriber-dialog');
      };
      $$('[data-subscriber-create]').forEach((btn) => btn.addEventListener('click', openCreate));

      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const platform = $('#subscriber-platform').value;
        if (!platform) {
          setError('subscriber-platform', true);
          return moveFocus('subscriber-platform');
        }
        const row = {
          id: idInput.value,
          platform,
          device: $('#subscriber-device').value.trim() || 'Unknown device',
          provider: platform === 'web' ? 'Web Push' : platform === 'android' ? 'FCM' : 'APNs',
          country: '—',
          status: $('#subscriber-status').value,
          createdAt: new Date().toISOString(),
          lastSeenAt: new Date().toISOString(),
          notifications: 0,
          token: $('#subscriber-token').value.trim() || 'p256dh:••••••••…',
        };
        D.subscribers.unshift(row);
        table.setData(D.subscribers);
        Mira.closeDialog('subscriber-dialog');
        Mira.toast({ title: 'Subscriber added', message: `${row.id} is ${row.status}.`, type: 'success' });
      });
    }

    const exportBtn = $('#export-subscribers');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        download(
          'mira-subscribers.csv',
          csv(
            ['ID', 'Platform', 'Device', 'Provider', 'Country', 'Status', 'Notifications', 'Created', 'Last active'],
            table.view.map((r) => [r.id, PLATFORM_LABEL[r.platform] || r.platform, r.device, r.provider, r.country, r.status, r.notifications, r.createdAt, r.lastSeenAt])
          )
        );
        Mira.toast({ title: 'Export ready', message: `${table.view.length} subscribers exported.`, type: 'success' });
      });
    }

    icons();
  }

  /* ---------------- Notifications ---------------- */
  function initNotifications() {
    const tbody = $('#notifications-body');
    if (!tbody) return;

    const table = new DataTable({
      tbody,
      data: D.notifications,
      pageSize: 10,
      searchInput: '#notification-search',
      countEl: '#notification-count',
      paginationEl: '#notification-pagination',
      sortKey: 'createdAt',
      sortDir: 'desc',
      searchText: (row) => [row.id, row.title, row.audience, row.status].join(' '),
      empty: { icon: 'bell', title: 'No notifications found', message: 'Try a different status or search term, or compose a new notification.' },
      columns: [
        {
          key: 'title',
          render: (row) => `<div class="cell-main max-w-[320px] truncate">${esc(row.title)}</div><div class="mt-0.5 font-mono text-[10px] text-muted">${esc(row.id)}</div>`,
        },
        { key: 'audience', render: (row) => `<span class="text-[12px]">${esc(row.audience)}</span>` },
        { key: 'status', render: (row) => Mira.statusBadge(row.status) },
        {
          key: 'accepted',
          render: (row) => {
            const pct = row.total ? Math.round((row.accepted / row.total) * 100) : 0;
            return `<div class="flex items-center justify-between gap-3 text-[11px]"><span class="font-mono text-ink">${Mira.fmt.num(row.accepted)}<span class="text-muted">/${Mira.fmt.num(row.total)}</span></span>${row.failed ? `<span class="font-mono text-[10px] text-danger">${row.failed} failed</span>` : ''}</div>
              <div class="mt-1.5 h-1 overflow-hidden rounded-full bg-sunken"><div class="h-full rounded-full ${row.failed > row.accepted * 0.03 ? 'bg-warning' : 'bg-success'}" style="width:${pct}%"></div></div>`;
          },
        },
        { key: 'createdAt', render: (row) => `<span title="${esc(Mira.fmt.dateTime(row.createdAt))}">${Mira.fmt.ago(row.createdAt)}</span>` },
        {
          key: 'actions',
          className: 'text-right',
          render: (row) =>
            `<a href="notification.html?id=${encodeURIComponent(row.id)}" class="btn btn-ghost btn-icon !size-7" aria-label="Open notification"><i data-lucide="arrow-up-right" class="size-3.5"></i></a>`,
        },
      ],
      onRowClick: (row) => {
        window.location.href = 'notification.html?id=' + encodeURIComponent(row.id);
      },
    });

    // Compose
    const dialog = $('#compose-dialog');
    const form = $('#compose-form');
    const titleInput = $('#compose-title-input');
    const bodyInput = $('#compose-body-input');
    const audienceSelect = $('#compose-audience');
    const remaining = D.usage.today.limit - D.usage.today.used;

    const updateCounts = () => {
      $('#compose-title-count').textContent = titleInput.value.length;
      $('#compose-body-count').textContent = bodyInput.value.length;
      $('#preview-title').textContent = titleInput.value.trim() || 'New dashboard is live';
      $('#preview-body').textContent = bodyInput.value.trim() || 'Charts, delivery logs and API keys are now in one place.';
    };

    const updateAudience = () => {
      const count = Number(audienceSelect.selectedOptions[0].dataset.count || 0);
      $('#preview-recipients').textContent = Mira.fmt.num(count);
      $('#compose-audience-hint').textContent = `${Mira.fmt.num(count)} delivery unit${count === 1 ? '' : 's'} will be reserved atomically before queueing.`;
      const alert = $('#compose-quota-alert');
      alert.classList.toggle('hidden', count <= remaining);
    };

    const openCompose = () => {
      updateCounts();
      updateAudience();
      openDialogFor('#compose-dialog');
    };

    $$('[data-compose-open]').forEach((btn) => btn.addEventListener('click', openCompose));
    if (new URLSearchParams(location.search).get('compose') === '1') openCompose();

    titleInput.addEventListener('input', () => {
      updateCounts();
      setError('compose-title-input', false);
    });
    bodyInput.addEventListener('input', () => {
      updateCounts();
      setError('compose-body-input', false);
    });
    audienceSelect.addEventListener('change', updateAudience);

    const advanced = $('[data-compose-advanced]');
    if (advanced) {
      advanced.addEventListener('click', () => {
        const panel = $('#compose-advanced');
        const open = panel.classList.toggle('hidden') === false;
        advanced.setAttribute('aria-expanded', String(open));
        const chevron = advanced.querySelector('[data-chevron]');
        if (chevron) chevron.style.transform = open ? 'rotate(180deg)' : '';
      });
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = titleInput.value.trim();
      const body = bodyInput.value.trim();
      setError('compose-title-input', !title);
      setError('compose-body-input', !body);
      if (!title || !body) return focusFirstInvalid(['compose-title-input', 'compose-body-input']);

      const platforms = $$('input[name="platform"]:checked', form).map((i) => i.value);
      if (!platforms.length) {
        Mira.toast({ title: 'Select a platform', message: 'Choose at least one delivery channel.', type: 'error' });
        return;
      }

      const count = Number(audienceSelect.selectedOptions[0].dataset.count || 0);
      if (count > remaining) {
        $('#compose-quota-alert').classList.remove('hidden');
        Mira.toast({ title: 'Quota exceeded', message: `${Mira.fmt.num(count)} units requested, ${remaining} remaining today.`, type: 'error' });
        return;
      }

      const audienceValue = audienceSelect.value;
      const audienceLabel = audienceValue === 'all' ? 'All subscribers' : audienceValue === 'individual' ? 'Individual subscriber' : 'Segment: Trial ending';
      const submit = $('#compose-submit');
      afterBusy(
        submit,
        () => {
          const notification = {
            id: randomId('ntf_01J', 8),
            title,
            body,
            url: $('#compose-url').value.trim() || null,
            status: 'queued',
            target: { type: audienceValue, label: audienceLabel },
            audience: audienceLabel,
            createdAt: new Date().toISOString(),
            completedAt: null,
            total: count,
            accepted: 0,
            failed: 0,
            pending: count,
            platforms: platforms.map((p) => PLATFORM_LABEL[p]),
            idempotencyKey: $('#compose-idempotency').value.trim() || null,
          };
          D.notifications.unshift(notification);
          table.setData(D.notifications);
          form.reset();
          updateCounts();
          updateAudience();
          Mira.closeDialog(dialog);
          Mira.toast({ title: 'Notification queued', message: `${Mira.fmt.num(count)} delivery unit${count === 1 ? '' : 's'} reserved.`, type: 'success' });
        },
        800
      );
    });

    icons();
  }

  /* ---------------- Notification detail ---------------- */
  function initNotificationDetail() {
    const id = new URLSearchParams(location.search).get('id');
    const ntf = D.notifications.find((n) => n.id === id) || D.notifications[0];
    if (!ntf) return;

    const acceptedPct = ntf.total ? ((ntf.accepted / ntf.total) * 100).toFixed(1) : '0.0';
    const failedPct = ntf.total ? ((ntf.failed / ntf.total) * 100).toFixed(1) : '0.0';

    document.title = ntf.title + ' · Mira';
    const set = (sel, value) => $$(sel).forEach((el) => (el.textContent = value));
    set('[data-ntf-id]', ntf.id);
    set('[data-ntf-title]', ntf.title);
    set('[data-ntf-audience]', ntf.audience);
    set('[data-ntf-created]', Mira.fmt.dateTime(ntf.createdAt));
    set('[data-ntf-total]', Mira.fmt.num(ntf.total));
    set('[data-ntf-accepted]', Mira.fmt.num(ntf.accepted));
    set('[data-ntf-failed]', Mira.fmt.num(ntf.failed));
    set('[data-ntf-pending]', Mira.fmt.num(ntf.pending));
    set('[data-ntf-acceptance]', `${acceptedPct}% of audience`);
    set('[data-ntf-failed-pct]', `${failedPct}%`);
    set('[data-ntf-pending-note]', ntf.pending ? 'waiting on providers' : 'nothing in flight');
    set('[data-ntf-preview-title]', ntf.title);
    set('[data-ntf-preview-body]', ntf.body);
    set('[data-ntf-channels]', ntf.platforms.join(' · '));
    set('[data-ntf-idem]', ntf.idempotencyKey || '—');
    set('[data-ntf-queued]', Mira.fmt.dateTime(ntf.createdAt));
    set('[data-ntf-completed]', ntf.completedAt ? Mira.fmt.dateTime(ntf.completedAt) : 'Not yet');
    set('[data-ntf-status]', '');
    $('[data-ntf-status]').innerHTML = Mira.statusBadge(ntf.status);

    const urlEl = $('[data-ntf-url]');
    if (urlEl) {
      urlEl.textContent = ntf.url || '—';
      if (ntf.url) urlEl.href = ntf.url;
      else urlEl.removeAttribute('href');
    }

    const copyBtn = $('[data-copy-notification]');
    if (copyBtn) copyBtn.dataset.copy = ntf.id;

    const payload = {
      title: ntf.title,
      body: ntf.body,
      url: ntf.url,
      target: ntf.target,
      data: { screen: 'changelog', version: '2.14.0' },
      options: { ttl: 3600, urgency: 'normal' },
    };
    const payloadEl = $('#notification-payload');
    if (payloadEl) payloadEl.textContent = JSON.stringify(payload, null, 2);

    $$('[data-breakdown-accepted]').forEach((el) => (el.textContent = Mira.fmt.num(ntf.accepted)));
    $$('[data-breakdown-failed]').forEach((el) => (el.textContent = Mira.fmt.num(ntf.failed)));
    $$('[data-breakdown-pending]').forEach((el) => (el.textContent = Mira.fmt.num(ntf.pending)));

    const renderCharts = () => {
      window.MiraCharts.destroyAll();
      window.MiraCharts.deliveryBreakdown('chart-breakdown', ntf.accepted, ntf.failed, ntf.pending);
    };
    window.MiraRenderCharts = renderCharts;
    renderCharts();

    const failedBody = $('#failed-body');
    if (failedBody) {
      let rows = D.deliveries.filter((d) => d.notificationId === ntf.id && d.status === 'failed');
      if (!rows.length) rows = D.deliveries.filter((d) => d.status === 'failed').slice(0, 4);
      rows = rows.slice(0, 5);
      failedBody.innerHTML = rows.length
        ? rows
            .map(
              (row) => `<tr>
                <td><span class="font-mono text-[11.5px] text-ink">${esc(row.subscriberId)}</span><div class="mt-0.5 text-[10px] text-muted">${esc(PLATFORM_LABEL[row.platform] || row.platform)}</div></td>
                <td class="text-[12px]">${esc(row.provider)}</td>
                <td class="font-mono text-[12px]">${row.attempts}</td>
                <td class="max-w-[220px] truncate text-[11.5px] text-danger" title="${esc(row.error || '')}">${esc(row.error || '—')}</td>
              </tr>`
            )
            .join('')
        : `<tr><td colspan="4"><div class="empty-state !py-10"><span class="empty-icon"><i data-lucide="circle-check" class="size-5"></i></span><p class="text-[13px] font-medium text-ink">No failed deliveries</p><p class="mt-1 text-[11.5px] text-muted">Every attempt was accepted by the provider.</p></div></td></tr>`;
    }

    const resend = $('[data-resend-failed]');
    if (resend) {
      if (!ntf.failed) {
        resend.disabled = true;
        resend.title = 'No failed deliveries to resend';
      }
      resend.addEventListener('click', () => {
        Mira.confirm({
          title: 'Resend failed deliveries?',
          message: `${ntf.failed} failed deliveries will be re-queued. Quota reservations are reused, so no additional units are charged.`,
          confirmLabel: 'Resend failed',
          onConfirm: () => Mira.toast({ title: 'Retries queued', message: `${ntf.failed} deliveries re-queued without extra quota.`, type: 'success' }),
        });
      });
    }

    icons();
  }

  /* ---------------- Delivery logs ---------------- */
  function initDeliveries() {
    const tbody = $('#deliveries-body');
    if (!tbody) return;

    const table = new DataTable({
      tbody,
      data: D.deliveries,
      pageSize: 12,
      searchInput: '#delivery-search',
      countEl: '#delivery-count',
      paginationEl: '#delivery-pagination',
      sortKey: 'createdAt',
      sortDir: 'desc',
      searchText: (row) => [row.id, row.notificationTitle, row.subscriberId, row.provider, row.status].join(' '),
      empty: { icon: 'list-checks', title: 'No deliveries match', message: 'Clear the status or provider filter to see more attempts.' },
      columns: [
        { key: 'id', render: (row) => `<div class="font-mono text-[11px] text-ink">${esc(row.id)}</div><div class="mt-0.5 text-[10px] text-muted">${Mira.fmt.ago(row.createdAt)}</div>` },
        { key: 'notificationTitle', render: (row) => `<span class="block max-w-[220px] truncate text-[12px]">${esc(row.notificationTitle)}</span><span class="mt-0.5 block font-mono text-[10px] text-muted">${esc(row.notificationId)}</span>` },
        { key: 'subscriberId', render: (row) => `<span class="font-mono text-[11px] text-ink">${esc(row.subscriberId)}</span><div class="mt-0.5 text-[10px] text-muted">${esc(PLATFORM_LABEL[row.platform] || row.platform)}</div>` },
        { key: 'provider', render: (row) => `<span class="badge badge-outline">${esc(row.provider)}</span>` },
        { key: 'status', render: (row) => Mira.statusBadge(row.status) },
        { key: 'attempts', className: 'text-right font-mono text-[12px]', render: (row) => row.attempts },
        { key: 'latency', className: 'text-right font-mono text-[11.5px]', render: (row) => (row.latency ? row.latency + 'ms' : '—') },
        { key: 'createdAt', render: (row) => `<span title="${esc(Mira.fmt.dateTime(row.createdAt))}">${Mira.fmt.ago(row.createdAt)}</span>` },
      ],
      onRowClick: (row) => showDetail(row),
    });

    const dialog = $('#delivery-detail');
    let current = null;

    function showDetail(row) {
      current = row;
      setText('[data-delivery-id]', row.id);
      $('[data-delivery-status]').innerHTML = Mira.statusBadge(row.status);
      setText('[data-delivery-notification]', row.notificationTitle);
      setText('[data-delivery-subscriber]', row.subscriberId);
      setText('[data-delivery-provider]', row.provider);
      setText('[data-delivery-attempts]', row.attempts);
      setText('[data-delivery-latency]', row.latency ? row.latency + ' ms' : '—');
      setText('[data-delivery-created]', Mira.fmt.dateTime(row.createdAt));

      const response = {
        provider: row.provider,
        delivery_id: row.id,
        status: row.status,
        http_status: row.status === 'accepted' ? 201 : row.status === 'failed' ? 410 : 202,
        provider_message_id: row.status === 'accepted' ? row.id.replace('dlv_', 'msg_') : null,
        error: row.error,
        latency_ms: row.latency,
        recorded_at: row.createdAt,
        note: 'Provider acceptance does not confirm display on the device.',
      };
      const responseEl = $('#delivery-response');
      if (responseEl) responseEl.textContent = JSON.stringify(response, null, 2);

      const timeline = $('#attempt-timeline');
      if (timeline) {
        const items = [];
        const baseTime = new Date(row.createdAt).getTime();
        for (let i = 1; i <= Math.max(1, row.attempts); i++) {
          const at = new Date(baseTime + (i - 1) * 4200).toISOString();
          const ok = i === row.attempts && row.status === 'accepted';
          const failedFinal = i === row.attempts && row.status === 'failed';
          items.push(`
            <li class="flex items-start gap-2.5">
              <span class="mt-1 size-2 shrink-0 rounded-full ${ok ? 'bg-success' : failedFinal ? 'bg-danger' : 'bg-line-strong'}"></span>
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center justify-between gap-2"><span class="font-medium text-ink">Attempt ${i}</span><span class="font-mono text-[10.5px] text-muted">${Mira.fmt.time(at)}</span></div>
                <p class="mt-0.5 text-[11px] ${failedFinal ? 'text-danger' : 'text-muted'}">${ok ? 'Provider accepted' : failedFinal ? esc(row.error || 'Failed') : 'Timed out · exponential backoff'}</p>
              </div>
            </li>`);
        }
        timeline.innerHTML = items.join('');
      }

      const retry = $('#retry-delivery');
      if (retry) {
        const canRetry = row.status === 'failed' || row.status === 'expired';
        retry.disabled = !canRetry;
        retry.title = canRetry ? '' : 'Only failed or expired deliveries can be retried';
      }

      if (window.lucide) window.lucide.createIcons();
      dialog._trigger = document.activeElement;
      Mira.openDialog(dialog);
    }

    function setText(sel, value) {
      $$(sel).forEach((el) => (el.textContent = value));
    }

    const retry = $('#retry-delivery');
    if (retry) {
      retry.addEventListener('click', () => {
        if (!current) return;
        Mira.closeDialog(dialog);
        Mira.toast({ title: 'Retry queued', message: `${current.id} will be retried with backoff.`, type: 'success' });
      });
    }

    const exportBtn = $('#export-deliveries');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        download(
          'mira-delivery-logs.csv',
          csv(
            ['Delivery ID', 'Notification', 'Subscriber', 'Provider', 'Status', 'Attempts', 'Latency (ms)', 'Created'],
            table.view.map((r) => [r.id, r.notificationTitle, r.subscriberId, r.provider, r.status, r.attempts, r.latency, r.createdAt])
          )
        );
        Mira.toast({ title: 'Export ready', message: `${table.view.length} deliveries exported.`, type: 'success' });
      });
    }

    const refresh = $('#refresh-deliveries');
    if (refresh) {
      refresh.addEventListener('click', () => {
        const icon = refresh.querySelector('svg');
        if (icon) icon.classList.add('animate-spin');
        window.setTimeout(() => {
          if (icon) icon.classList.remove('animate-spin');
          Mira.toast({ title: 'Logs refreshed', type: 'success' });
        }, 600);
      });
    }

    icons();
  }

  /* ---------------- Analytics ---------------- */
  function initAnalytics() {
    let range = 14;
    const volumeBody = $('#analytics-volume-body');
    const tableBody = $('#analytics-table-body');

    const renderCharts = () => {
      window.MiraCharts.destroyAll();
      window.MiraCharts.deliveries('chart-analytics-volume', range);
      window.MiraCharts.platformBars('chart-analytics-platform');
      window.MiraCharts.successRate('chart-analytics-success', range);
      window.MiraCharts.growth('chart-analytics-growth', range);
      window.MiraCharts.usageHistory('chart-analytics-usage', range);
    };

    const renderTables = () => {
      const series = D.deliveriesSeries.slice(-range);
      if (volumeBody) {
        volumeBody.innerHTML = series
          .slice()
          .reverse()
          .map(
            (row) =>
              `<tr><td class="cell-main">${row.label}</td><td class="font-mono">${Mira.fmt.num(row.accepted)}</td><td class="font-mono text-danger">${row.failed}</td><td class="font-mono">${row.successRate}%</td></tr>`
          )
          .join('');
      }
      if (tableBody) {
        tableBody.innerHTML = D.deliveriesSeries
          .slice(-7)
          .reverse()
          .map((row) => {
            const pct = row.total ? Math.round((row.accepted / row.total) * 100) : 0;
            return `<tr><td class="cell-main">${row.label}</td><td class="text-right font-mono">${Mira.fmt.num(row.total)}</td><td class="text-right font-mono ${pct >= 99 ? 'text-success' : 'text-warning'}">${row.successRate}%</td></tr>`;
          })
          .join('');
      }
    };

    window.MiraRenderCharts = renderCharts;
    renderCharts();
    renderTables();

    $$('#analytics-range [data-range]').forEach((btn) => {
      btn.setAttribute('aria-pressed', String(Number(btn.dataset.range) === range));
      btn.addEventListener('click', () => {
        range = Number(btn.dataset.range);
        $$('#analytics-range [data-range]').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.range) === range)));
        renderCharts();
        renderTables();
      });
    });

    $$('[data-toggle-table]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const panel = document.getElementById(btn.dataset.toggleTable);
        if (!panel) return;
        const isHidden = panel.classList.toggle('hidden');
        btn.setAttribute('aria-expanded', String(!isHidden));
        btn.textContent = isHidden ? 'Data table' : 'Hide table';
      });
    });

    const exportBtn = $('#export-analytics');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        download(
          'mira-analytics.csv',
          csv(
            ['Date', 'Accepted', 'Failed', 'Total', 'Success rate'],
            D.deliveriesSeries.slice(-range).map((r) => [r.label, r.accepted, r.failed, r.total, r.successRate])
          )
        );
        Mira.toast({ title: 'Report exported', type: 'success' });
      });
    }

    icons();
  }

  /* ---------------- API keys ---------------- */
  function initApiKeys() {
    const tbody = $('#keys-body');
    if (!tbody) return;

    const render = () => {
      tbody.innerHTML = D.apiKeys
        .map((key) => {
          const inactive = key.status !== 'active';
          const extra = key.scopes.length > 2 ? `<span class="badge badge-neutral">+${key.scopes.length - 2}</span>` : '';
          return `<tr>
            <td>
              <div class="flex items-center gap-2"><span class="cell-main">${esc(key.name)}</span><span class="badge ${key.type === 'secret' ? 'badge-primary' : 'badge-outline'}">${key.type === 'secret' ? 'Secret' : 'Publishable'}</span></div>
              <div class="mt-0.5 font-mono text-[10px] text-muted">${esc(key.id)}</div>
            </td>
            <td><span class="font-mono text-[11px] text-sub">${esc(key.prefix)}</span></td>
            <td>${Mira.statusBadge(key.env)}</td>
            <td><div class="flex max-w-[260px] flex-wrap gap-1">${key.scopes.slice(0, 2).map((s) => `<span class="badge badge-neutral font-mono !text-[10px]">${esc(s)}</span>`).join('')}${extra}</div></td>
            <td><span class="text-[12px] ${inactive ? 'text-muted' : ''}">${key.lastUsedAt ? Mira.fmt.ago(key.lastUsedAt) : 'Never'}</span></td>
            <td>${Mira.statusBadge(key.status)}</td>
            <td class="text-right">
              <div class="flex justify-end gap-0.5">
                <button type="button" class="btn btn-ghost btn-icon !size-7" data-key-copy="${esc(key.prefix)}" aria-label="Copy key prefix"><i data-lucide="copy" class="size-3.5"></i></button>
                <button type="button" class="btn btn-ghost btn-icon !size-7" data-key-regenerate="${esc(key.id)}" aria-label="Regenerate key" ${inactive ? 'disabled' : ''}><i data-lucide="refresh-cw" class="size-3.5"></i></button>
                <button type="button" class="btn btn-ghost btn-icon !size-7 !text-danger" data-key-revoke="${esc(key.id)}" aria-label="Revoke key" ${inactive ? 'disabled' : ''}><i data-lucide="trash-2" class="size-3.5"></i></button>
              </div>
            </td>
          </tr>`;
        })
        .join('');
      icons();
    };

    render();

    tbody.addEventListener('click', (e) => {
      const copy = e.target.closest('[data-key-copy]');
      if (copy) {
        Mira.copy(copy.dataset.keyCopy);
        return;
      }
      const regen = e.target.closest('[data-key-regenerate]');
      if (regen) {
        const key = D.apiKeys.find((k) => k.id === regen.dataset.keyRegenerate);
        if (!key) return;
        openCreateForm({ name: key.name + ' (rotated)', env: key.env, type: key.type, scopes: key.scopes });
        return;
      }
      const revoke = e.target.closest('[data-key-revoke]');
      if (revoke) {
        const key = D.apiKeys.find((k) => k.id === revoke.dataset.keyRevoke);
        if (!key) return;
        Mira.confirm({
          title: 'Revoke API key?',
          message: `Requests using “${key.name}” will fail immediately. This cannot be undone.`,
          confirmLabel: 'Revoke key',
          onConfirm: () => {
            key.status = 'revoked';
            render();
            Mira.toast({ title: 'Key revoked', message: key.name, type: 'success' });
          },
        });
      }
    });

    const form = $('#key-form');
    const stepForm = $('#key-step-form');
    const stepReveal = $('#key-step-reveal');
    let generated = null;

    const updateType = () => {
      const type = form.querySelector('input[name="keyType"]:checked').value;
      const scopes = $$('input[name="scope"]', form);
      const fieldset = $('#key-scopes-fieldset');
      const hint = $('#key-scopes-hint');
      if (type === 'publishable') {
        scopes.forEach((cb) => {
          cb.checked = cb.value === 'subscribers:write';
          cb.disabled = true;
        });
        fieldset.classList.add('opacity-60');
        hint.textContent = 'Publishable keys are limited to subscriber registration.';
      } else {
        scopes.forEach((cb) => (cb.disabled = false));
        fieldset.classList.remove('opacity-60');
        hint.textContent = 'Scopes are enforced on every request before processing.';
      }
    };

    $$('input[name="keyType"]', form).forEach((radio) => radio.addEventListener('change', updateType));

    const toggleAll = $('#toggle-all-scopes');
    if (toggleAll) {
      toggleAll.addEventListener('click', () => {
        const scopes = $$('input[name="scope"]', form).filter((cb) => !cb.disabled);
        const allChecked = scopes.every((cb) => cb.checked);
        scopes.forEach((cb) => (cb.checked = !allChecked));
        toggleAll.textContent = allChecked ? 'Select all' : 'Clear all';
      });
    }

    function resetDialog() {
      form.reset();
      updateType();
      stepForm.classList.remove('hidden');
      stepReveal.classList.add('hidden');
      generated = null;
      setError('key-name', false);
      setError('key-scopes', false);
      const toggle = $('#toggle-all-scopes');
      if (toggle) toggle.textContent = 'Select all';
    }

    function openCreateForm(prefill) {
      resetDialog();
      if (prefill) {
        $('#key-name').value = prefill.name || '';
        const typeRadio = form.querySelector(`input[name="keyType"][value="${prefill.type || 'secret'}"]`);
        const envRadio = form.querySelector(`input[name="keyEnv"][value="${prefill.env || 'live'}"]`);
        if (typeRadio) typeRadio.checked = true;
        if (envRadio) envRadio.checked = true;
        updateType();
        if (prefill.scopes) {
          $$('input[name="scope"]', form).forEach((cb) => (cb.checked = prefill.scopes.includes(cb.value)));
        }
      }
      openDialogFor('#key-dialog');
    }

    $$('[data-key-create]').forEach((btn) => btn.addEventListener('click', () => openCreateForm()));
    if (new URLSearchParams(location.search).get('create') === '1') openCreateForm();

    function generateSecret(env) {
      const bytes = new Uint8Array(20);
      if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(bytes);
      else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
      const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
      return `mira_sk_${env}_${hex}`;
    }

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = $('#key-name').value.trim();
        const type = form.querySelector('input[name="keyType"]:checked').value;
        const env = form.querySelector('input[name="keyEnv"]:checked').value;
        const scopes = $$('input[name="scope"]:checked', form).map((cb) => cb.value);
        setError('key-name', !name);
        setError('key-scopes', type === 'secret' && !scopes.length);
        if (!name || (type === 'secret' && !scopes.length)) return focusFirstInvalid(['key-name', 'key-scopes']);

        const expiry = $('#key-expiry').value;
        const expiryLabel = expiry === 'never' ? 'Never' : `${expiry} days`;
        const secret = type === 'secret' ? generateSecret(env) : `mira_pk_${env}_` + Math.random().toString(36).slice(2, 12) + Math.random().toString(36).slice(2, 12);

        generated = {
          id: randomId('key_01J', 6),
          name,
          type,
          env,
          prefix: secret.slice(0, 18) + '…' + secret.slice(-4),
          full: secret,
          scopes: type === 'publishable' ? ['subscribers:write'] : scopes,
          createdAt: new Date().toISOString(),
          lastUsedAt: null,
          expiresAt: expiry === 'never' ? null : new Date(Date.now() + Number(expiry) * 86400000).toISOString(),
          status: 'active',
          expiryLabel,
        };

        $('#generated-key').textContent = secret;
        $('[data-generated-name]').textContent = name;
        $('[data-generated-env]').textContent = env;
        $('[data-generated-scopes]').textContent = (generated.scopes.length > 2 ? generated.scopes.slice(0, 2).join(', ') + ` +${generated.scopes.length - 2}` : generated.scopes.join(', ')) || '—';
        $('[data-generated-expiry]').textContent = expiryLabel;

        stepForm.classList.add('hidden');
        stepReveal.classList.remove('hidden');
        icons();
      });
    }

    const done = $('#key-done');
    if (done) {
      done.addEventListener('click', () => {
        if (generated) {
          D.apiKeys.unshift(generated);
          render();
          Mira.toast({ title: 'API key created', message: 'Copy the secret now — it will not be shown again.', type: 'success' });
        }
        Mira.closeDialog('key-dialog');
      });
    }
  }

  /* ---------------- Webhooks ---------------- */
  function initWebhooks() {
    const tbody = $('#webhooks-body');
    if (!tbody) return;

    const render = () => {
      tbody.innerHTML = D.webhooks
        .map((hook) => {
          let host = hook.url;
          try {
            host = new URL(hook.url).host;
          } catch (e) {}
          return `<tr>
            <td>
              <div class="flex items-start gap-2.5">
                <span class="mt-0.5 grid size-7 shrink-0 place-items-center rounded-md border border-line bg-sunken text-muted"><i data-lucide="webhook" class="size-3.5"></i></span>
                <div class="min-w-0">
                  <p class="max-w-[280px] truncate font-mono text-[11.5px] font-medium text-ink">${esc(hook.url)}</p>
                  <p class="mt-0.5 flex items-center gap-1.5 text-[10.5px] text-muted"><span class="dot ${hook.env === 'live' ? 'text-success' : 'text-warning'}"></span>${esc(hook.env)} · ${esc(hook.description || host)}</p>
                </div>
              </div>
            </td>
            <td><span class="badge badge-neutral">${hook.events.length} events</span><div class="mt-1 max-w-[210px] truncate font-mono text-[10px] text-muted">${esc(hook.events[0])}${hook.events.length > 1 ? ` +${hook.events.length - 1}` : ''}</div></td>
            <td>${Mira.statusBadge(hook.status === 'active' ? 'active' : 'disabled')}</td>
            <td class="text-right font-mono text-[12px] ${hook.successRate < 95 ? 'text-warning' : 'text-ink'}">${hook.successRate.toFixed(1)}%</td>
            <td>${hook.lastDeliveryAt ? Mira.fmt.ago(hook.lastDeliveryAt) : '—'}</td>
            <td class="text-right">
              <div class="flex justify-end gap-1">
                <button type="button" class="btn btn-secondary btn-sm !h-7 !px-2" data-webhook-test="${esc(hook.id)}" ${hook.status !== 'active' ? 'disabled' : ''}>Test</button>
                <button type="button" class="btn btn-ghost btn-icon !size-7" data-webhook-toggle="${esc(hook.id)}" aria-label="${hook.status === 'active' ? 'Disable' : 'Enable'} endpoint"><i data-lucide="${hook.status === 'active' ? 'pause' : 'play'}" class="size-3.5"></i></button>
                <button type="button" class="btn btn-ghost btn-icon !size-7 !text-danger" data-webhook-delete="${esc(hook.id)}" aria-label="Delete endpoint"><i data-lucide="trash-2" class="size-3.5"></i></button>
              </div>
            </td>
          </tr>`;
        })
        .join('');
      icons();
    };

    const renderDeliveries = () => {
      const body = $('#webhook-deliveries-body');
      if (!body) return;
      body.innerHTML = D.webhookDeliveries
        .slice(0, 8)
        .map((row) => {
          let host = row.endpoint;
          try {
            host = new URL(row.endpoint).host;
          } catch (e) {}
          const tone = row.status >= 500 ? 'danger' : row.status >= 400 ? 'warning' : 'success';
          return `<tr>
            <td><span class="font-mono text-[11px] text-ink">${esc(row.event)}</span><div class="mt-0.5 font-mono text-[10px] text-muted">${esc(row.id)}</div></td>
            <td><span class="max-w-[160px] truncate font-mono text-[11px] text-sub">${esc(host)}</span></td>
            <td><span class="badge badge-${tone}">${row.status}</span></td>
            <td class="text-right font-mono text-[12px]">${row.attempts}</td>
            <td class="text-right font-mono text-[11.5px]">${row.duration}ms</td>
            <td>${Mira.fmt.ago(row.createdAt)}</td>
          </tr>`;
        })
        .join('');
    };

    render();
    renderDeliveries();

    tbody.addEventListener('click', (e) => {
      const test = e.target.closest('[data-webhook-test]');
      if (test) {
        const hook = D.webhooks.find((h) => h.id === test.dataset.webhookTest);
        if (!hook) return;
        test.disabled = true;
        test.textContent = 'Sending…';
        window.setTimeout(() => {
          D.webhookDeliveries.unshift({
            id: randomId('evt_01J', 5),
            event: 'webhook.test',
            endpoint: hook.url,
            status: 200,
            duration: 128,
            attempts: 1,
            createdAt: new Date().toISOString(),
          });
          hook.lastDeliveryAt = new Date().toISOString();
          render();
          renderDeliveries();
          Mira.toast({ title: 'Test event delivered', message: `${hook.url} responded 200 OK.`, type: 'success' });
        }, 900);
        return;
      }
      const toggle = e.target.closest('[data-webhook-toggle]');
      if (toggle) {
        const hook = D.webhooks.find((h) => h.id === toggle.dataset.webhookToggle);
        if (!hook) return;
        if (hook.status === 'active') {
          Mira.confirm({
            title: 'Disable endpoint?',
            message: 'Mira will stop sending events to this endpoint. Delivery history is kept.',
            confirmLabel: 'Disable endpoint',
            onConfirm: () => {
              hook.status = 'disabled';
              render();
              Mira.toast({ title: 'Endpoint disabled', type: 'success' });
            },
          });
        } else {
          hook.status = 'active';
          render();
          Mira.toast({ title: 'Endpoint enabled', type: 'success' });
        }
        return;
      }
      const del = e.target.closest('[data-webhook-delete]');
      if (del) {
        const hook = D.webhooks.find((h) => h.id === del.dataset.webhookDelete);
        if (!hook) return;
        Mira.confirm({
          title: 'Delete endpoint?',
          message: 'This removes the endpoint and its signing secret. Past delivery records remain for audit.',
          confirmLabel: 'Delete endpoint',
          onConfirm: () => {
            D.webhooks = D.webhooks.filter((h) => h.id !== hook.id);
            render();
            Mira.toast({ title: 'Endpoint deleted', type: 'success' });
          },
        });
      }
    });

    const form = $('#webhook-form');
    if (form) {
      const open = () => {
        form.reset();
        setError('webhook-url', false);
        setError('webhook-events', false);
        openDialogFor('#webhook-dialog');
      };
      $$('[data-webhook-create]').forEach((btn) => btn.addEventListener('click', open));
      if (new URLSearchParams(location.search).get('create') === '1') open();

      const toggleAll = $('#toggle-all-events');
      if (toggleAll) {
        toggleAll.addEventListener('click', () => {
          const boxes = $$('input[name="event"]', form);
          const allChecked = boxes.every((cb) => cb.checked);
          boxes.forEach((cb) => (cb.checked = !allChecked));
          toggleAll.textContent = allChecked ? 'Select all' : 'Clear all';
        });
      }

      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const url = $('#webhook-url').value.trim();
        let valid = false;
        try {
          const parsed = new URL(url);
          valid = parsed.protocol === 'https:' && !!parsed.hostname;
        } catch (err) {}
        const events = $$('input[name="event"]:checked', form).map((cb) => cb.value);
        setError('webhook-url', !valid);
        setError('webhook-events', !events.length);
        if (!valid || !events.length) return focusFirstInvalid(['webhook-url', 'webhook-events']);

        D.webhooks.unshift({
          id: randomId('whk_01J', 5),
          url,
          description: $('#webhook-description').value.trim() || 'Webhook endpoint',
          env: form.querySelector('input[name="webhookEnv"]:checked').value,
          events,
          status: 'active',
          secret: 'whsec_' + Math.random().toString(36).slice(2, 6) + '…' + Math.random().toString(36).slice(2, 6),
          successRate: 100,
          lastDeliveryAt: null,
          createdAt: new Date().toISOString(),
        });
        render();
        Mira.closeDialog('webhook-dialog');
        Mira.toast({ title: 'Endpoint added', message: 'A signing secret was generated.', type: 'success' });
      });
    }

    const refresh = $('#refresh-webhooks');
    if (refresh) {
      refresh.addEventListener('click', () => {
        const icon = refresh.querySelector('svg');
        if (icon) icon.classList.add('animate-spin');
        window.setTimeout(() => {
          if (icon) icon.classList.remove('animate-spin');
          renderDeliveries();
          Mira.toast({ title: 'Webhook history refreshed', type: 'success' });
        }, 600);
      });
    }

    icons();
  }

  /* ---------------- Usage ---------------- */
  function initUsage() {
    const ring = $('#usage-ring');
    if (ring) {
      const used = D.usage.today.used;
      const limit = D.usage.today.limit;
      const pct = Math.min(1, used / limit);
      const circumference = 2 * Math.PI * 54;
      ring.setAttribute('stroke-dasharray', circumference.toFixed(3));
      ring.setAttribute('stroke-dashoffset', (circumference * (1 - pct)).toFixed(3));
    }

    const renderCharts = () => {
      window.MiraCharts.destroyAll();
      window.MiraCharts.usageHistory('chart-usage', 14);
    };
    window.MiraRenderCharts = renderCharts;
    renderCharts();

    const body = $('#usage-history-body');
    if (body) {
      body.innerHTML = D.usage.history
        .slice()
        .reverse()
        .map((row) => {
          const pct = Math.round((row.units / row.limit) * 100);
          const tone = pct >= 100 ? 'danger' : pct >= 80 ? 'warning' : 'success';
          const label = pct >= 100 ? 'Exceeded' : pct >= 80 ? 'Warning' : 'Within limit';
          return `<tr>
            <td class="cell-main">${row.label}</td>
            <td class="text-right font-mono">${Mira.fmt.num(row.units)}</td>
            <td class="text-right font-mono">${pct}%</td>
            <td><span class="badge badge-${tone}"><span class="dot"></span>${label}</span></td>
          </tr>`;
        })
        .join('');
    }

    $$('[data-upgrade-open]').forEach((btn) => btn.addEventListener('click', () => openDialogFor('#upgrade-dialog')));
    const trial = $('#start-trial');
    if (trial) {
      trial.addEventListener('click', () => {
        const plan = document.querySelector('input[name="plan"]:checked');
        Mira.closeDialog('upgrade-dialog');
        Mira.toast({ title: 'Trial started', message: `${plan ? plan.value : 'Growth'} plan is active for 14 days.`, type: 'success' });
      });
    }

    const exportBtn = $('#export-usage');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        download(
          'mira-usage.csv',
          csv(
            ['Date', 'Delivery units', 'Daily limit', 'Percent used'],
            D.usage.history.map((r) => [r.label, r.units, r.limit, Math.round((r.units / r.limit) * 100) + '%'])
          )
        );
        Mira.toast({ title: 'Usage exported', type: 'success' });
      });
    }
  }

  /* ---------------- Settings ---------------- */
  function initSettings() {
    const themeButtons = $$('[data-theme-choice]');
    const syncTheme = (mode) => {
      themeButtons.forEach((btn) => {
        const active = btn.dataset.themeChoice === mode;
        btn.setAttribute('aria-pressed', String(active));
        btn.classList.toggle('border-primary', active);
        btn.classList.toggle('ring-1', active);
        btn.classList.toggle('ring-primary/30', active);
        const check = btn.querySelector(`[data-theme-check="${btn.dataset.themeChoice}"]`);
        if (check) check.classList.toggle('hidden', !active);
      });
    };
    themeButtons.forEach((btn) =>
      btn.addEventListener('click', () => {
        Mira.setTheme(btn.dataset.themeChoice);
        syncTheme(btn.dataset.themeChoice);
      })
    );
    syncTheme(Mira.themeMode);
    window.addEventListener('mira:theme', (e) => syncTheme(e.detail));

    $$('.switch').forEach((btn) => {
      btn.addEventListener('click', () => {
        const on = btn.getAttribute('aria-checked') !== 'true';
        btn.setAttribute('aria-checked', String(on));
        if (btn.id === 'reduce-motion-toggle') {
          document.documentElement.classList.toggle('reduce-motion', on);
          try {
            localStorage.setItem('mira-reduce-motion', on ? '1' : '0');
          } catch (e) {}
          Mira.toast({ title: on ? 'Reduced motion on' : 'Reduced motion off', type: 'info' });
        }
      });
    });

    const reduceToggle = $('#reduce-motion-toggle');
    if (reduceToggle) {
      let stored = null;
      try {
        stored = localStorage.getItem('mira-reduce-motion');
      } catch (e) {}
      const on = stored === '1' || (stored == null && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
      reduceToggle.setAttribute('aria-checked', String(on));
      document.documentElement.classList.toggle('reduce-motion', on);
    }

    const profileForm = $('#profile-form');
    if (profileForm) {
      profileForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const btn = profileForm.querySelector('button[type="submit"]');
        afterBusy(btn, () => Mira.toast({ title: 'Profile updated', message: 'Your account details were saved.', type: 'success' }));
      });
    }

    const passwordForm = $('#password-form');
    if (passwordForm) {
      passwordForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const current = $('#current-password').value;
        const next = $('#new-password').value;
        const confirm = $('#confirm-password').value;
        if (!current) {
          Mira.toast({ title: 'Enter your current password', type: 'error' });
          return;
        }
        if (next.length < 12) {
          Mira.toast({ title: 'Password too short', message: 'Use at least 12 characters.', type: 'error' });
          return;
        }
        if (next !== confirm) {
          Mira.toast({ title: 'Passwords do not match', type: 'error' });
          return;
        }
        const btn = passwordForm.querySelector('button[type="submit"]');
        afterBusy(btn, () => {
          passwordForm.reset();
          Mira.toast({ title: 'Password updated', message: 'Other sessions were revoked.', type: 'success' });
        });
      });
    }

    $$('[data-revoke-session]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const row = btn.closest('.flex.items-center.justify-between');
        Mira.confirm({
          title: 'Revoke this session?',
          message: 'The device will need to sign in again.',
          confirmLabel: 'Revoke session',
          onConfirm: () => {
            if (row) row.remove();
            Mira.toast({ title: 'Session revoked', type: 'success' });
          },
        });
      });
    });

    const enable2fa = $('#enable-2fa');
    if (enable2fa) {
      enable2fa.addEventListener('click', () => {
        if (enable2fa.dataset.enabled === 'true') {
          Mira.confirm({
            title: 'Disable two-factor authentication?',
            message: 'Your account will be protected by your password only.',
            confirmLabel: 'Disable 2FA',
            onConfirm: () => {
              enable2fa.dataset.enabled = 'false';
              enable2fa.textContent = 'Enable 2FA';
              Mira.toast({ title: '2FA disabled', type: 'warning' });
            },
          });
        } else {
          openDialogFor('#twofactor-dialog');
        }
      });
    }

    const twofactorForm = $('#twofactor-form');
    if (twofactorForm) {
      twofactorForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const code = $('#twofactor-code').value.trim();
        const ok = /^\d{6}$/.test(code);
        setError('twofactor-code', !ok);
        if (!ok) return;
        Mira.closeDialog('twofactor-dialog');
        twofactorForm.reset();
        if (enable2fa) {
          enable2fa.dataset.enabled = 'true';
          enable2fa.textContent = 'Disable 2FA';
        }
        Mira.toast({ title: 'Two-factor authentication enabled', message: 'Save your recovery codes in a safe place.', type: 'success' });
      });
    }

    const deleteAccount = $('#delete-account');
    if (deleteAccount) {
      deleteAccount.addEventListener('click', () => {
        Mira.confirm({
          title: 'Delete your account?',
          message: 'All projects, subscribers, keys and delivery logs will be permanently removed. This action cannot be undone.',
          confirmLabel: 'Delete account',
          onConfirm: () => {
            Mira.toast({ title: 'Account deletion requested', message: 'A confirmation email would be sent in production.', type: 'warning' });
          },
        });
      });
    }

    const avatar = $('#change-avatar');
    if (avatar) avatar.addEventListener('click', () => Mira.toast({ title: 'Avatar upload', message: 'Handled by the profile API in the Laravel build.', type: 'info' }));
  }

  /* ---------------- Boot ---------------- */
  function boot() {
    const page = document.body.dataset.page;
    const map = {
      overview: initOverview,
      projects: initProjects,
      subscribers: initSubscribers,
      notifications: initNotifications,
      notification: initNotificationDetail,
      deliveries: initDeliveries,
      analytics: initAnalytics,
      'api-keys': initApiKeys,
      webhooks: initWebhooks,
      usage: initUsage,
      settings: initSettings,
    };
    if (map[page]) map[page]();
    icons();
  }

  Mira.onReady(boot);
})();
