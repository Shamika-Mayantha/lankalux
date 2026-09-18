(function () {
  var PROFILE = "https://www.instagram.com/lanka.lux/";

  /*
    Edit the three homepage cards here.
    title: optional short line on the card
    image: still or poster (required)
    video: optional mp4/webm. Not loaded until hover. Only one plays at a time.
    href: Instagram Reel, post, or profile URL
  */
  var CARDS = [
    {
      title: "Tea country",
      image: "images/highlights/tea/stclairs.jpg",
      href: PROFILE
    },
    {
      title: "On safari",
      image: "images/highlights/wildlife/leopard.jpg",
      href: PROFILE
    },
    {
      title: "The south coast",
      image: "images/highlights/beach/mirissa.jpg",
      href: PROFILE
    }
  ];

  var grid = document.getElementById("roadGrid");
  if (!grid) return;

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderCard(card) {
    var href = card.href || PROFILE;
    var title = card.title ? "<span class=\"road-card-title\">" + escapeHtml(card.title) + "</span>" : "";
    var video = "";
    if (card.video) {
      video =
        "<video muted playsinline preload=\"none\" poster=\"" +
        escapeHtml(card.image) +
        "\" data-src=\"" +
        escapeHtml(card.video) +
        "\"></video>";
    }
    return (
      "<a class=\"road-card\" href=\"" +
      escapeHtml(href) +
      "\" target=\"_blank\" rel=\"noopener noreferrer\">" +
      "<img loading=\"lazy\" decoding=\"async\" src=\"" +
      escapeHtml(card.image) +
      "\" alt=\"" +
      escapeHtml(card.title || "LankaLux journey") +
      "\">" +
      video +
      title +
      "</a>"
    );
  }

  grid.innerHTML = CARDS.map(renderCard).join("");

  var playing = null;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var coarse = window.matchMedia("(pointer: coarse)").matches;

  function stopVideo(card) {
    if (!card) return;
    var video = card.querySelector("video");
    if (video) {
      video.pause();
      video.currentTime = 0;
    }
    card.classList.remove("is-playing");
    if (playing === card) playing = null;
  }

  function playVideo(card) {
    var video = card && card.querySelector("video");
    if (!video || reduced) return;
    if (playing && playing !== card) stopVideo(playing);
    if (!video.getAttribute("src") && video.dataset.src) {
      video.src = video.dataset.src;
    }
    var play = video.play();
    if (play && play.catch) play.catch(function () {});
    card.classList.add("is-playing");
    playing = card;
  }

  if (!coarse && !reduced) {
    grid.querySelectorAll(".road-card").forEach(function (card) {
      if (!card.querySelector("video")) return;
      card.addEventListener("mouseenter", function () { playVideo(card); });
      card.addEventListener("mouseleave", function () { stopVideo(card); });
      card.addEventListener("focus", function () { playVideo(card); });
      card.addEventListener("blur", function () { stopVideo(card); });
    });
  }
})();
