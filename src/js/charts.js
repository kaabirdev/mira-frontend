/* Chart.js theme-aware configuration for Mira. */
(function () {
  if (!window.Chart) return;

  const Mira = window.Mira || (window.Mira = {});
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const charts = new Map();

  function token(name) {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return raw ? `rgb(${raw})` : '#64748b';
  }
  function alpha(name, a) {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return raw ? `rgb(${raw} / ${a})` : `rgb(100 116 139 / ${a})`;
  }

  const Ch = (window.MiraCharts = {});
  Ch.charts = charts;

  function baseFont() {
    return { family: "'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif", size: 11 };
  }

  function baseOptions(overrides) {
    return Object.assign(
      {
        responsive: true,
        maintainAspectRatio: false,
        animation: reduceMotion.matches ? false : { duration: 550, easing: 'easeOutQuart' },
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            align: 'start',
            labels: {
              color: token('--c-sub'),
              boxWidth: 8,
              boxHeight: 8,
              usePointStyle: true,
              pointStyle: 'rectRounded',
              padding: 16,
              font: { ...baseFont(), size: 11.5 },
            },
          },
          tooltip: {
            backgroundColor: token('--c-surface'),
            titleColor: token('--c-ink'),
            bodyColor: token('--c-sub'),
            borderColor: token('--c-line'),
            borderWidth: 1,
            padding: 10,
            cornerRadius: 8,
            boxPadding: 4,
            usePointStyle: true,
            titleFont: { ...baseFont(), size: 12, weight: '600' },
            bodyFont: { ...baseFont(), size: 11.5 },
            callbacks: {},
          },
        },
        scales: {
          x: {
            grid: { display: false },
            border: { color: token('--c-line') },
            ticks: { color: token('--c-muted'), font: baseFont(), maxRotation: 0, autoSkipPadding: 14 },
          },
          y: {
            beginAtZero: true,
            grid: { color: alpha('--c-line', 0.8), drawTicks: false },
            border: { display: false },
            ticks: { color: token('--c-muted'), font: baseFont(), padding: 6, maxTicksLimit: 5 },
          },
        },
      },
      overrides || {}
    );
  }

  const centerLabel = {
    id: 'centerLabel',
    afterDraw(chart, _args, opts) {
      if (!opts || !opts.value) return;
      const { ctx, chartArea } = chart;
      const x = (chartArea.left + chartArea.right) / 2;
      const y = (chartArea.top + chartArea.bottom) / 2;
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = token('--c-ink');
      ctx.font = "600 21px 'Plus Jakarta Sans', sans-serif";
      ctx.fillText(opts.value, x, y - 7);
      ctx.fillStyle = token('--c-muted');
      ctx.font = "500 10.5px 'Plus Jakarta Sans', sans-serif";
      ctx.fillText(opts.label || '', x, y + 12);
      ctx.restore();
    },
  };

  function mount(id, build) {
    const canvas = document.getElementById(id);
    if (!canvas) return null;
    if (charts.has(id)) {
      charts.get(id).destroy();
      charts.delete(id);
    }
    canvas.setAttribute('role', 'img');
    const chart = build(canvas);
    if (chart) charts.set(id, chart);
    return chart;
  }

  Ch.destroyAll = function () {
    charts.forEach((chart) => chart.destroy());
    charts.clear();
  };

  Ch.deliveries = function (id, days) {
    const series = (Mira.data.deliveriesSeries || []).slice(-(days || 14));
    return mount(id, (canvas) => {
      const ctx = canvas.getContext('2d');
      return new Chart(ctx, {
        type: 'bar',
        data: {
          labels: series.map((row) => row.label),
          datasets: [
            {
              label: 'Accepted',
              data: series.map((row) => row.accepted),
              backgroundColor: token('--c-primary'),
              hoverBackgroundColor: token('--c-primary-hover'),
              borderRadius: 4,
              maxBarThickness: 22,
              stack: 'deliveries',
            },
            {
              label: 'Failed',
              data: series.map((row) => row.failed),
              backgroundColor: token('--c-danger'),
              hoverBackgroundColor: token('--c-danger'),
              borderRadius: 4,
              maxBarThickness: 22,
              stack: 'deliveries',
            },
          ],
        },
        options: baseOptions({
          scales: {
            x: {
              stacked: true,
              grid: { display: false },
              border: { color: token('--c-line') },
              ticks: { color: token('--c-muted'), font: baseFont(), maxRotation: 0, autoSkipPadding: 12 },
            },
            y: {
              stacked: true,
              beginAtZero: true,
              grid: { color: alpha('--c-line', 0.8), drawTicks: false },
              border: { display: false },
              ticks: {
                color: token('--c-muted'),
                font: baseFont(),
                padding: 6,
                maxTicksLimit: 5,
                callback: (v) => (v >= 1000 ? Math.round(v / 1000) + 'k' : v),
              },
            },
          },
          plugins: {
            tooltip: {
              backgroundColor: token('--c-surface'),
              titleColor: token('--c-ink'),
              bodyColor: token('--c-sub'),
              borderColor: token('--c-line'),
              borderWidth: 1,
              padding: 10,
              cornerRadius: 8,
              usePointStyle: true,
              titleFont: { ...baseFont(), size: 12, weight: '600' },
              bodyFont: { ...baseFont(), size: 11.5 },
              callbacks: {
                afterBody: (items) => {
                  const row = series[items[0].dataIndex];
                  return row ? `Success rate · ${row.successRate}%` : '';
                },
              },
            },
          },
        }),
      });
    });
  };

  Ch.usageHistory = function (id, days) {
    const series = (Mira.data.usage.history || []).slice(-(days || 14));
    return mount(id, (canvas) => {
      return new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
          labels: series.map((row) => row.label),
          datasets: [
            {
              label: 'Delivery units',
              data: series.map((row) => row.units),
              backgroundColor: series.map((row) => (row.units >= 1000 ? token('--c-danger') : row.units >= 800 ? token('--c-warning') : token('--c-primary'))),
              borderRadius: 4,
              maxBarThickness: 22,
              order: 2,
            },
            {
              label: 'Daily limit',
              data: series.map((row) => row.limit),
              type: 'line',
              borderColor: token('--c-muted'),
              borderDash: [5, 4],
              borderWidth: 1.5,
              pointRadius: 0,
              pointHoverRadius: 0,
              fill: false,
              order: 1,
            },
          ],
        },
        options: baseOptions({
          plugins: {
            legend: {
              display: true,
              position: 'bottom',
              align: 'start',
              labels: { color: token('--c-sub'), boxWidth: 8, boxHeight: 8, usePointStyle: true, padding: 16, font: { ...baseFont(), size: 11.5 } },
            },
            tooltip: {
              backgroundColor: token('--c-surface'),
              titleColor: token('--c-ink'),
              bodyColor: token('--c-sub'),
              borderColor: token('--c-line'),
              borderWidth: 1,
              padding: 10,
              cornerRadius: 8,
              callbacks: {
                label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y.toLocaleString()} units`,
              },
            },
          },
          scales: {
            x: {
              grid: { display: false },
              border: { color: token('--c-line') },
              ticks: { color: token('--c-muted'), font: baseFont(), maxRotation: 0, autoSkipPadding: 12 },
            },
            y: {
              beginAtZero: true,
              suggestedMax: 1100,
              grid: { color: alpha('--c-line', 0.8), drawTicks: false },
              border: { display: false },
              ticks: { color: token('--c-muted'), font: baseFont(), padding: 6, maxTicksLimit: 5 },
            },
          },
        }),
      });
    });
  };

  Ch.platform = function (id, type) {
    const series = Mira.data.platformSeries || [];
    return mount(id, (canvas) => {
      return new Chart(canvas.getContext('2d'), {
        type: type || 'doughnut',
        data: {
          labels: series.map((row) => row.label),
          datasets: [
            {
              data: series.map((row) => row.value),
              backgroundColor: [token('--c-primary'), token('--c-success'), token('--c-muted')],
              borderColor: token('--c-surface'),
              borderWidth: 3,
              hoverOffset: 4,
            },
          ],
        },
        options: baseOptions({
          cutout: '68%',
          interaction: { mode: 'nearest', intersect: true },
          plugins: {
            legend: {
              display: true,
              position: 'bottom',
              align: 'start',
              labels: { color: token('--c-sub'), boxWidth: 8, boxHeight: 8, usePointStyle: true, pointStyle: 'rectRounded', padding: 14, font: { ...baseFont(), size: 11.5 } },
            },
            tooltip: {
              backgroundColor: token('--c-surface'),
              titleColor: token('--c-ink'),
              bodyColor: token('--c-sub'),
              borderColor: token('--c-line'),
              borderWidth: 1,
              padding: 10,
              cornerRadius: 8,
              callbacks: {
                label: (ctx) => {
                  const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                  return `${ctx.label}: ${ctx.parsed.toLocaleString()} · ${((ctx.parsed / total) * 100).toFixed(1)}%`;
                },
              },
            },
            centerLabel: { value: Mira.fmt.compact(22904), label: 'active' },
          },
          scales: {},
        }),
        plugins: [centerLabel],
      });
    });
  };

  Ch.growth = function (id, days) {
    const series = (Mira.data.growthSeries || []).slice(-(days || 14));
    return mount(id, (canvas) => {
      return new Chart(canvas.getContext('2d'), {
        type: 'line',
        data: {
          labels: series.map((row) => row.label),
          datasets: [
            {
              label: 'Active subscribers',
              data: series.map((row) => row.value),
              borderColor: token('--c-primary'),
              backgroundColor: alpha('--c-primary', 0.1),
              fill: true,
              tension: 0.35,
              borderWidth: 2,
              pointRadius: 0,
              pointHoverRadius: 4,
              pointBackgroundColor: token('--c-primary'),
              pointBorderColor: token('--c-surface'),
              pointBorderWidth: 2,
            },
          ],
        },
        options: baseOptions({
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: token('--c-surface'),
              titleColor: token('--c-ink'),
              bodyColor: token('--c-sub'),
              borderColor: token('--c-line'),
              borderWidth: 1,
              padding: 10,
              cornerRadius: 8,
              callbacks: { label: (ctx) => `${ctx.parsed.y.toLocaleString()} active subscribers` },
            },
          },
          scales: {
            x: {
              grid: { display: false },
              border: { color: token('--c-line') },
              ticks: { color: token('--c-muted'), font: baseFont(), maxRotation: 0, autoSkipPadding: 14 },
            },
            y: {
              grid: { color: alpha('--c-line', 0.8), drawTicks: false },
              border: { display: false },
              ticks: { color: token('--c-muted'), font: baseFont(), padding: 6, maxTicksLimit: 5, callback: (v) => Mira.fmt.compact(v) },
            },
          },
        }),
      });
    });
  };

  Ch.successRate = function (id, days) {
    const series = (Mira.data.deliveriesSeries || []).slice(-(days || 14));
    return mount(id, (canvas) => {
      return new Chart(canvas.getContext('2d'), {
        type: 'line',
        data: {
          labels: series.map((row) => row.label),
          datasets: [
            {
              label: 'Acceptance rate',
              data: series.map((row) => row.successRate),
              borderColor: token('--c-success'),
              backgroundColor: alpha('--c-success', 0.08),
              fill: true,
              tension: 0.35,
              borderWidth: 2,
              pointRadius: 0,
              pointHoverRadius: 4,
              pointBackgroundColor: token('--c-success'),
              pointBorderColor: token('--c-surface'),
              pointBorderWidth: 2,
            },
          ],
        },
        options: baseOptions({
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: token('--c-surface'),
              titleColor: token('--c-ink'),
              bodyColor: token('--c-sub'),
              borderColor: token('--c-line'),
              borderWidth: 1,
              padding: 10,
              cornerRadius: 8,
              callbacks: { label: (ctx) => `${ctx.parsed.y}% accepted` },
            },
          },
          scales: {
            x: {
              grid: { display: false },
              border: { color: token('--c-line') },
              ticks: { color: token('--c-muted'), font: baseFont(), maxRotation: 0, autoSkipPadding: 14 },
            },
            y: {
              suggestedMin: 95,
              suggestedMax: 100,
              grid: { color: alpha('--c-line', 0.8), drawTicks: false },
              border: { display: false },
              ticks: { color: token('--c-muted'), font: baseFont(), padding: 6, maxTicksLimit: 5, callback: (v) => v + '%' },
            },
          },
        }),
      });
    });
  };

  Ch.platformBars = function (id) {
    const series = Mira.data.platformSeries || [];
    return mount(id, (canvas) => {
      return new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
          labels: series.map((row) => row.label),
          datasets: [
            {
              label: 'Active subscribers',
              data: series.map((row) => row.value),
              backgroundColor: [token('--c-primary'), token('--c-success'), token('--c-muted')],
              borderRadius: 4,
              maxBarThickness: 18,
            },
          ],
        },
        options: baseOptions({
          indexAxis: 'y',
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: token('--c-surface'),
              titleColor: token('--c-ink'),
              bodyColor: token('--c-sub'),
              borderColor: token('--c-line'),
              borderWidth: 1,
              padding: 10,
              cornerRadius: 8,
              callbacks: { label: (ctx) => `${ctx.parsed.x.toLocaleString()} subscribers` },
            },
          },
          scales: {
            x: {
              beginAtZero: true,
              grid: { color: alpha('--c-line', 0.8), drawTicks: false },
              border: { display: false },
              ticks: { color: token('--c-muted'), font: baseFont(), maxTicksLimit: 4, callback: (v) => Mira.fmt.compact(v) },
            },
            y: {
              grid: { display: false },
              border: { display: false },
              ticks: { color: token('--c-sub'), font: { ...baseFont(), size: 12 }, padding: 4 },
            },
          },
        }),
      });
    });
  };

  Ch.deliveryBreakdown = function (id, accepted, failed, pending) {
    return mount(id, (canvas) => {
      const values = [accepted, failed, pending];
      return new Chart(canvas.getContext('2d'), {
        type: 'doughnut',
        data: {
          labels: ['Accepted', 'Failed', 'Pending'],
          datasets: [
            {
              data: values,
              backgroundColor: [token('--c-success'), token('--c-danger'), token('--c-muted')],
              borderColor: token('--c-surface'),
              borderWidth: 3,
              hoverOffset: 3,
            },
          ],
        },
        options: baseOptions({
          cutout: '70%',
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: token('--c-surface'),
              titleColor: token('--c-ink'),
              bodyColor: token('--c-sub'),
              borderColor: token('--c-line'),
              borderWidth: 1,
              padding: 10,
              cornerRadius: 8,
            },
            centerLabel: { value: String(accepted + failed + pending), label: 'deliveries' },
          },
          scales: {},
        }),
        plugins: [centerLabel],
      });
    });
  };

  // Rebuild every chart when theme tokens change.
  window.addEventListener('mira:theme', () => {
    window.setTimeout(() => {
      if (typeof window.MiraRenderCharts === 'function') window.MiraRenderCharts();
    }, 40);
  });
})();
