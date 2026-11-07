/* eleazarsoto.org · capa de pulido.
   En celular, aparta el botón del chat mientras el título de portada está en pantalla
   para que no lo tape. No cambia nada más. */
(function () {
  "use strict";
  var chat = document.querySelector("[data-chat]"), motto = document.querySelector(".sx-motto");
  if (!chat || !motto || !("IntersectionObserver" in window)) return;
  var small = window.matchMedia("(max-width: 719px)");
  new IntersectionObserver(function (es) {
    var panelOpen = chat.querySelector(".chat-panel") && !chat.querySelector(".chat-panel").hidden;
    chat.classList.toggle("is-tucked", small.matches && es[0].isIntersecting && !panelOpen);
  }).observe(motto);
})();
