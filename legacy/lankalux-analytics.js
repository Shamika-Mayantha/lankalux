/* Site analytics and enquiry attribution.
 * - Vercel Web Analytics (cookie-free page views) loads on lankalux.com once it is enabled in the Vercel project.
 * - Remembers how a visitor found the site (search, Instagram, an ad link...) and the first page they saw,
 *   so each enquiry sent to admin carries it: window.LankaLuxAttribution().
 * - Paste a GA4 Measurement ID (G-XXXXXXXX) into window.LANKALUX_GA_MEASUREMENT_ID to also enable Google Analytics.
 */
(function () {
  var KEY = 'lankalux_visit_source';
  var MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

  function clip(value, max) {
    return value ? String(value).slice(0, max) : '';
  }

  function referrerHost() {
    try {
      return document.referrer ? new URL(document.referrer).hostname.replace(/^www\./, '') : '';
    } catch (e) {
      return '';
    }
  }

  function readStored() {
    try {
      var v = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (v && v.at && Date.now() - v.at < MAX_AGE_MS) return v;
    } catch (e) {}
    return null;
  }

  // Keep the latest outside visit (a search, a social link, a campaign link); internal clicks and
  // typed-in visits do not replace an earlier source.
  (function remember() {
    var params = new URLSearchParams(location.search);
    var host = referrerHost();
    var external = host && !/(^|\.)lankalux\.com$/.test(host) && host !== location.hostname;
    var campaign = params.get('utm_source') || params.get('gclid') || params.get('fbclid');
    var stored = readStored();
    if (stored && !external && !campaign) return;
    var visit = {
      at: Date.now(),
      landingPage: clip(location.pathname, 200),
      referrer: external ? clip(host, 120) : '',
      utmSource: clip(params.get('utm_source') || (params.get('gclid') ? 'google-ads' : params.get('fbclid') ? 'facebook' : ''), 80),
      utmMedium: clip(params.get('utm_medium') || (params.get('gclid') ? 'cpc' : ''), 80),
      utmCampaign: clip(params.get('utm_campaign'), 120)
    };
    try {
      localStorage.setItem(KEY, JSON.stringify(visit));
    } catch (e) {}
    window.__lankaluxVisit = visit;
  })();

  window.LankaLuxAttribution = function () {
    var v = window.__lankaluxVisit || readStored() || {};
    return {
      landingPage: v.landingPage || '',
      referrer: v.referrer || '',
      utmSource: v.utmSource || '',
      utmMedium: v.utmMedium || '',
      utmCampaign: v.utmCampaign || '',
      enquiryPage: clip(location.pathname, 200)
    };
  };

  if (/(^|\.)lankalux\.com$/.test(location.hostname)) {
    window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
    var va = document.createElement('script');
    va.defer = true;
    va.src = '/_vercel/insights/script.js';
    document.head.appendChild(va);
  }

  var id = window.LANKALUX_GA_MEASUREMENT_ID || '';
  if (!id || String(id).indexOf('G-') !== 0) return;

  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
  document.head.appendChild(s);

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', id, { anonymize_ip: true });

  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a') : null;
    if (!a || !a.href) return;
    var href = a.getAttribute('href') || '';
    if (href.indexOf('wa.me') !== -1 || href.indexOf('whatsapp') !== -1) {
      gtag('event', 'whatsapp_click', { event_category: 'contact' });
    } else if (href.indexOf('mailto:') === 0) {
      gtag('event', 'email_click', { event_category: 'contact' });
    }
  });

  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target.closest('button, a') : null;
    if (!t) return;
    var label = (t.id || t.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80);
    if (t.id === 'planJourneyBtn' || t.id === 'promoPlanJourneyBtn' || t.id === 'headerContactBtn') {
      gtag('event', 'cta_click', { event_category: 'engagement', event_label: label });
    }
  });
})();
