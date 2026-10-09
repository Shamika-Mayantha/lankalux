/* LankaLux scroll motion.
 * - Smooth, weighted scrolling with the mouse wheel on desktop (touch and keyboard stay native).
 * - The hero photo drifts and settles as you scroll away; the headline slides up out of masks.
 * - Headings reveal word by word, text and cards rise in, photos open up as they arrive,
 *   and the beach photo expands to full width as you scroll through it.
 * Nothing moves for visitors who ask for reduced motion. */
(function () {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var root = document.documentElement;
  var finePointer = window.matchMedia("(pointer: fine)").matches && !("ontouchstart" in window);
  root.classList.add("flow");

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  /* ---------------------------------------------------------------- */
  /* Words in masks                                                     */
  /* ---------------------------------------------------------------- */
  function splitWords(el, startIndex) {
    var n = startIndex || 0;
    var parts = el.children.length && !el.querySelector("a, br, svg") ? el.children : [el];
    if (el.querySelector("a, br, svg") && parts[0] === el) return n; // leave rich headings alone
    Array.prototype.forEach.call(parts, function (part) {
      var words = part.textContent.trim().split(/\s+/);
      part.textContent = "";
      words.forEach(function (w, i) {
        var mask = document.createElement("span");
        mask.className = "flow-mask";
        var word = document.createElement("span");
        word.className = "flow-word";
        word.style.setProperty("--i", n++);
        word.textContent = w;
        mask.appendChild(word);
        part.appendChild(mask);
        if (i < words.length - 1) part.appendChild(document.createTextNode(" "));
      });
    });
    el.setAttribute("aria-label", el.textContent.replace(/\s+/g, " ").trim());
    el.classList.add("flow-split");
    return n;
  }

  var hero = document.querySelector(".hero");
  var heroTitle = hero && hero.querySelector("h1");
  if (heroTitle) splitWords(heroTitle);

  /* ---------------------------------------------------------------- */
  /* Reveal on arrival                                                  */
  /* ---------------------------------------------------------------- */
  var revealIO = "IntersectionObserver" in window
    ? new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          revealIO.unobserve(entry.target);
          entry.target.classList.add("flow-in");
        });
      }, { threshold: 0.18, rootMargin: "0px 0px -8% 0px" })
    : null;

  function reveal(el, cls, delay) {
    if (!revealIO || !el || el.classList.contains("flow-in")) return;
    el.classList.add(cls);
    if (delay) el.style.setProperty("--d", delay + "ms");
    revealIO.observe(el);
  }

  document.querySelectorAll("section:not(.hero) h2").forEach(function (h) {
    splitWords(h);
    reveal(h, "flow-heading");
  });

  // Text and cards rise in, one after another within their group.
  [
    "section:not(.hero) .center > p",
    ".section-lead",
    ".difference-kicker",
    ".version-item",
    "#services .card",
    ".split-copy > p",
    ".promise-list li",
    ".promise-note",
    ".how-step",
    ".vehicle-card",
    ".journeys-content > p",
    ".section-actions",
    ".contact-buttons",
    ".cta-section > p",
    ".exp"
  ].forEach(function (sel) {
    document.querySelectorAll(sel).forEach(function (el) {
      var i = Array.prototype.indexOf.call(el.parentElement.children, el);
      reveal(el, "flow-rise", Math.min(i, 6) * 80);
    });
  });

  // Photos open up from a smaller, rounded frame.
  document.querySelectorAll(".split-stage, .difference-stage, .journey-item, .vehicle-image").forEach(function (el, i) {
    reveal(el, "flow-open", el.classList.contains("journey-item") ? (i % 2) * 120 : 0);
  });

  /* ---------------------------------------------------------------- */
  /* Scroll-linked motion                                               */
  /* ---------------------------------------------------------------- */
  var scrubs = [];
  function scrub(el, fn) { if (el) scrubs.push({ el: el, fn: fn }); }

  // Hero: the photo sinks and slowly zooms while the words lift away.
  if (hero) {
    var heroMedia = hero.querySelector(".hero-carousel");
    var heroContent = hero.querySelector(".hero-content");
    scrub(hero, function (el, p, rect) {
      var t = clamp(-rect.top / rect.height, 0, 1);
      if (heroMedia) heroMedia.style.transform = "translate3d(0," + (t * 28).toFixed(2) + "%,0) scale(" + (1 + t * 0.12).toFixed(4) + ")";
      if (heroContent) {
        heroContent.style.transform = "translate3d(0," + (-t * 90).toFixed(1) + "px,0)";
        heroContent.style.opacity = clamp(1 - t * 1.6, 0, 1).toFixed(3);
      }
    });
  }

  // Beach photo: starts as a framed picture and opens to full width at the centre of the screen.
  document.querySelectorAll(".film-moment").forEach(function (fm) {
    var media = fm.querySelector(".film-moment-media");
    fm.classList.add("flow-film");
    scrub(fm, function (el, p) {
      var open = clamp((p - 0.12) / 0.38, 0, 1);
      open = 1 - Math.pow(1 - open, 3);
      var x = (1 - open) * 9, y = (1 - open) * 12, r = (1 - open) * 28;
      el.style.clipPath = "inset(" + y.toFixed(2) + "% " + x.toFixed(2) + "% round " + r.toFixed(1) + "px)";
      if (media) media.style.transform = "scale(" + (1.22 - open * 0.16 - (p > 0.5 ? (p - 0.5) * 0.12 : 0)).toFixed(4) + ")";
    });
  });

  // "Maybe…" lines light up one by one as they pass the middle of the screen.
  document.querySelectorAll("#flexibility .center > p, #moment .center > p").forEach(function (pEl) {
    pEl.classList.remove("flow-rise");
    pEl.classList.add("flow-light");
    scrub(pEl, function (el, p) {
      el.style.setProperty("--lit", clamp((p - 0.18) / 0.22, 0, 1).toFixed(3));
    });
  });

  // Journey cards drift at slightly different speeds, which gives the grid depth.
  if (finePointer || window.innerWidth >= 900) {
    document.querySelectorAll(".journey-item").forEach(function (card, i) {
      var depth = i % 2 ? 46 : 18;
      scrub(card, function (el, p) {
        el.style.setProperty("--drift", ((0.5 - p) * depth).toFixed(1) + "px");
      });
    });
    var split = document.querySelector(".split-stage");
    scrub(split, function (el, p) {
      el.style.backgroundPosition = "center " + (30 + p * 40).toFixed(1) + "%";
    });
  }

  // A thin gold line along the top shows how far down the page you are.
  var bar = document.createElement("div");
  bar.className = "flow-progress";
  bar.setAttribute("aria-hidden", "true");
  document.body.appendChild(bar);

  var lastY = -1, lastH = -1;
  function update(force) {
    var y = window.scrollY || window.pageYOffset || 0;
    var vh = window.innerHeight || 1;
    if (!force && y === lastY && vh === lastH) return;
    lastY = y; lastH = vh;
    var max = Math.max(1, document.documentElement.scrollHeight - vh);
    bar.style.transform = "scaleX(" + clamp(y / max, 0, 1).toFixed(4) + ")";
    for (var i = 0; i < scrubs.length; i++) {
      var s = scrubs[i];
      var rect = s.el.getBoundingClientRect();
      if (rect.bottom < -vh * 0.25 || rect.top > vh * 1.25) continue;
      var p = clamp((vh - rect.top) / (vh + rect.height), 0, 1);
      s.fn(s.el, p, rect);
    }
  }

  /* ---------------------------------------------------------------- */
  /* Smooth wheel scrolling (desktop)                                   */
  /* ---------------------------------------------------------------- */
  var target = window.scrollY, current = target, gliding = false, setY = -1;

  function locked() {
    var b = document.body;
    return getComputedStyle(b).overflow === "hidden" || getComputedStyle(root).overflow === "hidden";
  }
  function scrollsInside(node, dy) {
    while (node && node !== document.body && node !== root) {
      if (node.nodeType === 1) {
        var cs = getComputedStyle(node);
        if (/(auto|scroll)/.test(cs.overflowY) && node.scrollHeight > node.clientHeight + 1) {
          if ((dy > 0 && node.scrollTop + node.clientHeight < node.scrollHeight - 1) || (dy < 0 && node.scrollTop > 0)) return true;
        }
      }
      node = node.parentNode;
    }
    return false;
  }

  if (finePointer) {
    window.addEventListener("wheel", function (e) {
      if (e.ctrlKey || e.defaultPrevented || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      var dy = e.deltaY * (e.deltaMode === 1 ? 32 : e.deltaMode === 2 ? window.innerHeight : 1);
      if (locked() || scrollsInside(e.target, dy)) return;
      e.preventDefault();
      if (!gliding) { target = current = window.scrollY; }
      var max = document.documentElement.scrollHeight - window.innerHeight;
      target = clamp(target + dy, 0, max);
      gliding = true;
    }, { passive: false });

    // Keyboard, scrollbar drags, anchor jumps and page code take over from a glide.
    window.addEventListener("scroll", function () {
      if (gliding && Math.abs(window.scrollY - setY) > 3) gliding = false;
    }, { passive: true });
    ["keydown", "mousedown", "touchstart"].forEach(function (ev) {
      window.addEventListener(ev, function () { gliding = false; }, { passive: true });
    });
  }

  var lastT = performance.now();
  function frame() {
    var now = performance.now();
    var dt = Math.min(0.1, (now - lastT) / 1000);
    lastT = now;
    if (gliding) {
      current += (target - current) * (1 - Math.exp(-dt * 7));
      if (Math.abs(target - current) < 0.5) { current = target; gliding = false; }
      setY = Math.round(current);
      window.scrollTo({ top: current, behavior: "instant" });
    }
    update(false);
    requestAnimationFrame(frame);
  }
  window.addEventListener("resize", function () { update(true); });
  update(true);
  requestAnimationFrame(frame);
})();
