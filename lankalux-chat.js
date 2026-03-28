(function () {
  'use strict';
  if (window.__LLX_CHAT_INIT__) return;
  window.__LLX_CHAT_INIT__ = true;
  if (!document.getElementById('llxChatFab')) {
    document.body.insertAdjacentHTML('beforeend', "<button id=\"llxChatFab\" class=\"llx-chat-fab\" type=\"button\" aria-label=\"Open chat\">\r\n  <svg viewBox=\"0 0 64 64\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\">\r\n    <circle cx=\"32\" cy=\"24\" r=\"10\" fill=\"currentColor\" opacity=\".18\"></circle>\r\n    <path d=\"M14 24a18 18 0 0 1 36 0\"></path>\r\n    <rect x=\"10\" y=\"24\" width=\"6\" height=\"12\" rx=\"2\"></rect>\r\n    <rect x=\"48\" y=\"24\" width=\"6\" height=\"12\" rx=\"2\"></rect>\r\n    <path d=\"M23 38c2 4 16 4 18 0\"></path>\r\n    <path d=\"M32 36v8\"></path>\r\n    <path d=\"M20 56c0-8 5-12 12-12s12 4 12 12\"></path>\r\n  </svg>\r\n  <span class=\"llx-chat-fab-tooltip\">Need help planning your Trip?</span>\r\n</button>\r\n<div id=\"llxChatPanel\" class=\"llx-chat-panel\" aria-live=\"polite\">\r\n  <div class=\"llx-chat-head\">\r\n    <div><strong>LankaLux AI</strong><small>Premium travel assistant</small></div>\r\n    <button id=\"llxChatClose\" class=\"llx-chat-close\" type=\"button\" aria-label=\"Close chat\">✕</button>\r\n  </div>\r\n  <div id=\"llxChatBody\" class=\"llx-chat-body\"></div>\r\n  <div class=\"llx-chat-foot\">\r\n    <div class=\"llx-chat-actions\">\r\n      <button id=\"llxSendRequest\" class=\"llx-chat-btn primary\" type=\"button\" disabled>Send request</button>\r\n      <button id=\"llxWhatsApp\" class=\"llx-chat-btn\" type=\"button\">WhatsApp</button>\r\n      <button id=\"llxEndChat\" class=\"llx-chat-btn\" type=\"button\">End chat</button>\r\n    </div>\r\n    <div class=\"llx-chat-row\">\r\n      <input id=\"llxChatInput\" class=\"llx-chat-input\" type=\"text\" placeholder=\"Type your message...\">\r\n      <button id=\"llxChatSend\" class=\"llx-chat-btn\" type=\"button\">Send</button>\r\n    </div>\r\n    <div class=\"llx-chat-note\">Send request when you are ready and our team will shape your itinerary with you.</div>\r\n  </div>\r\n</div>");
  }
  var CHAT_URL = 'https://admin.lankalux.com/api/chat';
  var REQUESTS_URL = 'https://admin.lankalux.com/api/requests';
  var CHATS_URL = 'https://admin.lankalux.com/api/chats';
  var WHATSAPP_NUMBER = '94763261788';
  var STORE_KEY = 'llx_chat_state_v3';
  var WELCOME_MESSAGE =
    "Hi, I'm your LankaLux assistant. I'll help you plan your Sri Lanka journey. What's your name?";
  var state = { messages: [], draft: {}, requestId: null, isTyping: false, vehicleShownAt: 0, selectedVehicle: null, sessionId: null, pendingAgentConnect: false, showEndRating: false, postRatingThanks: false };
  var VEHICLE_IMAGE_BASE = 'https://lankalux.com/images/fleet/';
  var VEHICLE_KEYWORDS = ['vehicle', 'vehicles', 'fleet', 'car', 'cars', 'van', 'vans', 'suv', 'jeep', 'transfer', 'transport'];
  var fallbackVehicles = [
    { name: 'Toyota Voxy', image: 'voxy1.jpg' },
    { name: 'Sedan', image: 'sedan1.jpg' },
    { name: 'Safari Jeep', image: 'safarijeep.jpg' },
    { name: 'Party Bus', image: 'partybus1.jpg' }
  ];

  try {
    var existing = localStorage.getItem(STORE_KEY);
    if (existing) {
      var parsed = JSON.parse(existing);
      if (parsed && typeof parsed === 'object') state = parsed;
    }
  } catch (e) {}
  if (!state.sessionId) state.sessionId = 'llx-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  if (state.pendingAgentConnect === undefined) state.pendingAgentConnect = false;
  if (state.showEndRating === undefined) state.showEndRating = false;
  if (state.postRatingThanks === undefined) state.postRatingThanks = false;

  var fab = document.getElementById('llxChatFab');
  var panel = document.getElementById('llxChatPanel');
  var closeBtn = document.getElementById('llxChatClose');
  var body = document.getElementById('llxChatBody');
  var input = document.getElementById('llxChatInput');
  var send = document.getElementById('llxChatSend');
  var sendRequestBtn = document.getElementById('llxSendRequest');
  var endChatBtn = document.getElementById('llxEndChat');
  var waBtn = document.getElementById('llxWhatsApp');
  var keyboardTick = 0;

  function saveState() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {}
  }
  function missingFields(d) {
    var m = [];
    if (!d.email && !d.whatsapp) m.push('email or WhatsApp');
    if (!d.startDate || !d.endDate) m.push('arrival and departure dates');
    if (d.numberOfAdults == null) m.push('number of adults');
    return m;
  }
  function formatChatDisplayText(role, content) {
    var s = String(content || '');
    if (role !== 'assistant') return s;
    return s
      .replace(/\u2013|\u2014|\u2212/g, ' ')
      .replace(/\s+-\s+/g, ', ')
      .replace(/^[•\-\u2022]\s*/gm, '');
  }
  function addMessage(role, content) { state.messages.push({ role: role, content: content, kind: 'text' }); }
  function isMobileViewport() {
    return window.matchMedia('(max-width: 1024px), (pointer: coarse)').matches;
  }
  function resetKeyboardLayout() {
    panel.classList.remove('llx-chat-panel--keyboard-open');
    fab.classList.remove('llx-chat-fab--hidden');
    document.body.classList.remove('llx-chat-open');
    panel.style.top = '';
    panel.style.bottom = '';
    panel.style.left = '';
    panel.style.right = '';
    panel.style.width = '';
    panel.style.height = '';
    panel.style.maxHeight = '';
  }
  /** On mobile, pin the panel to window.visualViewport so the keyboard does not crop the composer. */
  function applyKeyboardAwareLayout() {
    if (!panel.classList.contains('open') || !isMobileViewport()) {
      resetKeyboardLayout();
      return;
    }
    document.body.classList.add('llx-chat-open');
    var vv = window.visualViewport;
    panel.classList.add('llx-chat-panel--keyboard-open');
    fab.classList.add('llx-chat-fab--hidden');
    if (!vv) {
      panel.style.top = '0';
      panel.style.left = '0';
      panel.style.right = '0';
      panel.style.width = '100%';
      panel.style.bottom = '0';
      panel.style.height = '100dvh';
      panel.style.maxHeight = 'none';
      requestAnimationFrame(function() {
        body.scrollTop = body.scrollHeight;
      });
      return;
    }
    panel.style.top = vv.offsetTop + 'px';
    panel.style.left = '0';
    panel.style.right = '0';
    panel.style.width = '100%';
    panel.style.bottom = 'auto';
    panel.style.height = vv.height + 'px';
    panel.style.maxHeight = 'none';
    requestAnimationFrame(function() {
      body.scrollTop = body.scrollHeight;
    });
  }
  function focusInputNoScroll() {
    try {
      if (typeof input.focus === 'function') input.focus({ preventScroll: true });
    } catch (e) {
      input.focus();
    }
  }
  function scheduleKeyboardLayout() {
    clearTimeout(keyboardTick);
    keyboardTick = setTimeout(applyKeyboardAwareLayout, 40);
  }
  function applyChatControlsLock() {
    var lock = !!state.showEndRating;
    input.disabled = lock;
    send.disabled = lock;
    waBtn.disabled = lock;
    endChatBtn.disabled = lock;
    if (lock) {
      sendRequestBtn.disabled = true;
    } else if (state.requestId) {
      sendRequestBtn.disabled = true;
    } else {
      sendRequestBtn.disabled = missingFields(state.draft || {}).length > 0;
    }
  }
  function addVehiclesMessage() { state.messages.push({ role: 'assistant', content: '', kind: 'vehicles' }); state.vehicleShownAt = Date.now(); }
  async function persistChat(eventType, extras) {
    try {
      var payload = {
        sessionId: state.sessionId,
        eventType: eventType || 'message',
        draft: state.draft || {},
        requestId: state.requestId || null,
        selectedVehicle: state.selectedVehicle || null,
        messages: (state.messages || []).slice(-80),
        handoffRequested: !!(extras && extras.handoffRequested),
        pageUrl: window.location.href,
        userAgent: navigator.userAgent
      };
      fetch(CHATS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true
      }).catch(function() {});
    } catch (e) {}
  }
  function openEndChatRating() {
    if (state.showEndRating) return;
    state.showEndRating = true;
    render();
  }
  function shouldShowVehicles(userText) {
    var t = String(userText || '').toLowerCase();
    if (!t) return false;
    var matches = VEHICLE_KEYWORDS.some(function(k) { return t.indexOf(k) !== -1; });
    if (!matches) return false;
    var coolDownMs = 120000; // avoid showing cards repeatedly in short bursts
    return !state.vehicleShownAt || (Date.now() - state.vehicleShownAt > coolDownMs);
  }
  function wantsAgentHandoff(text) {
    var t = String(text || '').toLowerCase();
    if (!t) return false;
    return t.indexOf('connect me with an agent') !== -1
      || t.indexOf('connect to agent') !== -1
      || t.indexOf('talk to agent') !== -1
      || t.indexOf('speak to agent') !== -1
      || t.indexOf('human agent') !== -1
      || t.indexOf('whatsapp agent') !== -1
      || t.indexOf('message you on whatsapp') !== -1
      || t.indexOf('continue on whatsapp') !== -1;
  }
  function getChatVehicles() {
    try {
      if (typeof vehiclesData !== 'undefined' && vehiclesData && typeof vehiclesData === 'object') {
        var allVehicles = Object.keys(vehiclesData).map(function(key) { return vehiclesData[key]; });
        return allVehicles
          .map(function(v) {
            var firstImage = (Array.isArray(v.images) && v.images.length ? String(v.images[0]).trim() : '').trim();
            if (!firstImage) return null;
            var image = /^https?:\/\//i.test(firstImage)
              ? firstImage
              : (/^images\//i.test(firstImage) ? ('https://lankalux.com/' + firstImage) : (VEHICLE_IMAGE_BASE + firstImage));
            return { name: v.name || 'Vehicle', image: image };
          })
          .filter(function(v) { return !!v; });
      }
    } catch (e) {}
    return fallbackVehicles.map(function(v) { return { name: v.name, image: VEHICLE_IMAGE_BASE + v.image }; });
  }
  function onVehicleCardClick(vehicleName) {
    var name = String(vehicleName || '').trim();
    if (!name) return;
    state.selectedVehicle = name;
    state.draft = state.draft || {};
    if (!state.draft.message || String(state.draft.message).indexOf(name) === -1) {
      var base = state.draft.message ? String(state.draft.message).trim() + '\n' : '';
      state.draft.message = base + 'Interested vehicle: ' + name;
    }
    addMessage('user', 'I am interested in ' + name + '.');
    addMessage('assistant', 'Great choice. When you have dates and group size, mention them here or tap Send request.');
    render();
    persistChat('vehicle_selected');
  }
  function render() {
    body.innerHTML = '';
    if (state.pendingAgentConnect && !(state.messages || []).length && !state.isTyping) {
      var connectWrap = document.createElement('div');
      connectWrap.className = 'llx-chat-agent-connect';
      if (state.postRatingThanks) {
        var thanksP = document.createElement('p');
        thanksP.className = 'llx-chat-rating-thanks';
        thanksP.textContent = 'Thank you for rating this chat. It helps us improve.';
        connectWrap.appendChild(thanksP);
      }
      var connectP = document.createElement('p');
      connectP.textContent = 'This chat is closed. Continue on WhatsApp with our team when you are ready.';
      var connectBtn = document.createElement('button');
      connectBtn.type = 'button';
      connectBtn.className = 'llx-chat-agent-btn';
      connectBtn.textContent = 'Connect with LankaLux agent';
      connectBtn.addEventListener('click', function() { connectWithAgent(); });
      connectWrap.appendChild(connectP);
      connectWrap.appendChild(connectBtn);
      body.appendChild(connectWrap);
    }
    (state.messages || []).forEach(function(m) {
      if (m.kind === 'vehicles') {
        var wrap = document.createElement('div');
        wrap.className = 'llx-chat-vehicle-wrap';
        var title = document.createElement('p');
        title.className = 'llx-chat-vehicle-title';
        title.textContent = 'Our vehicle options';
        wrap.appendChild(title);
        var grid = document.createElement('div');
        grid.className = 'llx-chat-vehicle-grid';
        getChatVehicles().forEach(function(v) {
          var card = document.createElement('div');
          card.className = 'llx-chat-vehicle-card';
          card.setAttribute('role', 'button');
          card.setAttribute('tabindex', '0');
          var img = document.createElement('img');
          img.loading = 'lazy';
          img.alt = v.name;
          img.src = v.image;
          var label = document.createElement('span');
          label.textContent = v.name;
          card.addEventListener('click', function() { onVehicleCardClick(v.name); });
          card.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onVehicleCardClick(v.name);
            }
          });
          card.appendChild(img);
          card.appendChild(label);
          grid.appendChild(card);
        });
        wrap.appendChild(grid);
        body.appendChild(wrap);
      } else {
        var el = document.createElement('div');
        el.className = 'llx-chat-msg ' + m.role;
        el.textContent = formatChatDisplayText(m.role, m.content);
        body.appendChild(el);
      }
    });
    if (state.isTyping) {
      var typing = document.createElement('div');
      typing.className = 'llx-chat-typing';
      typing.innerHTML = '<span></span><span></span><span></span>';
      body.appendChild(typing);
    }
    if (state.showEndRating && !state.isTyping) {
      var rateWrap = document.createElement('div');
      rateWrap.className = 'llx-chat-rating-wrap';
      rateWrap.setAttribute('role', 'group');
      rateWrap.setAttribute('aria-label', 'Rate this chat from 1 to 5');
      var rateP = document.createElement('p');
      rateP.textContent = 'How would you rate this chat? Tap a score below.';
      var rateRow = document.createElement('div');
      rateRow.className = 'llx-chat-rating-scale';
      var labels = ['Poor', 'Fair', 'Okay', 'Good', 'Excellent'];
      for (var ri = 0; ri < 5; ri++) {
        (function(n, lbl) {
          var b = document.createElement('button');
          b.type = 'button';
          b.className = 'llx-chat-rating-btn';
          b.setAttribute('aria-label', 'Rate chat ' + n + ' out of 5, ' + lbl);
          var numEl = document.createElement('span');
          numEl.className = 'llx-r-num';
          numEl.textContent = String(n);
          var lblEl = document.createElement('span');
          lblEl.className = 'llx-r-lbl';
          lblEl.textContent = lbl;
          b.appendChild(numEl);
          b.appendChild(lblEl);
          b.addEventListener('click', function() { submitChatRating(n); });
          rateRow.appendChild(b);
        })(ri + 1, labels[ri]);
      }
      var leg = document.createElement('div');
      leg.className = 'llx-chat-rating-legend';
      leg.innerHTML = '<span>Poor</span><span>Excellent</span>';
      rateWrap.appendChild(rateP);
      rateWrap.appendChild(rateRow);
      rateWrap.appendChild(leg);
      body.appendChild(rateWrap);
    }
    body.scrollTop = body.scrollHeight;
    if (state.requestId) {
      sendRequestBtn.textContent = 'Saved: ' + state.requestId;
      sendRequestBtn.disabled = true;
    } else {
      sendRequestBtn.textContent = 'Send request';
      sendRequestBtn.disabled = missingFields(state.draft || {}).length > 0;
    }
    applyChatControlsLock();
    saveState();
  }
  function submitChatRating(score) {
    if (!state.showEndRating) return;
    var sid = state.sessionId;
    var msgs = (state.messages || []).slice(-80);
    fetch(CHATS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sid,
        eventType: 'chat_rated',
        chatRating: score,
        draft: state.draft || {},
        requestId: state.requestId || null,
        selectedVehicle: state.selectedVehicle || null,
        messages: msgs,
        pageUrl: window.location.href,
        userAgent: navigator.userAgent
      }),
      keepalive: true
    }).catch(function() {});
    state.showEndRating = false;
    state.postRatingThanks = true;
    var newSessionId = 'llx-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    state.messages = [];
    state.draft = {};
    state.requestId = null;
    state.isTyping = false;
    state.vehicleShownAt = 0;
    state.selectedVehicle = null;
    state.sessionId = newSessionId;
    state.pendingAgentConnect = true;
    render();
    saveState();
  }
  function connectWithAgent() {
    openWhatsApp();
    state.pendingAgentConnect = false;
    state.postRatingThanks = false;
    if (!(state.messages || []).length) {
      addMessage('assistant', WELCOME_MESSAGE);
    }
    render();
    persistChat('agent_connect_whatsapp');
  }
  function openPanel() {
    panel.classList.add('open');
    if (isMobileViewport()) document.body.classList.add('llx-chat-open');
    if (!state.pendingAgentConnect && !state.showEndRating) state.postRatingThanks = false;
    if (!state.messages.length && !state.pendingAgentConnect) {
      addMessage('assistant', WELCOME_MESSAGE);
    }
    render();
    scheduleKeyboardLayout();
    setTimeout(focusInputNoScroll, 50);
  }
  function typingDelayMs(replyText) {
    var t = String(replyText || '');
    var base = 650 + Math.min(2800, t.length * 32);
    var jitter = 180 + Math.floor(Math.random() * 520);
    return Math.min(4800, base + jitter);
  }
  function sleep(ms) {
    return new Promise(function(resolve) { setTimeout(resolve, ms); });
  }
  function buildPlanWhatsAppUrl() {
    var d = state.draft || {};
    var name = (d.name || '').trim() || 'Guest';
    var parts = [];
    if (d.tripDays != null && d.tripDays !== '') {
      var n = parseInt(String(d.tripDays), 10);
      if (!isNaN(n) && n > 0) parts.push(n + '-day trip');
    }
    if (d.startDate && d.endDate) parts.push(d.startDate + ' to ' + d.endDate);
    var pref = (d.message || '').trim();
    if (pref) parts.push(pref.slice(0, 140));
    var details = parts.length ? parts.join(', ') : 'a private chauffeur tour with LankaLux';
    var body = "Hi LankaLux, I'd like to plan my Sri Lanka trip. My name is " + name + " and I'm looking for " + details + ".";
    return 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(body);
  }
  async function callChat() {
    var res = await fetch(CHAT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: state.messages, draft: state.draft || {} })
    });
    var data = await res.json().catch(function() { return null; });
    if (!res.ok || !data || !data.success) throw new Error((data && data.error) || 'Chat unavailable');
    if (data.draft) state.draft = data.draft;
    var reply = typeof data.reply === 'string' ? data.reply.trim() : '';
    var doWa = !!data.openWhatsApp;
    if (!reply && !doWa) return null;
    if (reply) await sleep(typingDelayMs(reply));
    if (reply) addMessage('assistant', reply);
    if (doWa) {
      setTimeout(function() {
        var url = buildPlanWhatsAppUrl();
        var win = window.open(url, '_blank');
        if (!win) window.location.href = url;
        persistChat('whatsapp_redirect', { handoffRequested: true });
      }, 420);
    }
    return reply || (doWa ? 'whatsapp' : null);
  }
  async function submitMessage(preFilledText) {
    if (state.showEndRating) return;
    if (state.pendingAgentConnect) state.pendingAgentConnect = false;
    var pre = typeof preFilledText === 'string' ? preFilledText : '';
    var text = String(pre || input.value || '').trim();
    if (!text) return;
    if (!pre) input.value = '';
    if (wantsAgentHandoff(text)) {
      addMessage('user', text);
      addMessage('assistant', 'Opening WhatsApp for you now.');
      render();
      openWhatsApp();
      return;
    }
    var askVehicles = shouldShowVehicles(text);
    addMessage('user', text);
    render();
    try {
      state.isTyping = true;
      render();
      await callChat();
      if (askVehicles) addVehiclesMessage();
    } catch (e) {
      await sleep(380 + Math.floor(Math.random() * 220));
      addMessage('assistant', 'Sorry, I could not reply right now. You can tap WhatsApp and we will assist immediately.');
    } finally {
      state.isTyping = false;
    }
    render();
    persistChat('message');
  }
  function formatTravelDatesDisplay(d) {
    if (!d.startDate && !d.endDate) return 'Not specified';
    function fmt(iso) {
      if (!iso) return '';
      var dt = new Date(iso + 'T12:00:00');
      return isNaN(dt.getTime()) ? iso : dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    var a = fmt(d.startDate), b = fmt(d.endDate);
    return (a && b) ? (a + ' to ' + b) : (a || b || 'Not specified');
  }
  function passengersDisplay(d) {
    var a = d.numberOfAdults != null ? String(d.numberOfAdults) : '0';
    var c = d.numberOfChildren != null ? parseInt(String(d.numberOfChildren), 10) : 0;
    var s = a + ' adult' + (a === '1' ? '' : 's');
    if (c > 0) s += ', ' + c + ' child' + (c === 1 ? '' : 'ren');
    return s;
  }
  async function sendRequest() {
    var miss = missingFields(state.draft || {});
    if (miss.length) {
      addMessage('assistant', 'Before I submit your request, I just need: ' + miss.join(', ') + '.');
      render();
      return;
    }
    var d = state.draft || {};
    var payload = {
      name: d.name || null,
      email: d.email || null,
      whatsapp: d.whatsapp || null,
      startDate: d.startDate || null,
      endDate: d.endDate || null,
      numberOfAdults: d.numberOfAdults != null ? d.numberOfAdults : null,
      numberOfChildren: d.numberOfChildren != null ? d.numberOfChildren : null,
      childrenAgesValues: Array.isArray(d.childrenAgesValues) && d.childrenAgesValues.length ? d.childrenAgesValues : null,
      travelDates: formatTravelDatesDisplay(d),
      passengers: passengersDisplay(d),
      kidsAges: Array.isArray(d.childrenAgesValues) && d.childrenAgesValues.length ? d.childrenAgesValues.join(', ') : 'None',
      message: d.message || '',
      needAirlineTickets: !!d.needAirlineTickets,
      airlineFrom: d.airlineFrom || '',
      airlineDates: d.airlineDates || ''
    };
    try {
      var res = await fetch(REQUESTS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      var data = await res.json().catch(function() { return null; });
      if (!res.ok || !data || !data.success) throw new Error((data && data.error) || 'Request failed');
      state.requestId = data.requestId;
      addMessage('assistant', 'Perfect. Your request is saved as ' + data.requestId + '. Our team will be in touch shortly.');
    } catch (e) {
      var errDetail = '';
      try {
        if (e && e.message) errDetail = String(e.message);
      } catch (e2) {}
      addMessage(
        'assistant',
        errDetail
          ? ('Could not save your request (' + errDetail + '). Tap WhatsApp and we will help you there.')
          : 'Could not save your request. Tap WhatsApp and we will help you there.'
      );
    }
    render();
    persistChat('request_submitted');
  }
  function openWhatsApp() {
    persistChat('whatsapp_handoff', { handoffRequested: true });
    var waUrl = buildPlanWhatsAppUrl();
    var win = window.open(waUrl, '_blank');
    if (!win) window.location.href = waUrl;
  }

  fab.addEventListener('click', openPanel);
  closeBtn.addEventListener('click', function() {
    panel.classList.remove('open');
    document.body.classList.remove('llx-chat-open');
    resetKeyboardLayout();
  });
  send.addEventListener('click', function() { submitMessage(); });
  input.addEventListener('keydown', function(e) { if (e.key === 'Enter') submitMessage(); });
  input.addEventListener('focus', function() {
    scheduleKeyboardLayout();
    setTimeout(function() {
      body.scrollTop = body.scrollHeight;
    }, 80);
  });
  input.addEventListener('blur', function() {
    setTimeout(scheduleKeyboardLayout, 120);
  });
  window.addEventListener('resize', scheduleKeyboardLayout);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', scheduleKeyboardLayout);
    window.visualViewport.addEventListener('scroll', scheduleKeyboardLayout);
  }
  sendRequestBtn.addEventListener('click', sendRequest);
  waBtn.addEventListener('click', openWhatsApp);
  endChatBtn.addEventListener('click', openEndChatRating);
  render();
})();