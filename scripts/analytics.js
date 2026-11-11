import posthog from 'posthog-js/dist/module.no-external';

const privacyRequested = navigator.globalPrivacyControl === true || navigator.doNotTrack === '1';
const preferenceKey = 'mas-analytics-consent-v1';
let started = false;
let consent = null;
try {
  const saved = JSON.parse(localStorage.getItem(preferenceKey));
  if (saved && Date.now() - saved.time < 180 * 86400000) consent = saved.value;
} catch { /* Unavailable storage leaves analytics off. */ }

function start() {
  if (started || consent !== 'accepted' || privacyRequested) return;
  started = true;
  posthog.init(POSTHOG_TOKEN, {
    api_host: POSTHOG_HOST,
    defaults: '2026-05-30',
    persistence: 'localStorage',
    person_profiles: 'never',
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: false,
    disable_session_recording: true,
    enable_heatmaps: false,
    capture_performance: false,
    capture_exceptions: false,
    disable_surveys: true,
    advanced_disable_flags: true,
    before_send(event) {
      if (consent !== 'accepted' || !['$pageview', 'checkout_clicked'].includes(event.event)) return null;
      const allowed = ['token', 'distinct_id', '$device_id', '$session_id', '$lib', '$lib_version', '$browser', '$os', '$device_type', '$screen_height', '$screen_width', '$viewport_height', '$viewport_width', '$insert_id', 'page_path', 'product', 'setup_test'];
      event.properties = Object.fromEntries(Object.entries(event.properties || {}).filter(([key]) => allowed.includes(key)));
      event.properties.$current_url = location.origin + location.pathname;
      return event;
    }
  });
  posthog.opt_in_capturing();
  posthog.capture('$pageview', {page_path: location.pathname});
  document.addEventListener('click', event => {
    const link = event.target.closest?.('a[href]');
    if (consent === 'accepted' && link && new URL(link.href).hostname === 'morrisonsaisolutions.lemonsqueezy.com') {
      posthog.capture('checkout_clicked', {product: 'vaultic', page_path: location.pathname}, {transport: 'sendBeacon'});
    }
  });
  // Keep the existing website counter behind the same visitor choice.
  const metricool = document.createElement('script');
  metricool.src = 'https://tracker.metricool.com/resources/be.js';
  metricool.onload = () => { if (consent === 'accepted') window.beTracker?.t({hash: 'fab140e3e8930aafc17006fe8b1c7925'}); };
  document.head.append(metricool);
}

const panel = document.createElement('section');
panel.className = 'analytics-choice';
panel.setAttribute('aria-label', 'Website analytics preferences');
panel.innerHTML = '<p>Allow optional website analytics? We use PostHog and Metricool to understand visits and checkout clicks. No session recordings. <a href="/legal/privacy/">Privacy details</a>.</p><p data-analytics-status></p><div><button type="button" data-choice="accepted">Allow analytics</button><button type="button" data-choice="rejected">Reject analytics</button></div>';
panel.hidden = consent !== null;
document.body.append(panel);
function showStatus() {
  panel.querySelector('[data-analytics-status]').textContent = privacyRequested ? 'Analytics is off because your browser requests privacy (Do Not Track or Global Privacy Control).' : consent === 'accepted' ? 'Your current choice: analytics allowed.' : consent === 'rejected' ? 'Your current choice: analytics rejected.' : 'Analytics stays off until you allow it.';
}
showStatus();
panel.addEventListener('click', event => {
  const value = event.target.dataset.choice;
  if (!value) return;
  consent = value;
  try { localStorage.setItem(preferenceKey, JSON.stringify({value, time: Date.now()})); } catch { /* This page's choice still applies. */ }
  showStatus();
  panel.hidden = true;
  if (value === 'accepted') start();
  else if (started) {
    posthog.opt_out_capturing();
    // Stop the existing third-party counter too; the saved preference prevents reload.
    location.reload();
  }
});
document.querySelectorAll('[data-analytics-settings]').forEach(button => {
  button.addEventListener('click', () => {panel.hidden = false; panel.querySelector('button').focus();});
});
start();
