/* Site analytics and enquiry attribution.
 * - Vercel Web Analytics is loaded by the Next.js app (@vercel/analytics).
 * - Remembers how a visitor found the site (search, Instagram, an ad link...) and the first page they saw,
 *   so each enquiry sent to admin carries it: window.LankaLuxAttribution().
 * - Google Analytics 4 and Google Ads load only when their ids are set (window.LANKALUX_TRACKING, filled from
 *   the NEXT_PUBLIC_* env vars in app/layout.tsx), with Consent Mode and window.LankaLuxTrack() for leads.
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

  // Google Analytics 4 and Google Ads, both off until their ids are set in Vercel (see app/layout.tsx).
  var cfg = window.LANKALUX_TRACKING || {};
  var gaId = cfg.ga || window.LANKALUX_GA_MEASUREMENT_ID || '';
  var adsId = cfg.ads || '';
  var labels = cfg.labels || {};
  if (String(gaId).indexOf('G-') !== 0) gaId = '';
  if (String(adsId).indexOf('AW-') !== 0) adsId = '';
  if (!gaId && !adsId) return;

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;

  // Consent Mode: nothing is stored until the visitor accepts on the cookie notice. Before that Google
  // only gets cookieless pings, which it uses to estimate conversions.
  var CONSENT_KEY = 'lankalux_consent';
  function consentValue(granted) {
    var v = granted ? 'granted' : 'denied';
    return { ad_storage: v, ad_user_data: v, ad_personalization: v, analytics_storage: v };
  }
  var saved = '';
  try { saved = localStorage.getItem(CONSENT_KEY) || ''; } catch (e) {}
  var defaults = consentValue(saved === 'granted');
  defaults.wait_for_update = 500;
  gtag('consent', 'default', defaults);
  window.LankaLuxConsent = function (granted) {
    try { localStorage.setItem(CONSENT_KEY, granted ? 'granted' : 'denied'); } catch (e) {}
    gtag('consent', 'update', consentValue(granted));
  };

  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(gaId || adsId);
  document.head.appendChild(s);

  gtag('js', new Date());
  if (gaId) gtag('config', gaId, { anonymize_ip: true });
  if (adsId) gtag('config', adsId);

  // One call per lead: a GA event, plus a Google Ads conversion when that action has a label.
  // Names: 'generate_lead' (enquiry form or a chat that became a request), 'whatsapp_click', 'email_click'.
  window.LankaLuxTrack = function (name, params) {
    gtag('event', name, params || {});
    if (adsId && labels[name]) gtag('event', 'conversion', { send_to: adsId + '/' + labels[name] });
  };

  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a') : null;
    if (!a || !a.href) return;
    var href = a.getAttribute('href') || '';
    if (href.indexOf('wa.me') !== -1 || href.indexOf('whatsapp') !== -1) {
      window.LankaLuxTrack('whatsapp_click', { event_category: 'contact' });
    } else if (href.indexOf('mailto:') === 0) {
      window.LankaLuxTrack('email_click', { event_category: 'contact' });
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
