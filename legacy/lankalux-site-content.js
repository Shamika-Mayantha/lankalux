/*
 * LankaLux site content: reviews and photos managed from admin.lankalux.com.
 *
 * The HTML keeps its built-in reviews and photos. This script fetches the
 * published content and swaps it in; if admin is unreachable nothing changes.
 *   - photos: { "images/fleet/voxy1.jpg": "https://…/new.jpg" } replaces every
 *     <img> and inline background that uses that original file, including
 *     images added later (gallery modals).
 *   - reviews: { "home": [{ quote, author }], "signature-journey": [...] }
 *     rebuilds the #reviewTrack carousel for the current page.
 */
(function () {
  'use strict';

  var FEED_URL = 'https://admin.lankalux.com/api/site-content';
  var CACHE_KEY = 'lankalux-site-content-v1';
  var photos = {};

  function readCache() {
    try {
      var raw = window.sessionStorage.getItem(CACHE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function writeCache(content) {
    try {
      window.sessionStorage.setItem(CACHE_KEY, JSON.stringify(content));
    } catch (e) {}
  }

  function pageKey() {
    var last = window.location.pathname.replace(/\/+$/, '').replace(/\.html$/, '').split('/').pop();
    return !last || last === 'index' ? 'home' : last;
  }

  /* Original site path ("images/fleet/voxy1.jpg") for a URL on this site, or null. */
  function photoKey(url) {
    if (!url) return null;
    try {
      var u = new URL(url, window.location.href);
      var host = u.hostname.replace(/^www\./, '');
      if (u.origin !== window.location.origin && host !== 'lankalux.com') return null;
      return decodeURIComponent(u.pathname).replace(/^\/+/, '');
    } catch (e) {
      return null;
    }
  }

  function swapImg(img) {
    var key = photoKey(img.getAttribute('src'));
    var next = key && photos[key];
    if (!next) return;
    img.removeAttribute('srcset');
    img.setAttribute('src', next);
  }

  function swapBackground(el) {
    var style = el.getAttribute('style') || '';
    if (style.indexOf('url(') === -1) return;
    var changed = false;
    var updated = style.replace(/url\((['"]?)([^'")]+)\1\)/g, function (match, quote, url) {
      var key = photoKey(url);
      if (key && photos[key]) {
        changed = true;
        return "url('" + photos[key].replace(/'/g, '%27') + "')";
      }
      return match;
    });
    if (changed) el.setAttribute('style', updated);
  }

  /* Lazy backgrounds (data-bg) haven't loaded yet: point them at the new photo up front. */
  function swapLazyBackground(el) {
    var key = photoKey(el.getAttribute('data-bg'));
    var next = key && photos[key];
    if (next) el.setAttribute('data-bg', next);
  }

  function swapWithin(root) {
    if (!root || root.nodeType !== 1) return;
    if (root.tagName === 'IMG') swapImg(root);
    if (root.hasAttribute('style')) swapBackground(root);
    if (root.hasAttribute('data-bg')) swapLazyBackground(root);
    var lazy = root.querySelectorAll('[data-bg]');
    for (var k = 0; k < lazy.length; k++) swapLazyBackground(lazy[k]);
    var imgs = root.getElementsByTagName('img');
    for (var i = 0; i < imgs.length; i++) swapImg(imgs[i]);
    var styled = root.querySelectorAll('[style*="url("]');
    for (var j = 0; j < styled.length; j++) swapBackground(styled[j]);
  }

  var observer = null;
  function applyPhotos(map) {
    photos = map || {};
    if (!Object.keys(photos).length) return;
    swapWithin(document.body);
    if (observer || !window.MutationObserver) return;
    observer = new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var m = mutations[i];
        if (m.type === 'attributes') {
          if (m.target.tagName === 'IMG' && m.attributeName === 'src') swapImg(m.target);
          else if (m.attributeName === 'style') swapBackground(m.target);
        } else {
          for (var j = 0; j < m.addedNodes.length; j++) swapWithin(m.addedNodes[j]);
        }
      }
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src', 'style'],
    });
  }

  var renderedReviews = '';
  function applyReviews(byPage) {
    var list = byPage && byPage[pageKey()];
    var track = document.getElementById('reviewTrack');
    if (!track || !list || !list.length) return;

    var signature = JSON.stringify(list);
    if (signature === renderedReviews) return;

    var firstGrid = track.querySelector('.review-grid');
    var perSlide = (firstGrid && firstGrid.querySelectorAll('.review').length) || 3;
    var sampleReview = track.querySelector('.review');
    var reviewClass = (sampleReview && sampleReview.className) || 'review active';
    var sampleName = track.querySelector('.review span');
    var namePrefix = sampleName && /^\s*[—–]/.test(sampleName.textContent) ? '— ' : '';

    var fragment = document.createDocumentFragment();
    for (var i = 0; i < list.length; i += perSlide) {
      var slide = document.createElement('div');
      slide.className = 'review-slide';
      var grid = document.createElement('div');
      grid.className = 'review-grid';
      list.slice(i, i + perSlide).forEach(function (item) {
        var review = document.createElement('div');
        review.className = reviewClass;
        review.appendChild(document.createTextNode('"' + item.quote + '"'));
        var name = document.createElement('span');
        name.textContent = namePrefix + item.author;
        review.appendChild(name);
        grid.appendChild(review);
      });
      slide.appendChild(grid);
      fragment.appendChild(slide);
    }

    track.innerHTML = '';
    track.appendChild(fragment);
    track.style.transform = 'translateX(0)';
    renderedReviews = signature;
    if (typeof window.LankaLuxRefreshReviews === 'function') window.LankaLuxRefreshReviews();
  }

  function apply(content) {
    if (!content || typeof content !== 'object') return;
    try {
      applyPhotos(content.photos);
      applyReviews(content.reviews);
    } catch (e) {
      if (window.console) console.warn('LankaLux site content:', e);
    }
  }

  function load() {
    apply(readCache());
    if (!window.fetch) return;
    var controller = window.AbortController ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, 6000) : null;
    fetch(FEED_URL, { signal: controller ? controller.signal : undefined, credentials: 'omit' })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (json) {
        if (!json || json.success !== true) return;
        var content = { photos: json.photos || {}, reviews: json.reviews || {} };
        writeCache(content);
        apply(content);
      })
      .catch(function () {})
      .then(function () { if (timer) clearTimeout(timer); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', load);
  } else {
    load();
  }
})();
