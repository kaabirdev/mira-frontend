/* Mira frontend demo dataset.
   Deterministic fixture data used to design against real API shapes.
   Replace with fetches to /v1 in the Laravel integration. */
(function () {
  const SEED = 20261110;

  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rand = mulberry32(SEED);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const between = (min, max) => Math.floor(rand() * (max - min + 1)) + min;

  function daysAgo(n, hour, minute) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    d.setHours(hour == null ? 9 : hour, minute == null ? 0 : minute, 0, 0);
    return d.toISOString();
  }
  function minutesAgo(n) {
    return new Date(Date.now() - n * 60000).toISOString();
  }
  function dateLabel(iso) {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  function longDate(iso) {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  const projects = [
    {
      id: 'prj_9f2c41',
      name: 'Acme Production',
      initials: 'AP',
      env: 'live',
      plan: 'Free',
      subscribers: 24318,
      active: 22904,
      usedToday: 812,
      dailyLimit: 1000,
      web: 15574,
      android: 5490,
      ios: 1840,
      createdAt: daysAgo(214, 11, 20),
    },
    {
      id: 'prj_4a71b8',
      name: 'Acme Staging',
      initials: 'AS',
      env: 'test',
      plan: 'Free',
      subscribers: 1842,
      active: 1698,
      usedToday: 164,
      dailyLimit: 1000,
      web: 1204,
      android: 361,
      ios: 133,
      createdAt: daysAgo(96, 15, 5),
    },
    {
      id: 'prj_c81b02',
      name: 'Sidecar',
      initials: 'SC',
      env: 'live',
      plan: 'Free',
      subscribers: 4861,
      active: 4402,
      usedToday: 371,
      dailyLimit: 1000,
      web: 3120,
      android: 944,
      ios: 338,
      createdAt: daysAgo(38, 9, 45),
    },
  ];

  // 14-day delivery series. Today's total equals the quota usage (812).
  const acceptedPattern = [638, 702, 594, 811, 742, 689, 903, 846, 771, 958, 694, 733, 881, 802];
  const failedPattern = [6, 9, 4, 11, 7, 5, 14, 8, 6, 17, 9, 4, 12, 10];
  const deliveriesSeries = acceptedPattern.map((accepted, i) => {
    const iso = daysAgo(13 - i, 0, 0);
    return {
      date: iso,
      label: dateLabel(iso),
      accepted,
      failed: failedPattern[i],
      total: accepted + failedPattern[i],
      successRate: +((accepted / (accepted + failedPattern[i])) * 100).toFixed(2),
    };
  });

  // Subscriber growth (active subscribers, cumulative)
  const growthBase = [21680, 21764, 21829, 21904, 22038, 22110, 22195, 22271, 22348, 22405, 22476, 22554, 22680, 22904];
  const growthSeries = growthBase.map((value, i) => ({
    date: daysAgo(13 - i, 0, 0),
    label: dateLabel(daysAgo(13 - i, 0, 0)),
    value,
    newSubscribers: i === 0 ? 84 : value - growthBase[i - 1],
  }));

  const platformSeries = [
    { key: 'web', label: 'Web Push', value: 15574, color: '#2563eb' },
    { key: 'android', label: 'Android · FCM', value: 5490, color: '#16a34a' },
    { key: 'ios', label: 'iOS · APNs', value: 1840, color: '#64748b' },
  ];

  const notifications = [
    {
      id: 'ntf_01JCH4K9X2',
      title: 'Weekly digest · Nov 9',
      body: '3 new updates in your workspace this week.',
      url: 'https://app.acme.dev/digest',
      status: 'completed',
      target: { type: 'segment', label: 'Segment: Active web' },
      audience: 'Segment: Active web',
      createdAt: minutesAgo(42),
      completedAt: minutesAgo(40),
      total: 840,
      accepted: 836,
      failed: 4,
      pending: 0,
      platforms: ['Web Push'],
      idempotencyKey: 'digest-2026-11-09',
    },
    {
      id: 'ntf_01JCGZ7M4Q',
      title: 'Your trial ends in 3 days',
      body: 'Upgrade to keep your projects running without interruption.',
      url: 'https://app.acme.dev/billing',
      status: 'completed',
      target: { type: 'segment', label: 'Segment: Trial ending' },
      audience: 'Segment: Trial ending',
      createdAt: minutesAgo(190),
      completedAt: minutesAgo(187),
      total: 128,
      accepted: 121,
      failed: 7,
      pending: 0,
      platforms: ['Web Push', 'Android · FCM'],
      idempotencyKey: null,
    },
    {
      id: 'ntf_01JCFX2B8N',
      title: 'Deploy succeeded',
      body: 'acme/api v2.14.0 deployed to production in 48s.',
      url: 'https://app.acme.dev/deploys/4821',
      status: 'processing',
      target: { type: 'individual', label: 'sub_01JCF00019' },
      audience: 'Individual subscriber',
      createdAt: minutesAgo(260),
      completedAt: null,
      total: 1,
      accepted: 1,
      failed: 0,
      pending: 0,
      platforms: ['Web Push'],
      idempotencyKey: null,
    },
    {
      id: 'ntf_01JCF4R6T0',
      title: 'Security alert: new sign-in',
      body: 'A new device signed in from Berlin, DE. If this was you, no action is needed.',
      url: 'https://app.acme.dev/security',
      status: 'completed',
      target: { type: 'segment', label: 'Segment: Admins' },
      audience: 'Segment: Admins',
      createdAt: minutesAgo(410),
      completedAt: minutesAgo(407),
      total: 24,
      accepted: 24,
      failed: 0,
      pending: 0,
      platforms: ['Web Push', 'iOS · APNs'],
      idempotencyKey: 'security-48211',
    },
    {
      id: 'ntf_01JCEW9K1P',
      title: 'New dashboard is live',
      body: 'Charts, delivery logs and API keys now live in one place.',
      url: 'https://acme.dev/changelog',
      status: 'completed',
      target: { type: 'all', label: 'All subscribers' },
      audience: 'All subscribers',
      createdAt: daysAgo(1, 16, 20),
      completedAt: daysAgo(1, 16, 24),
      total: 1712,
      accepted: 1688,
      failed: 24,
      pending: 0,
      platforms: ['Web Push', 'Android · FCM', 'iOS · APNs'],
      idempotencyKey: 'launch-dashboard',
    },
    {
      id: 'ntf_01JCE0P2S7',
      title: 'Payment received',
      body: 'Your receipt for November is ready to download.',
      url: 'https://app.acme.dev/receipts/1109',
      status: 'failed',
      target: { type: 'segment', label: 'Segment: Paying teams' },
      audience: 'Segment: Paying teams',
      createdAt: daysAgo(1, 9, 5),
      completedAt: daysAgo(1, 9, 8),
      total: 312,
      accepted: 268,
      failed: 44,
      pending: 0,
      platforms: ['Android · FCM'],
      idempotencyKey: null,
    },
    {
      id: 'ntf_01JCD7H5V3',
      title: 'Comment on “Billing migration”',
      body: 'Ava replied to your thread.',
      url: 'https://app.acme.dev/inbox',
      status: 'completed',
      target: { type: 'individual', label: 'sub_01JCD00007' },
      audience: 'Individual subscriber',
      createdAt: daysAgo(2, 12, 41),
      completedAt: daysAgo(2, 12, 41),
      total: 1,
      accepted: 1,
      failed: 0,
      pending: 0,
      platforms: ['iOS · APNs'],
      idempotencyKey: null,
    },
    {
      id: 'ntf_01JCC2M8W6',
      title: 'Scheduled maintenance · Nov 12',
      body: 'The API will be read-only for 10 minutes starting 02:00 UTC.',
      url: 'https://status.acme.dev',
      status: 'completed',
      target: { type: 'all', label: 'All subscribers' },
      audience: 'All subscribers',
      createdAt: daysAgo(3, 8, 0),
      completedAt: daysAgo(3, 8, 6),
      total: 1698,
      accepted: 1671,
      failed: 27,
      pending: 0,
      platforms: ['Web Push', 'Android · FCM', 'iOS · APNs'],
      idempotencyKey: 'maintenance-nov12',
    },
    {
      id: 'ntf_01JCB8Q1R9',
      title: 'Your weekly report is ready',
      body: 'Open the report to see delivery performance for your projects.',
      url: 'https://app.acme.dev/reports/weekly',
      status: 'queued',
      target: { type: 'segment', label: 'Segment: Growth plans' },
      audience: 'Segment: Growth plans',
      createdAt: daysAgo(4, 17, 30),
      completedAt: null,
      total: 460,
      accepted: 0,
      failed: 0,
      pending: 460,
      platforms: ['Web Push'],
      idempotencyKey: null,
    },
    {
      id: 'ntf_01JCA3T6Y1',
      title: 'Invite accepted',
      body: 'Sam joined Acme Production as a developer.',
      url: 'https://app.acme.dev/team',
      status: 'completed',
      target: { type: 'segment', label: 'Segment: Admins' },
      audience: 'Segment: Admins',
      createdAt: daysAgo(5, 11, 12),
      completedAt: daysAgo(5, 11, 12),
      total: 24,
      accepted: 24,
      failed: 0,
      pending: 0,
      platforms: ['Web Push', 'iOS · APNs'],
      idempotencyKey: null,
    },
    {
      id: 'ntf_01JC9V0D4K',
      title: 'Weekend flash sale',
      body: '30% off annual plans until Monday. Use code WEEKEND30.',
      url: 'https://acme.dev/pricing',
      status: 'completed',
      target: { type: 'segment', label: 'Segment: Free plans' },
      audience: 'Segment: Free plans',
      createdAt: daysAgo(6, 10, 0),
      completedAt: daysAgo(6, 10, 11),
      total: 1204,
      accepted: 1173,
      failed: 31,
      pending: 0,
      platforms: ['Web Push', 'Android · FCM'],
      idempotencyKey: 'weekend30',
    },
    {
      id: 'ntf_01JC8N5X2Z',
      title: 'API key expiring soon',
      body: 'The key “Legacy worker” expires in 7 days.',
      url: 'https://app.acme.dev/settings/keys',
      status: 'completed',
      target: { type: 'segment', label: 'Segment: Admins' },
      audience: 'Segment: Admins',
      createdAt: daysAgo(7, 9, 0),
      completedAt: daysAgo(7, 9, 2),
      total: 12,
      accepted: 12,
      failed: 0,
      pending: 0,
      platforms: ['Web Push'],
      idempotencyKey: null,
    },
  ];

  const devicePool = [
    { platform: 'web', label: 'Chrome 131 · macOS 15', source: 'Web Push' },
    { platform: 'web', label: 'Chrome 131 · Windows 11', source: 'Web Push' },
    { platform: 'web', label: 'Safari 18 · macOS 15', source: 'Web Push' },
    { platform: 'web', label: 'Firefox 133 · Ubuntu 24.04', source: 'Web Push' },
    { platform: 'web', label: 'Edge 131 · Windows 11', source: 'Web Push' },
    { platform: 'android', label: 'Pixel 9 · Android 15', source: 'FCM' },
    { platform: 'android', label: 'Galaxy S24 · Android 14', source: 'FCM' },
    { platform: 'android', label: 'OnePlus 12 · Android 14', source: 'FCM' },
    { platform: 'ios', label: 'iPhone 16 Pro · iOS 18.1', source: 'APNs' },
    { platform: 'ios', label: 'iPhone 13 · iOS 17.7', source: 'APNs' },
  ];
  const countryPool = ['United States', 'Germany', 'India', 'United Kingdom', 'Brazil', 'Canada', 'Netherlands', 'Japan'];
  const statusPool = ['active', 'active', 'active', 'active', 'active', 'active', 'expired', 'unsubscribed'];

  const subscribers = Array.from({ length: 28 }, (_, i) => {
    const device = pick(devicePool);
    const lastSeenDays = i < 18 ? 0 : between(1, 21);
    const createdDays = 4 + i * 5 + between(0, 3);
    return {
      id: 'sub_01J' + (4600 + i * 37).toString(36).toUpperCase() + i.toString().padStart(2, '0'),
      platform: device.platform,
      device: device.label,
      provider: device.source,
      country: pick(countryPool),
      status: i < 22 ? (i < 20 ? 'active' : 'expired') : pick(statusPool),
      createdAt: daysAgo(createdDays, between(6, 20), between(0, 59)),
      lastSeenAt: daysAgo(lastSeenDays, between(7, 22), between(0, 59)),
      notifications: between(4, 96),
      token: 'p256dh:' + Math.random().toString(36).slice(2, 10) + '…',
    };
  });

  const deliveryStatusPool = ['accepted', 'accepted', 'accepted', 'accepted', 'accepted', 'accepted', 'accepted', 'failed', 'pending', 'expired'];
  const deliveryRows = Array.from({ length: 34 }, (_, i) => {
    const notification = notifications[i % 10];
    const subscriber = subscribers[(i * 3) % subscribers.length];
    const status = i === 0 ? 'processing' : i === 1 ? 'queued' : pick(deliveryStatusPool);
    return {
      id: 'dlv_01J' + (7200 + i * 13).toString(36).toUpperCase(),
      notificationId: notification.id,
      notificationTitle: notification.title,
      subscriberId: subscriber.id,
      platform: subscriber.platform,
      provider: subscriber.provider,
      status,
      attempts: status === 'failed' ? between(2, 4) : status === 'accepted' ? 1 : between(0, 1),
      latency: status === 'accepted' ? between(84, 940) : null,
      error: status === 'failed' ? pick(['Provider returned 410 Gone', 'Token unregistered (FCM)', 'APNs BadDeviceToken', 'Request timed out after 10s']) : null,
      createdAt: minutesAgo(i * 7 + between(0, 4)),
    };
  });

  const apiKeys = [
    {
      id: 'key_01JAB2',
      name: 'Production server',
      type: 'secret',
      env: 'live',
      prefix: 'mira_sk_live_…f9a2',
      scopes: ['notifications:send', 'notifications:read', 'subscribers:read', 'subscribers:write', 'usage:read'],
      createdAt: daysAgo(190, 10, 20),
      lastUsedAt: minutesAgo(2),
      expiresAt: null,
      status: 'active',
    },
    {
      id: 'key_01JAB3',
      name: 'Web frontend',
      type: 'publishable',
      env: 'live',
      prefix: 'mira_pk_live_…4d2e',
      scopes: ['subscribers:write'],
      createdAt: daysAgo(190, 10, 22),
      lastUsedAt: minutesAgo(6),
      expiresAt: null,
      status: 'active',
    },
    {
      id: 'key_01JAC8',
      name: 'Staging server',
      type: 'secret',
      env: 'test',
      prefix: 'mira_sk_test_…7c03',
      scopes: ['notifications:send', 'notifications:read', 'subscribers:read', 'subscribers:write', 'webhooks:manage'],
      createdAt: daysAgo(96, 15, 8),
      lastUsedAt: minutesAgo(48),
      expiresAt: daysAgo(-90, 0, 0),
      status: 'active',
    },
    {
      id: 'key_01JA17',
      name: 'Legacy worker',
      type: 'secret',
      env: 'live',
      prefix: 'mira_sk_live_…0b7d',
      scopes: ['notifications:send', 'usage:read'],
      createdAt: daysAgo(365, 9, 0),
      lastUsedAt: daysAgo(64, 11, 0),
      expiresAt: daysAgo(7, 0, 0),
      status: 'revoked',
    },
  ];

  const webhooks = [
    {
      id: 'whk_01J88A',
      url: 'https://api.acme.dev/hooks/mira',
      description: 'Production event relay',
      env: 'live',
      events: ['notification.queued', 'notification.accepted', 'notification.failed', 'notification.completed', 'subscriber.created', 'subscriber.expired', 'quota.warning', 'quota.exceeded'],
      status: 'active',
      secret: 'whsec_8f2a…c41d',
      successRate: 99.4,
      lastDeliveryAt: minutesAgo(3),
      createdAt: daysAgo(150, 12, 0),
    },
    {
      id: 'whk_01J91C',
      url: 'https://hooks.acme.dev/staging/mira',
      description: 'Staging integration tests',
      env: 'test',
      events: ['notification.completed', 'notification.failed', 'subscriber.created'],
      status: 'active',
      secret: 'whsec_2b7c…90aa',
      successRate: 96.1,
      lastDeliveryAt: minutesAgo(36),
      createdAt: daysAgo(88, 9, 30),
    },
    {
      id: 'whk_01J7D2',
      url: 'https://old.acme.dev/webhook',
      description: 'Legacy endpoint — disabled after repeated 404s',
      env: 'live',
      events: ['notification.completed'],
      status: 'disabled',
      secret: 'whsec_4c1d…88fe',
      successRate: 41.7,
      lastDeliveryAt: daysAgo(19, 14, 0),
      createdAt: daysAgo(210, 10, 0),
    },
  ];

  const webhookDeliveries = [
    { id: 'evt_01JCH9', event: 'notification.completed', endpoint: webhooks[0].url, status: 200, duration: 142, attempts: 1, createdAt: minutesAgo(3) },
    { id: 'evt_01JCH8', event: 'notification.accepted', endpoint: webhooks[0].url, status: 200, duration: 118, attempts: 1, createdAt: minutesAgo(11) },
    { id: 'evt_01JCH7', event: 'subscriber.created', endpoint: webhooks[0].url, status: 200, duration: 96, attempts: 1, createdAt: minutesAgo(18) },
    { id: 'evt_01JCH6', event: 'notification.completed', endpoint: webhooks[1].url, status: 200, duration: 208, attempts: 1, createdAt: minutesAgo(36) },
    { id: 'evt_01JCH5', event: 'quota.warning', endpoint: webhooks[0].url, status: 200, duration: 131, attempts: 1, createdAt: minutesAgo(52) },
    { id: 'evt_01JCH4', event: 'notification.failed', endpoint: webhooks[1].url, status: 503, duration: 3000, attempts: 4, createdAt: minutesAgo(74) },
    { id: 'evt_01JCH3', event: 'notification.queued', endpoint: webhooks[0].url, status: 200, duration: 87, attempts: 1, createdAt: minutesAgo(96) },
    { id: 'evt_01JCH2', event: 'subscriber.expired', endpoint: webhooks[0].url, status: 429, duration: 204, attempts: 3, createdAt: minutesAgo(128) },
  ];

  const activity = [
    { type: 'notification', title: 'Weekly digest · Nov 9 completed', meta: '836 accepted · 4 failed', at: minutesAgo(40), icon: 'send' },
    { type: 'subscriber', title: '128 new subscribers', meta: 'Web Push · last 24 hours', at: minutesAgo(65), icon: 'users' },
    { type: 'webhook', title: 'Webhook delivered', meta: 'notification.completed · 200 OK', at: minutesAgo(52), icon: 'webhook' },
    { type: 'key', title: 'API key used', meta: 'Production server · 2 min ago', at: minutesAgo(120), icon: 'key-round' },
    { type: 'quota', title: 'Quota warning at 80%', meta: '812 of 1,000 delivery units used', at: minutesAgo(190), icon: 'gauge' },
    { type: 'subscriber', title: 'Token expired', meta: 'sub_01J46A0 expired on APNs', at: minutesAgo(240), icon: 'alert-triangle' },
  ];

  const usage = {
    today: { used: 812, limit: 1000, warningAt: 800 },
    month: { delivered: 19842, failed: 274, total: 20116, notifications: 128, avgDaily: 670 },
    yesterday: { used: 891, limit: 1000 },
    platformUsage: [
      { platform: 'Web Push', units: 12240, share: 61.7 },
      { platform: 'Android · FCM', units: 5478, share: 27.6 },
      { platform: 'iOS · APNs', units: 2124, share: 10.7 },
    ],
    history: deliveriesSeries.map((row) => ({
      date: row.date,
      label: row.label,
      units: row.total,
      limit: 1000,
    })),
    plan: {
      name: 'Free',
      price: '$0',
      dailyLimit: 1000,
      retention: '7 days',
      features: ['1 project on this plan', 'Web Push, FCM and APNs', 'Delivery logs · 7 days', 'Community support'],
    },
  };

  window.MiraData = {
    user: { name: 'Kabir Sharma', email: 'kabir@acme.dev', role: 'Owner', initials: 'KS' },
    projects,
    kpis: {
      subscribers: 22904,
      subscribersChange: 3.2,
      notifications: 128,
      notificationsChange: 8.4,
      accepted: 19842,
      failed: 274,
      successRate: 98.64,
      successRateChange: 0.6,
      quotaUsed: 812,
      quotaLimit: 1000,
    },
    deliveriesSeries,
    growthSeries,
    platformSeries,
    notifications,
    subscribers,
    deliveries: deliveryRows,
    apiKeys,
    webhooks,
    webhookDeliveries,
    activity,
    usage,
    dateLabel,
    longDate,
    daysAgo,
    minutesAgo,
  };

  // Convenience aliases used by the marketing pages.
  window.MiraData.util = { dateLabel, longDate };
})();
