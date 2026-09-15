(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.LankaLuxDatePicker = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  var WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  var CAL_WIDTH = 340;
  var CAL_HEIGHT = 380;
  var openInstance = null;
  var instances = [];

  var CALENDAR_ICON =
    '<svg class="ll-dp-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>';
  var CHEVRON_LEFT =
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>';
  var CHEVRON_RIGHT =
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>';

  function parseIsoDate(value) {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    var parts = value.split('-').map(Number);
    var year = parts[0];
    var month = parts[1];
    var day = parts[2];
    if (year < 1900 || year > 2099) return null;
    var date = new Date(year, month - 1, day, 12, 0, 0, 0);
    if (
      Number.isNaN(date.getTime()) ||
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return null;
    }
    return date;
  }

  function isoDate(date) {
    var y = date.getFullYear();
    var m = String(date.getMonth() + 1).padStart(2, '0');
    var d = String(date.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
  }

  function todayIso() {
    return isoDate(new Date());
  }

  function sameDay(a, b) {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  /** YYYY-MM-DD comparison. If end is before start, snap end to start. */
  function clampEndOnOrAfterStart(start, end) {
    if (start && end && end < start) return start;
    return end;
  }

  function placeCalendar(trigger, calWidth, calHeight) {
    var r = trigger.getBoundingClientRect();
    var width = Math.min(calWidth, window.innerWidth * 0.92);
    var left = r.left;
    if (left + width > window.innerWidth - 12) left = Math.max(12, window.innerWidth - width - 12);
    if (left < 12) left = 12;
    var opensUp = window.innerHeight - r.bottom < calHeight && r.top > calHeight;
    var top = opensUp ? Math.max(12, r.top - calHeight - 8) : r.bottom + 8;
    return { top: top, left: left, width: width };
  }

  function formatDisplay(value, placeholder) {
    var selected = parseIsoDate(value);
    if (!selected) return placeholder;
    return selected.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function Picker(input, options) {
    this.input = input;
    this.options = options || {};
    this.placeholder = this.options.placeholder || 'Select date';
    this.min = this.options.min || input.getAttribute('min') || todayIso();
    this.max = this.options.max || input.getAttribute('max') || '2099-12-31';
    this.rangeStart = this.options.rangeStart || '';
    this.rangeEnd = this.options.rangeEnd || '';
    this.view = parseIsoDate(input.value) || new Date();
    this.view.setHours(12, 0, 0, 0);
    this.open = false;
    this.calEl = null;
    this._boundPlace = this.place.bind(this);
    this._boundDoc = this.onDocMouseDown.bind(this);
    this._boundEsc = this.onEsc.bind(this);
    this.build();
  }

  Picker.prototype.build = function () {
    var input = this.input;
    if (input.dataset.llEnhanced === 'true') return;
    input.dataset.llEnhanced = 'true';
    input.classList.add('ll-dp-native');
    input.setAttribute('max', this.max);
    input.setAttribute('min', this.min);
    input.setAttribute('autocomplete', 'off');

    var wrap = document.createElement('div');
    wrap.className = 'll-dp-wrap';

    var trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'll-dp-trigger';
    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-label', input.getAttribute('aria-label') || this.placeholder);
    trigger.innerHTML = '<span class="ll-dp-value"></span>' + CALENDAR_ICON;
    this.trigger = trigger;
    this.valueEl = trigger.querySelector('.ll-dp-value');

    var parent = input.parentNode;
    parent.insertBefore(wrap, input);
    wrap.appendChild(input);
    wrap.appendChild(trigger);

    var self = this;
    trigger.addEventListener('click', function () {
      if (self.open) self.close();
      else self.show();
    });
    input.addEventListener('focus', function () {
      if (!self.open) self.show();
    });
    input.addEventListener('change', function () {
      self.syncFromInput();
    });
    var form = input.form;
    if (form && !form.dataset.llDpReset) {
      form.dataset.llDpReset = 'true';
      form.addEventListener('reset', function () {
        setTimeout(function () {
          instances.forEach(function (inst) {
            if (inst.input.form === form) inst.syncFromInput(true);
          });
        }, 0);
      });
    }
    this.syncFromInput(true);
  };

  Picker.prototype.setMin = function (value) {
    this.min = value || todayIso();
    this.input.setAttribute('min', this.min);
    if (this.open) this.renderCalendar();
  };

  Picker.prototype.setRange = function (start, end) {
    this.rangeStart = start || '';
    this.rangeEnd = end || '';
    if (this.open) this.renderCalendar();
  };

  Picker.prototype.setValue = function (value, silent) {
    var next = value || '';
    if (this.input.value === next) {
      this.syncFromInput(true);
      return;
    }
    this.input.value = next;
    this.syncFromInput(true);
    if (!silent) {
      this.input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  };

  Picker.prototype.syncFromInput = function (skipViewJump) {
    var selected = parseIsoDate(this.input.value);
    if (selected && !skipViewJump) this.view = selected;
    else if (selected) this.view = new Date(selected.getTime());
    this.valueEl.textContent = formatDisplay(this.input.value, this.placeholder);
    this.valueEl.className = selected ? 'll-dp-value' : 'll-dp-value ll-dp-muted';
  };

  Picker.prototype.show = function () {
    if (openInstance && openInstance !== this) openInstance.close();
    var selected = parseIsoDate(this.input.value);
    this.view = selected || parseIsoDate(this.min) || new Date();
    this.view.setHours(12, 0, 0, 0);
    this.open = true;
    this.trigger.setAttribute('aria-expanded', 'true');
    this.calEl = document.createElement('div');
    this.calEl.className = 'll-dp-cal';
    this.calEl.setAttribute('role', 'dialog');
    this.calEl.setAttribute('aria-label', 'Choose a date');
    document.body.appendChild(this.calEl);
    this.renderCalendar();
    this.place();
    document.addEventListener('mousedown', this._boundDoc);
    document.addEventListener('keydown', this._boundEsc);
    window.addEventListener('resize', this._boundPlace);
    window.addEventListener('scroll', this._boundPlace, true);
    openInstance = this;
  };

  Picker.prototype.close = function () {
    if (!this.open) return;
    this.open = false;
    this.trigger.setAttribute('aria-expanded', 'false');
    document.removeEventListener('mousedown', this._boundDoc);
    document.removeEventListener('keydown', this._boundEsc);
    window.removeEventListener('resize', this._boundPlace);
    window.removeEventListener('scroll', this._boundPlace, true);
    if (this.calEl && this.calEl.parentNode) this.calEl.parentNode.removeChild(this.calEl);
    this.calEl = null;
    if (openInstance === this) openInstance = null;
  };

  Picker.prototype.place = function () {
    if (!this.open || !this.calEl) return;
    var pos = placeCalendar(this.trigger, CAL_WIDTH, CAL_HEIGHT);
    this.calEl.style.top = pos.top + 'px';
    this.calEl.style.left = pos.left + 'px';
    this.calEl.style.width = pos.width + 'px';
  };

  Picker.prototype.onDocMouseDown = function (e) {
    var t = e.target;
    if (this.trigger.contains(t) || (this.calEl && this.calEl.contains(t))) return;
    this.close();
  };

  Picker.prototype.onEsc = function (e) {
    if (e.key === 'Escape') {
      this.close();
      this.trigger.focus();
    }
  };

  Picker.prototype.inRange = function (date) {
    var minDate = parseIsoDate(this.min);
    var maxDate = parseIsoDate(this.max);
    if (minDate && date < minDate) return false;
    if (maxDate && date > maxDate) return false;
    return true;
  };

  Picker.prototype.inTrip = function (date) {
    var tripStart = parseIsoDate(this.rangeStart);
    var tripEnd = parseIsoDate(this.rangeEnd);
    if (!tripStart || !tripEnd) return false;
    return date >= tripStart && date <= tripEnd;
  };

  Picker.prototype.renderCalendar = function () {
    if (!this.calEl) return;
    var view = this.view;
    var firstDayOfMonth = new Date(view.getFullYear(), view.getMonth(), 1, 12);
    var daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
    var startWeekday = firstDayOfMonth.getDay();
    var monthLabel = firstDayOfMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    var selected = parseIsoDate(this.input.value);
    var today = new Date();
    today.setHours(12, 0, 0, 0);
    var tripStart = parseIsoDate(this.rangeStart);
    var tripEnd = parseIsoDate(this.rangeEnd);
    var self = this;

    var html = '';
    html += '<div class="ll-dp-head">';
    html += '<button type="button" class="ll-dp-nav" data-ll-nav="-1" aria-label="Previous month">' + CHEVRON_LEFT + '</button>';
    html += '<p class="ll-dp-month">' + monthLabel + '</p>';
    html += '<button type="button" class="ll-dp-nav" data-ll-nav="1" aria-label="Next month">' + CHEVRON_RIGHT + '</button>';
    html += '</div>';
    html += '<div class="ll-dp-weeks">';
    for (var w = 0; w < WEEKDAYS.length; w++) {
      html += '<div class="ll-dp-week">' + WEEKDAYS[w] + '</div>';
    }
    html += '</div>';
    html += '<div class="ll-dp-grid">';
    for (var b = 0; b < startWeekday; b++) html += '<div class="ll-dp-blank"></div>';
    for (var day = 1; day <= daysInMonth; day++) {
      var date = new Date(view.getFullYear(), view.getMonth(), day, 12);
      var disabledDay = !this.inRange(date);
      var selectedDay = !!selected && sameDay(selected, date);
      var todayDay = sameDay(today, date);
      var tripEdge = Boolean(
        (tripStart && sameDay(tripStart, date)) || (tripEnd && sameDay(tripEnd, date))
      );
      var rangeDay = !tripEdge && !disabledDay && this.inTrip(date);
      var cls = 'll-dp-day';
      if (selectedDay || tripEdge) cls += ' is-selected';
      else if (disabledDay) cls += ' is-disabled';
      else {
        if (rangeDay) cls += ' is-range';
        if (todayDay) cls += ' is-today';
      }
      html +=
        '<button type="button" class="' +
        cls +
        '" data-ll-day="' +
        day +
        '"' +
        (disabledDay ? ' disabled' : '') +
        '>' +
        day +
        '</button>';
    }
    html += '</div>';
    html += '<div class="ll-dp-actions">';
    html += '<button type="button" class="ll-dp-foot" data-ll-action="clear">Clear</button>';
    html += '<button type="button" class="ll-dp-foot" data-ll-action="close">Close</button>';
    html += '</div>';
    this.calEl.innerHTML = html;

    this.calEl.querySelectorAll('[data-ll-nav]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var delta = Number(btn.getAttribute('data-ll-nav'));
        self.view = new Date(self.view.getFullYear(), self.view.getMonth() + delta, 1, 12);
        self.renderCalendar();
      });
    });
    this.calEl.querySelectorAll('[data-ll-day]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var dayNum = Number(btn.getAttribute('data-ll-day'));
        var picked = new Date(self.view.getFullYear(), self.view.getMonth(), dayNum, 12);
        self.setValue(isoDate(picked));
        self.close();
      });
    });
    this.calEl.querySelector('[data-ll-action="clear"]').addEventListener('click', function () {
      self.setValue('');
      self.close();
    });
    this.calEl.querySelector('[data-ll-action="close"]').addEventListener('click', function () {
      self.close();
    });
    this.place();
  };

  function enhance(input, options) {
    if (!input) return null;
    if (input._llPicker) {
      if (options && options.placeholder) input._llPicker.placeholder = options.placeholder;
      if (options && options.min) input._llPicker.setMin(options.min);
      input._llPicker.syncFromInput(true);
      return input._llPicker;
    }
    var picker = new Picker(input, options || {});
    input._llPicker = picker;
    instances.push(picker);
    return picker;
  }

  function pair(fromId, toId, options) {
    options = options || {};
    var fromEl = typeof fromId === 'string' ? document.getElementById(fromId) : fromId;
    var toEl = typeof toId === 'string' ? document.getElementById(toId) : toId;
    if (!fromEl || !toEl) return null;
    var min = options.min || todayIso();
    var fromPicker = enhance(fromEl, {
      placeholder: options.fromPlaceholder || 'Select arrival',
      min: min,
      max: options.max
    });
    var toPicker = enhance(toEl, {
      placeholder: options.toPlaceholder || 'Select departure',
      min: fromEl.value || min,
      max: options.max
    });

    function syncPair(origin) {
      var start = fromEl.value;
      var end = clampEndOnOrAfterStart(start, toEl.value);
      if (end !== toEl.value) toPicker.setValue(end, true);
      toPicker.setMin(start || min);
      fromPicker.setRange(start, toEl.value);
      toPicker.setRange(start, toEl.value);
      if (origin !== 'from') fromPicker.syncFromInput(true);
      if (origin !== 'to') toPicker.syncFromInput(true);
    }

    if (!fromEl.dataset.llPaired) {
      fromEl.dataset.llPaired = 'true';
      toEl.dataset.llPairFrom = fromEl.id;
      fromEl.addEventListener('change', function () {
        syncPair('from');
      });
      toEl.addEventListener('change', function () {
        var clamped = clampEndOnOrAfterStart(fromEl.value, toEl.value);
        if (clamped !== toEl.value) {
          toPicker.setValue(clamped, true);
        }
        syncPair('to');
      });
    }
    syncPair();
    return { from: fromPicker, to: toPicker };
  }

  function refreshMins(today) {
    var day = today || todayIso();
    instances.forEach(function (inst) {
      var fromId = inst.input.dataset.llPairFrom;
      if (fromId) {
        var fromEl = document.getElementById(fromId);
        inst.setMin((fromEl && fromEl.value) || day);
      } else {
        inst.setMin(day);
      }
    });
  }

  return {
    enhance: enhance,
    pair: pair,
    todayIso: todayIso,
    isoDate: isoDate,
    parseIsoDate: parseIsoDate,
    clampEndOnOrAfterStart: clampEndOnOrAfterStart,
    formatDisplay: formatDisplay,
    refreshMins: refreshMins,
    closeOpen: function () {
      if (openInstance) openInstance.close();
    }
  };
});
