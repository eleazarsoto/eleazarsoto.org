/* eleazarsoto.org · fondos animados inspirados en la música improvisada.
   Siete gestos, uno por sección: aliento, pentagrama, trazo, ondas, melodía, armonía (Lissajous) y pulso.
   Muy tenues y lentos; solo se mueven en pantalla y se detienen con "reducir movimiento". */
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var DPR = Math.min(window.devicePixelRatio || 1, 1.5);
  var CREAM = "244,238,231", SAND = "231,208,186";
  var MAP = { "sx-motto": "aliento", discografia: "pentagrama", proyectos: "trazo", musica: "ondas", bio: "melodia", contacto: "armonia", estudio: "pulso", preguntas: "aliento" };
  var rnd = Math.random;

  var secs = [].slice.call(document.querySelectorAll(".sx-motto, .sx-sec, .study, .faq"));
  var list = [];
  secs.forEach(function (sec) {
    var kind = MAP[sec.id] || (sec.classList.contains("sx-motto") ? MAP["sx-motto"] : null);
    if (!kind || sec.querySelector("canvas.fondo")) return;
    var cv = document.createElement("canvas");
    cv.className = "fondo"; cv.setAttribute("aria-hidden", "true");
    sec.insertBefore(cv, sec.firstChild);
    sec.classList.add("has-fondo");
    var s = { sec: sec, cv: cv, ctx: cv.getContext("2d"), kind: kind, t: rnd() * 50, on: false };
    size(s); init(s); list.push(s);
  });
  if (!list.length) return;

  function size(s) {
    var r = s.sec.getBoundingClientRect();
    s.w = Math.max(1, r.width); s.h = Math.max(1, r.height);
    s.cv.width = s.w * DPR; s.cv.height = s.h * DPR;
    s.ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  function rgba(c, a) { return "rgba(" + c + "," + a.toFixed(3) + ")"; }

  function init(s) {
    var w = s.w, h = s.h, i;
    if (s.kind === "aliento") { s.p = []; for (i = 0; i < Math.round(w / 26); i++) s.p.push(newBreath(s, true)); }
    if (s.kind === "pentagrama") { s.notes = []; for (i = 0; i < 9; i++) s.notes.push(newNote(s, true)); }
    if (s.kind === "trazo") { s.strokes = []; s.next = 0; }
    if (s.kind === "ondas") { s.rings = []; s.next = 0; }
    if (s.kind === "melodia") { s.pts = []; s.x = -20; s.y = h * (0.35 + rnd() * 0.3); s.step = 0; }
    if (s.kind === "pulso") {
      s.cols = Math.max(8, Math.round(w / 90)); s.rows = Math.max(3, Math.round(h / 140));
      s.cells = []; for (i = 0; i < s.cols * s.rows; i++) s.cells.push({ a: 0, jx: (rnd() - .5) * 18, jy: (rnd() - .5) * 18 });
      s.beat = -1;
    }
  }
  function newBreath(s, any) { return { x: rnd() * s.w, y: any ? rnd() * s.h : s.h + 10, r: 0.6 + rnd() * 1.4, v: 0.08 + rnd() * 0.16, ph: rnd() * 6.28, amp: 6 + rnd() * 18 }; }
  function newNote(s, any) { return { x: any ? rnd() * s.w : -20, line: Math.floor(rnd() * 9), v: 0.06 + rnd() * 0.12, stem: rnd() < .6, acc: rnd() < .18 }; }

  function draw(s, dt) {
    var c = s.ctx, w = s.w, h = s.h, t = s.t, i;
    c.clearRect(0, 0, w, h);

    if (s.kind === "aliento") { // partículas que suben como el aire por el saxofón
      s.p.forEach(function (p, k) {
        p.y -= p.v * dt * 60; var x = p.x + Math.sin(t * 0.6 + p.ph + p.y * 0.01) * p.amp;
        var life = Math.min(1, (h - p.y) / (h * 0.25)) * Math.min(1, p.y / (h * 0.35));
        c.beginPath(); c.arc(x, p.y, p.r, 0, 6.283);
        c.fillStyle = rgba(k % 11 === 0 ? SAND : CREAM, (k % 11 === 0 ? 0.32 : 0.11) * Math.max(0, life)); c.fill();
        if (p.y < -10) s.p[k] = newBreath(s, false);
      });
    }

    else if (s.kind === "pentagrama") { // pentagrama que respira y notas que cruzan despacio
      var top = h * 0.84, gap = 11;
      for (i = 0; i < 5; i++) {
        c.beginPath();
        for (var x = 0; x <= w; x += 16) c.lineTo(x, top + i * gap + Math.sin(x * 0.0022 + t * 0.18) * 14);
        c.strokeStyle = rgba(CREAM, 0.055); c.lineWidth = 1; c.stroke();
      }
      s.notes.forEach(function (n, k) {
        n.x += n.v * dt * 60;
        var y = top + n.line * gap / 2 + Math.sin(n.x * 0.0022 + t * 0.18) * 14;
        var fade = Math.min(1, n.x / 120, (w - n.x) / 120);
        c.save(); c.translate(n.x, y); c.rotate(-0.35);
        c.beginPath(); c.ellipse(0, 0, 5, 3.4, 0, 0, 6.283);
        c.fillStyle = rgba(n.acc ? SAND : CREAM, (n.acc ? 0.34 : 0.12) * Math.max(0, fade)); c.fill(); c.restore();
        if (n.stem) { c.beginPath(); c.moveTo(n.x + 4.4, y - 1); c.lineTo(n.x + 4.4, y - 30); c.strokeStyle = rgba(CREAM, 0.08 * Math.max(0, fade)); c.stroke(); }
        if (n.x > w + 20) s.notes[k] = newNote(s, false);
      });
    }

    else if (s.kind === "trazo") { // gestos de tinta que aparecen, respiran y se van
      s.next -= dt;
      if (s.next <= 0 && s.strokes.length < 3) {
        var x0 = rnd() * w, y0 = h * (0.2 + rnd() * 0.6), len = 220 + rnd() * 320, ang = (rnd() - .5) * 0.9;
        s.strokes.push({ x0: x0, y0: y0, cx1: x0 + Math.cos(ang) * len * 0.3, cy1: y0 - 60 - rnd() * 120, cx2: x0 + Math.cos(ang) * len * 0.7, cy2: y0 + 40 + rnd() * 120, x1: x0 + Math.cos(ang) * len, y1: y0 + Math.sin(ang) * len * 0.4, age: 0, life: 9 + rnd() * 5, acc: rnd() < .3 });
        s.next = 2.8 + rnd() * 3;
      }
      s.strokes = s.strokes.filter(function (k) { return k.age < k.life; });
      s.strokes.forEach(function (k) {
        k.age += dt;
        var grow = Math.min(1, k.age / 3.2), fade = Math.min(1, (k.life - k.age) / 3);
        var N = 60, upto = Math.floor(N * grow);
        for (var j = 1; j <= upto; j++) {
          var a = (j - 1) / N, b = j / N;
          var P = bez(k, a), Q = bez(k, b), wdt = 0.4 + Math.sin(b * Math.PI) * 2.2;
          c.beginPath(); c.moveTo(P[0], P[1]); c.lineTo(Q[0], Q[1]);
          c.strokeStyle = rgba(k.acc ? SAND : CREAM, (k.acc ? 0.22 : 0.08) * fade); c.lineWidth = wdt; c.lineCap = "round"; c.stroke();
        }
      });
    }

    else if (s.kind === "ondas") { // cada nota tocada deja ondas que se abren
      s.next -= dt;
      if (s.next <= 0) { s.rings.push({ x: rnd() * w, y: h * (0.15 + rnd() * 0.7), age: 0, acc: rnd() < .35 }); s.next = 1.6 + rnd() * 2.6; }
      s.rings = s.rings.filter(function (r) { return r.age < 7; });
      s.rings.forEach(function (r) {
        r.age += dt;
        for (var j = 0; j < 3; j++) {
          var R = (r.age - j * 0.6) * 34; if (R <= 0) continue;
          var a = Math.max(0, 1 - r.age / 7) * (j === 0 && r.acc ? 0.3 : 0.09);
          c.beginPath(); c.arc(r.x, r.y, R, 0, 6.283); c.strokeStyle = rgba(j === 0 && r.acc ? SAND : CREAM, a); c.lineWidth = 1; c.stroke();
        }
      });
    }

    else if (s.kind === "melodia") { // una línea melódica improvisada que se escribe sola
      var speed = 22 * dt;
      s.x += speed; s.step -= speed;
      if (s.step <= 0) {
        var r = rnd(); s.step = 14 + rnd() * 40;
        if (r < 0.12) s.rest = 30 + rnd() * 50;              // silencio
        else s.target = Math.max(h * 0.18, Math.min(h * 0.82, s.y + (rnd() - .5) * (r < 0.8 ? 60 : 160))); // paso o salto
      }
      if (s.rest > 0) { s.rest -= speed; s.pts.push(null); }
      else { s.y += ((s.target || s.y) - s.y) * Math.min(1, dt * 2.4); s.pts.push([s.x, s.y + Math.sin(t * 9) * (s.trill ? 2.5 : 0), t]); }
      if (rnd() < dt * 0.15) s.trill = !s.trill;
      if (s.pts.length > 900) s.pts.shift();
      c.lineWidth = 1.2; c.lineCap = "round";
      for (i = 1; i < s.pts.length; i++) {
        var A = s.pts[i - 1], B = s.pts[i]; if (!A || !B) continue;
        var age = t - B[2], al = Math.max(0, 1 - age / 26);
        c.beginPath(); c.moveTo(A[0], A[1]); c.lineTo(B[0], B[1]); c.strokeStyle = rgba(CREAM, 0.12 * al); c.stroke();
      }
      var last = s.pts[s.pts.length - 1];
      if (last) { c.beginPath(); c.arc(last[0], last[1], 2.4, 0, 6.283); c.fillStyle = rgba(SAND, 0.5); c.fill(); }
      if (s.x > w + 40) { s.x = -20; s.pts.push(null); }
    }

    else if (s.kind === "armonia") { // dos voces que se entrelazan (curvas de Lissajous)
      var cx = w > 900 ? w * 0.86 : w * 0.8, cy = h * 0.62, R1 = Math.min(w, h) * (w > 900 ? 0.2 : 0.16);
      [[3, 2, CREAM, 0.05], [5, 4, SAND, 0.12]].forEach(function (v, k) {
        c.beginPath();
        for (var q = 0; q <= 360; q++) {
          var u = q / 360 * 6.283;
          var X = cx + Math.sin(v[0] * u + t * 0.12 * (k ? -1 : 1)) * R1 * (k ? 0.7 : 1);
          var Y = cy + Math.sin(v[1] * u) * R1 * (k ? 0.7 : 1);
          q ? c.lineTo(X, Y) : c.moveTo(X, Y);
        }
        c.strokeStyle = rgba(v[2], v[3]); c.lineWidth = 1; c.stroke();
      });
    }

    else if (s.kind === "pulso") { // polirritmo 3 contra 4: puntos que se encienden a destiempo
      var beat = Math.floor(t * 1.2);
      if (beat !== s.beat) {
        s.beat = beat;
        var col = beat % s.cols;
        for (var rr = 0; rr < s.rows; rr++) {
          if ((beat % 3 === 0 && rr % 2 === 0) || (beat % 4 === 0 && rr % 2 === 1) || rnd() < 0.08) s.cells[rr * s.cols + col].a = 1;
        }
      }
      var gx = w / s.cols, gy = h / s.rows;
      s.cells.forEach(function (cell, k) {
        var X = (k % s.cols + 0.5) * gx + cell.jx, Y = (Math.floor(k / s.cols) + 0.5) * gy + cell.jy;
        cell.a = Math.max(0, cell.a - dt * 0.35);
        c.beginPath(); c.arc(X, Y, 1.3 + cell.a * 1.8, 0, 6.283);
        c.fillStyle = cell.a > 0.05 ? rgba(SAND, 0.06 + cell.a * 0.3) : rgba(CREAM, 0.06); c.fill();
      });
    }
  }
  function bez(k, u) {
    var m = 1 - u;
    return [m * m * m * k.x0 + 3 * m * m * u * k.cx1 + 3 * m * u * u * k.cx2 + u * u * u * k.x1,
            m * m * m * k.y0 + 3 * m * m * u * k.cy1 + 3 * m * u * u * k.cy2 + u * u * u * k.y1];
  }

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { list.forEach(function (s) { if (s.sec === e.target) s.on = e.isIntersecting; }); });
    }, { rootMargin: "80px" });
    list.forEach(function (s) { io.observe(s.sec); });
  } else list.forEach(function (s) { s.on = true; });

  if (reduce) { // una sola imagen quieta, sin movimiento
    list.forEach(function (s) { for (var i = 0; i < 40; i++) { s.t += 0.25; draw(s, 0.25); } });
    return;
  }
  var last = 0;
  function loop(now) {
    var dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
    if (!document.hidden) list.forEach(function (s) { if (s.on) { s.t += dt; draw(s, dt); } });
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  var rt; window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(function () { list.forEach(function (s) { size(s); init(s); }); }, 250); });
})();
