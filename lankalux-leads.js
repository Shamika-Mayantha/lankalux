// Sends website enquiries to the admin console so they appear on the requests page.
// EmailJS remains the primary channel; this retries once so a brief network or
// server hiccup doesn't drop the lead from admin.
(function () {
  var ADMIN_REQUESTS_URL = 'https://admin.lankalux.com/api/requests';

  function post(body, attempt) {
    return fetch(ADMIN_REQUESTS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body
    }).then(function (res) {
      if (!res.ok && res.status >= 500 && attempt < 2) throw new Error('retry');
      return res;
    }).catch(function () {
      if (attempt < 2) {
        return new Promise(function (resolve) { setTimeout(resolve, 1500); })
          .then(function () { return post(body, attempt + 1); });
      }
    });
  }

  window.sendToAdmin = function (payload, source) {
    payload = payload || {};
    var body = JSON.stringify(Object.assign({}, payload, {
      source: source || 'website',
      submittedAt: new Date().toISOString(),
      startDate: payload.startDate || null,
      endDate: payload.endDate || null,
      numberOfAdults: payload.numberOfAdults || null,
      numberOfChildren: payload.numberOfChildren || null,
      childrenAgesValues: payload.childrenAgesValues || null,
      requestedDestinations: payload.requestedDestinations || payload.journeyName || null,
      vehiclePreference: payload.vehiclePreference || null
    }));
    post(body, 1);
  };
})();
