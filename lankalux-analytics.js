/* Paste a GA4 Measurement ID (G-XXXXXXXX) to enable analytics. Leave empty until you have one. */
(function () {
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
