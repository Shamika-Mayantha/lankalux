(function () {
  document.documentElement.classList.add("has-js");

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var coarse = window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 960;

  function onReady(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }

  function initAboutStages() {
    var stages = document.querySelectorAll(".journal-stage");
    var images = document.querySelectorAll(".journal-about-visual img");
    if (!stages.length || !images.length) return;

    function setActive(index) {
      stages.forEach(function (stage, i) {
        stage.classList.toggle("is-active", i === index);
      });
      images.forEach(function (img, i) {
        img.classList.toggle("is-active", i === index);
      });
    }

    setActive(0);

    if (!reduced && "IntersectionObserver" in window) {
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            var index = Array.prototype.indexOf.call(stages, entry.target);
            if (index >= 0) setActive(index);
          });
        },
        { threshold: 0.6, rootMargin: "-18% 0px -18% 0px" }
      );
      stages.forEach(function (stage) { io.observe(stage); });
    }

    stages.forEach(function (stage, i) {
      stage.addEventListener("mouseenter", function () { setActive(i); });
      stage.addEventListener("focusin", function () { setActive(i); });
    });
  }

  function initItineraryPreview() {
    var section = document.getElementById("itinerary-preview");
    if (!section) return;
    var buttons = section.querySelectorAll(".itinerary-day-btn");
    var docs = section.querySelectorAll(".itinerary-document");
    var stage = section.querySelector(".itinerary-preview-stage");
    if (!buttons.length || !docs.length) return;

    function setDay(index, moveFocus) {
      buttons.forEach(function (btn, i) {
        var on = i === index;
        btn.classList.toggle("is-active", on);
        btn.setAttribute("aria-selected", on ? "true" : "false");
        btn.setAttribute("tabindex", on ? "0" : "-1");
      });
      docs.forEach(function (doc, i) {
        doc.classList.toggle("is-active", i === index);
      });
      if (moveFocus && buttons[index]) buttons[index].focus();
    }

    setDay(0, false);

    buttons.forEach(function (btn, i) {
      btn.addEventListener("click", function () { setDay(i, false); });
      btn.addEventListener("keydown", function (e) {
        var next = i;
        if (e.key === "ArrowDown" || e.key === "ArrowRight") next = (i + 1) % buttons.length;
        else if (e.key === "ArrowUp" || e.key === "ArrowLeft") next = (i - 1 + buttons.length) % buttons.length;
        else if (e.key === "Home") next = 0;
        else if (e.key === "End") next = buttons.length - 1;
        else return;
        e.preventDefault();
        setDay(next, true);
      });
    });

    if (!coarse && !reduced && stage && window.innerWidth >= 960) {
      stage.classList.add("is-sticky");
      var ticking = false;
      function updateFromScroll() {
        var rect = section.getBoundingClientRect();
        var view = window.innerHeight || 1;
        var p = (view * 0.35 - rect.top) / Math.max(rect.height - view * 0.25, 1);
        p = Math.min(0.999, Math.max(0, p));
        setDay(Math.floor(p * buttons.length), false);
        ticking = false;
      }
      window.addEventListener("scroll", function () {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(updateFromScroll);
      }, { passive: true });
    }
  }

  function initChauffeurLines() {
    var section = document.getElementById("chauffeur");
    var items = document.querySelectorAll(".chauffeur-lines li");
    if (!section || !items.length) return;
    items[0].classList.add("is-on");
    if (reduced) {
      items.forEach(function (item) { item.classList.add("is-on"); });
      return;
    }
    var ticking = false;
    function update() {
      var rect = section.getBoundingClientRect();
      var view = window.innerHeight || 1;
      var p = (view * 0.42 - rect.top) / Math.max(rect.height, 1);
      p = Math.min(1, Math.max(0, p));
      var index = Math.min(items.length - 1, Math.floor(p * items.length));
      items.forEach(function (item, i) { item.classList.toggle("is-on", i === index); });
      ticking = false;
    }
    window.addEventListener("scroll", function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }, { passive: true });
    update();
  }

  function initFaq() {
    var items = document.querySelectorAll("#faq .faq-item");
    if (!items.length) return;

    items.forEach(function (item, index) {
      var trigger = item.querySelector(".faq-trigger");
      var panel = item.querySelector(".faq-panel");
      if (!trigger || !panel) return;
      var panelId = panel.id || "faq-panel-" + (index + 1);
      panel.id = panelId;
      trigger.setAttribute("aria-controls", panelId);
      var open = index === 0;
      item.classList.toggle("is-open", open);
      trigger.setAttribute("aria-expanded", open ? "true" : "false");
      trigger.addEventListener("click", function () {
        var willOpen = !item.classList.contains("is-open");
        item.classList.toggle("is-open", willOpen);
        trigger.setAttribute("aria-expanded", willOpen ? "true" : "false");
      });
    });
  }

  function initReviewControls() {
    var prev = document.getElementById("reviewPrev");
    var next = document.getElementById("reviewNext");
    var track = document.getElementById("reviewTrack");
    if (!track) return;

    function currentIndex() {
      var slides = track.querySelectorAll(".review-slide");
      var style = track.style.transform || "";
      var match = style.match(/-(\d+)/);
      var fromTransform = match ? Math.round(parseInt(match[1], 10) / 100) : 0;
      return Math.max(0, Math.min(slides.length - 1, fromTransform));
    }

    function go(delta) {
      var slides = track.querySelectorAll(".review-slide");
      if (!slides.length) return;
      var index = (currentIndex() + delta + slides.length) % slides.length;
      var dots = document.querySelectorAll(".review-dot");
      if (dots[index]) dots[index].click();
      else track.style.transform = "translateX(-" + index * 100 + "%)";
    }

    if (prev) prev.addEventListener("click", function () { go(-1); });
    if (next) next.addEventListener("click", function () { go(1); });

    track.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
      if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
    });
  }

  function initItineraryFileState() {
    var input = document.getElementById("itineraryFile");
    if (!input) return;
    var hint = document.getElementById("itineraryFileState");
    if (!hint) {
      hint = document.createElement("p");
      hint.id = "itineraryFileState";
      input.insertAdjacentElement("afterend", hint);
    }
    input.addEventListener("change", function () {
      var file = input.files && input.files[0];
      hint.textContent = file ? ("Selected: " + file.name) : "";
    });
  }

  function initItineraryChoices() {
    document.querySelectorAll("[data-open-itinerary]").forEach(function (el) {
      el.addEventListener("click", function () {
        var focusId = el.getAttribute("data-open-itinerary");
        if (typeof window.openItineraryModal === "function") {
          window.openItineraryModal(focusId);
        }
      });
    });
  }

  onReady(function () {
    initAboutStages();
    initItineraryPreview();
    initChauffeurLines();
    initFaq();
    initReviewControls();
    initItineraryFileState();
    initItineraryChoices();
  });
})();
