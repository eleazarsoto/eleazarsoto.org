(function () {
  "use strict";
  // Datos de la marca. Edita aquí formatos, necesidades técnicas, tarifas y contacto.
  window.__BRAND__ = {
    name: "Eleazar Soto",
    // api: true activa el asistente IA, la lectura de documentos y la búsqueda de direcciones
    //      (funciones de Cloudflare Pages en /api/...). false = sitio 100 % estático, sin IA.
    // backend: "directo" = la propuesta se envía por WhatsApp o correo (sin servidor de formularios);
    //          "php" = usa lead.php en un hosting con PHP.
    api: true,
    backend: "directo",
    endpoints: { chat: "/api/asistente", doc: "/api/documento", geo: "/api/geocode" },
    social: {
      instagram: "https://www.instagram.com/eleazarsoto_music/",
      facebook: "https://www.facebook.com/ESotomusic/",
      bandcamp: "https://elinstanteazul.bandcamp.com/album/el-instante-azul",
      youtube: ""
    },
    contact: { whatsapp: "33 5122 1400", email: "rezzonante@gmail.com", base: "Ajijic, Jalisco, México" },
    base: { lat: 20.2997, lon: -103.2610 }, // Ajijic: punto de partida para la distancia

    // Tarifas ORIENTATIVAS en MXN por formato. Mientras estén en null, la propuesta
    // dice «Eleazar te envía la cotización». Ejemplo: solo: { porSet: 2500, minimo: 4000 }
    tarifas: { solo: null, fellowship: null, clinica: null },

    formatos: {
      solo: {
        es: "Saxofón solo", en: "Solo saxophone",
        rider_es: "Necesidades orientativas: 1 micrófono para saxofón y 1 monitor. En espacios pequeños puede tocar acústico.",
        rider_en: "Typical needs: 1 sax mic and 1 monitor. Small rooms can be fully acoustic."
      },
      fellowship: {
        es: "Eleazar Soto & The Fellowship", en: "Eleazar Soto & The Fellowship",
        rider_es: "Necesidades orientativas: piano o teclado, amplificador de bajo, batería, micrófonos y monitores para cuatro músicos. Escenario de unos 12 m².",
        rider_en: "Typical needs: piano or keyboard, bass amp, drum kit, mics and monitors for four musicians. Stage of about 12 m²."
      },
      clinica: {
        es: "Clínica de improvisación", en: "Improvisation clinic",
        rider_es: "Necesidades orientativas: salón con sillas, pantalla o pizarrón y sonido básico.",
        rider_en: "Typical needs: a room with chairs, a screen or board and basic sound."
      }
    },

    // Datos de ejemplo para el botón «Probar con datos de ejemplo» (no son reales)
    ejemplo: { tipo: "privado", fecha: "", invitados: 60, horas: 2, espacio: "exterior", ambiente: "fondo", direccion: "Ajijic, Jalisco", area: 220 }
  };
})();
