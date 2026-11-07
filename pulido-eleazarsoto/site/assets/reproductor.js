/* eleazarsoto.org · reproductor de El Instante Azul dentro del sitio (Bandcamp).
   Se activa cuando lib/manifest.js tiene bandcamp.album con el número del disco.
   El reproductor se carga solo cuando el visitante se acerca a Discografía. */
(function () {
  "use strict";
  var box = document.querySelector("[data-player]"), cfg = (window.__BRAND__ || {}).bandcamp || {};
  if (!box || !/^\d+$/.test(String(cfg.album || ""))) return;
  var frame = box.querySelector(".player-frame");
  var src = "https://bandcamp.com/EmbeddedPlayer/album=" + cfg.album +
    "/size=large/bgcol=100806/linkcol=e7d0ba/artwork=small/tracklist=true/transparent=true/";
  function load() {
    if (frame.firstChild) return;
    var f = document.createElement("iframe");
    f.src = src; f.title = "El Instante Azul · Bandcamp"; f.loading = "lazy";
    f.setAttribute("seamless", ""); f.allow = "autoplay";
    frame.appendChild(f);
  }
  box.hidden = false;
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { load(); io.disconnect(); } }, { rootMargin: "600px" });
    io.observe(box);
  } else load();
})();
