(function () {
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var coarse = window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 900;
  var header = document.querySelector("body > header");
  var hero = document.querySelector(".hero, .journey-hero, .journeys-page-hero, .page-hero");

  document.documentElement.classList.add("is-ready");

  var veil = document.createElement("div");
  veil.className = "page-veil";
  document.body.appendChild(veil);

  if (header) {
    header.querySelectorAll('nav a[href="#experiences"], nav a[href="/#experiences"]').forEach(function (el) {
      el.remove();
    });
    header.querySelectorAll('nav a[href="#faq"], nav a[href="/#faq"]').forEach(function (el) {
      el.remove();
    });

    var nav = header.querySelector("nav");
    if (nav && !nav.querySelector(".nav-topics")) {
      var topics = document.createElement("details");
      topics.className = "nav-topics";
      topics.innerHTML =
        '<summary class="nav-topics-btn">Questions</summary>' +
        '<div class="nav-topics-panel">' +
          '<div class="nav-topics-col">' +
            '<p class="nav-topics-label">Guides</p>' +
            '<a href="/guides/how-many-days-in-sri-lanka">How many days</a>' +
            '<a href="/guides/best-time-to-visit-sri-lanka">Best time to visit</a>' +
            '<a href="/guides/chauffeur-guide-vs-self-driving">Chauffeur-guide vs self-drive</a>' +
            '<a href="/guides/sri-lanka-with-children">Travelling with children</a>' +
            '<a href="/guides/sri-lanka-hill-country-train">Hill-country train</a>' +
            '<a href="/guides/yala-vs-udawalawe">Yala vs Udawalawe</a>' +
          '</div>' +
          '<div class="nav-topics-col">' +
            '<p class="nav-topics-label">Places</p>' +
            '<a href="/destinations/sigiriya">Sigiriya</a>' +
            '<a href="/destinations/kandy">Kandy</a>' +
            '<a href="/destinations/ella">Ella</a>' +
            '<a href="/destinations/yala">Yala</a>' +
            '<a href="/destinations/udawalawe">Udawalawe</a>' +
            '<a href="/destinations/galle">Galle</a>' +
            '<a href="/destinations/mirissa">Mirissa</a>' +
          '</div>' +
          '<div class="nav-topics-col">' +
            '<p class="nav-topics-label">Planning</p>' +
            '<a href="/#faq">Common questions</a>' +
            '<a href="/private-chauffeur-guide-sri-lanka">Private chauffeur-guide</a>' +
            '<a href="/tailor-made-sri-lanka-tours">Tailor-made tours</a>' +
            '<a href="/sri-lanka-family-tours">Family travel</a>' +
            '<a href="/10-day-sri-lanka-itinerary">10-day itinerary</a>' +
          '</div>' +
        '</div>';
      var cta = nav.querySelector(".cta");
      if (cta) nav.insertBefore(topics, cta);
      else nav.appendChild(topics);
    }

    document.addEventListener("click", function (e) {
      header.querySelectorAll("details.nav-topics[open]").forEach(function (d) {
        if (!d.contains(e.target)) d.removeAttribute("open");
      });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        header.querySelectorAll("details.nav-topics[open]").forEach(function (d) {
          d.removeAttribute("open");
        });
      }
    });
  }

  if (header && !header.querySelector(".nav-toggle")) {
    var toggle = document.createElement("button");
    toggle.className = "nav-toggle";
    toggle.type = "button";
    toggle.setAttribute("aria-label", "Open menu");
    toggle.innerHTML = "<span></span><span></span><span></span>";
    var backdrop = document.createElement("div");
    backdrop.className = "nav-backdrop";
    header.appendChild(toggle);
    header.appendChild(backdrop);
    function closeNav() {
      header.classList.remove("nav-open");
      toggle.setAttribute("aria-label", "Open menu");
    }
    toggle.addEventListener("click", function () {
      var open = header.classList.toggle("nav-open");
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });
    backdrop.addEventListener("click", closeNav);
    header.querySelectorAll("nav a, nav button").forEach(function (el) {
      el.addEventListener("click", closeNav);
    });
  }

  function updateHeader() {
    if (!header) return;
    var y = window.scrollY || 0;
    header.classList.toggle("is-scrolled", y > 18);
    if (hero) {
      header.classList.toggle("on-media", y < hero.offsetHeight - 72);
    }
  }
  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });
  window.addEventListener("resize", updateHeader);

  var homeHero = document.querySelector(".hero");
  if (homeHero) {
    requestAnimationFrame(function () {
      homeHero.classList.add("is-ready");
    });
  }

  if (!reduced) {
    var revealEls = document.querySelectorAll("#about, .day-section");
    if ("IntersectionObserver" in window && revealEls.length) {
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-in");
              io.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
      );
      revealEls.forEach(function (el) {
        el.classList.add("reveal");
        io.observe(el);
      });
    } else {
      revealEls.forEach(function (el) { el.classList.add("is-in"); });
    }
  }

  var cards = document.querySelectorAll("#why .why-card");
  var images = document.querySelectorAll(".diff-image");
  if (cards.length && images.length) {
    if (cards[0]) cards[0].classList.add("is-active");
    if (!reduced && "IntersectionObserver" in window) {
      var dio = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            var i = Array.prototype.indexOf.call(cards, entry.target);
            if (i < 0) return;
            cards.forEach(function (c, j) { c.classList.toggle("is-active", j === i); });
            images.forEach(function (img, j) { img.classList.toggle("active", j === i); });
          });
        },
        { threshold: 0.55, rootMargin: "-20% 0px -20% 0px" }
      );
      cards.forEach(function (card) { dio.observe(card); });
    }
    cards.forEach(function (card, i) {
      card.addEventListener("mouseenter", function () {
        cards.forEach(function (c, j) { c.classList.toggle("is-active", j === i); });
        images.forEach(function (img, j) { img.classList.toggle("active", j === i); });
      });
    });
  }

  if (!reduced && !coarse) {
    var moments = document.querySelectorAll("[data-parallax]");
    if (moments.length) {
      var ticking = false;
      function onScroll() {
        moments.forEach(function (el) {
          var media = el.querySelector(".film-moment-media") || el;
          var rect = el.getBoundingClientRect();
          var view = window.innerHeight || 1;
          var p = (rect.top + rect.height / 2 - view / 2) / view;
          var shift = (p * 6).toFixed(2);
          media.style.backgroundPosition = "center calc(50% + " + shift + "vh)";
        });
        ticking = false;
      }
      window.addEventListener(
        "scroll",
        function () {
          if (ticking) return;
          ticking = true;
          requestAnimationFrame(onScroll);
        },
        { passive: true }
      );
      onScroll();
    }
  }

  if (!reduced) {
    document.addEventListener("click", function (e) {
      var a = e.target.closest("a[href]");
      if (!a) return;
      var href = a.getAttribute("href") || "";
      if (!href || href.charAt(0) === "#" || a.target === "_blank" || a.hasAttribute("download")) return;
      if (/^(mailto:|tel:|javascript:)/i.test(href)) return;
      if (/^https?:/i.test(href) && a.host !== window.location.host) return;
      if (a.getAttribute("rel") && a.getAttribute("rel").indexOf("external") !== -1) return;
      e.preventDefault();
      document.body.classList.add("is-leaving");
      window.setTimeout(function () {
        window.location.href = a.href;
      }, 320);
    });
  }
})();
