// Plain JS, no build step. One scroll handler drives all the scroll-linked motion.

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

$('#year').textContent = new Date().getFullYear();

// Scroll-linked motion: the pinned hero sequence, parallax, stacking slabs, scrubbed words.
(function () {
  const beats = $$('.beat');
  if (reduce) return; // beats stay fully lit, nothing moves

  const hero = $('#hero'), stage = $('#stage'), name = $('#name'), copy = $('#heroCopy'), end = $('#heroEnd'), cue = $('.cue');
  const lines = $$('#name .ln');
  const pinned = matchMedia('(min-width: 801px) and (min-height: 601px)');
  const fixed = $$('[data-k]'), panes = $$('[data-pk]'), slabs = $$('.slab');
  const vizs = slabs.map((s) => $('.viz', s)), pebbleBox = $('.pebbles'), pebbles = $$('[data-sk]'), heads = $$('.h-xl');
  const sticky = matchMedia('(min-width: 801px) and (min-height: 701px)');
  const narrow = matchMedia('(max-width: 800px)'); // panes stack in one column here, so no drift
  let tops = [], queued = false, wasPinned = false;

  const measure = () => { tops = slabs.map((s) => parseFloat(getComputedStyle(s).top) || 0); };

  // The hero is a title sequence: push in on the sphere, part the name, land the closing line.
  function heroScene() {
    if (!hero) return;
    if (!pinned.matches) {
      if (wasPinned) {
        [stage, name, copy, end, cue, ...lines].forEach((el) => { el.style.cssText = ''; });
        wasPinned = false;
      }
      return;
    }
    wasPinned = true;
    const p = clamp(-hero.getBoundingClientRect().top / (hero.offsetHeight - innerHeight), 0, 1);

    stage.style.scale = (1 + 0.95 * p).toFixed(3);
    stage.style.translate = `-50% calc(-50% - ${(p * 7).toFixed(2)}vh)`;
    stage.style.opacity = (1 - clamp((p - 0.5) / 0.4, 0, 1)).toFixed(3);

    lines[0].style.translate = `${(-p * 16).toFixed(2)}vw 0`;
    lines[1].style.translate = `${(p * 16).toFixed(2)}vw 0`;
    name.style.opacity = (1 - clamp((p - 0.42) / 0.4, 0, 1)).toFixed(3);

    const c = 1 - clamp((p - 0.12) / 0.3, 0, 1);
    copy.style.opacity = c.toFixed(3);
    copy.style.translate = `0 ${(-p * 50).toFixed(1)}px`;
    copy.style.pointerEvents = c < 0.2 ? 'none' : '';

    const q = clamp((p - 0.6) / 0.22, 0, 1);
    end.style.opacity = q.toFixed(3);
    end.style.translate = `0 ${((1 - q) * 36).toFixed(1)}px`;
    end.style.filter = `blur(${((1 - q) * 10).toFixed(1)}px)`;

    cue.style.visibility = p > 0.06 ? 'hidden' : ''; // its CSS animation owns opacity
  }

  function update() {
    queued = false;
    const vh = innerHeight, y = Math.min(scrollY, 1600);

    heroScene();

    fixed.forEach((el) => { el.style.translate = `0 ${(y * el.dataset.k).toFixed(1)}px`; });

    // Panes read their parent's position, so their own translate can't feed back.
    panes.forEach((el) => {
      if (narrow.matches) { el.style.translate = ''; return; }
      const r = el.parentElement.getBoundingClientRect();
      if (r.bottom < -300 || r.top > vh + 300) return;
      el.style.translate = `0 ${((r.top + r.height / 2 - vh / 2) * el.dataset.pk).toFixed(1)}px`;
    });

    beats.forEach((b) => {
      const p = clamp((vh * 0.85 - b.getBoundingClientRect().top) / (vh * 0.5), 0, 1);
      b.style.setProperty('--fill', `${(p * 100).toFixed(1)}%`);
    });

    // Slabs: the diagram drifts against the text, and a slab recedes (shrinks, tilts back, dims)
    // as the next one slides over it. Dimming fades the content, never a blur, so it stays cheap.
    slabs.forEach((s, i) => {
      const viz = vizs[i];
      if (!sticky.matches) {
        s.style.scale = ''; s.style.rotate = ''; s.style.setProperty('--dim', '0');
        if (viz) viz.style.translate = '';
        return;
      }
      let p = 0;
      if (i < slabs.length - 1) {
        const h = s.offsetHeight;
        const next = slabs[i + 1].getBoundingClientRect().top;
        p = clamp((tops[i] + h - next) / (h - 18), 0, 1);
        s.style.scale = (1 - 0.07 * p).toFixed(4);
        s.style.rotate = `1 0 0 ${(-5 * p).toFixed(2)}deg`;
        s.style.setProperty('--dim', (0.5 * p).toFixed(3));
      }
      if (viz) {
        // Entering: the diagram trails the text, then settles. Receding: it sinks a little faster.
        const enter = p === 0 ? clamp(s.getBoundingClientRect().top - tops[i], 0, vh) * 0.14 : 0;
        viz.style.translate = `0 ${(enter + p * 34).toFixed(1)}px`;
      }
    });

    // Smaller tools: each pebble drifts up into the grid by its own distance, then locks in.
    if (pebbleBox) {
      const q = narrow.matches ? 1 : clamp((vh * 0.92 - pebbleBox.getBoundingClientRect().top) / (vh * 0.75), 0, 1);
      const e = Math.pow(1 - q, 1.6);
      pebbles.forEach((el) => { el.style.translate = e ? `0 ${(e * el.dataset.sk).toFixed(1)}px` : ''; });
    }

    // Section titles arrive a touch slower than the content around them, then scroll normally.
    // (Measured without our own offset, so the translate can't feed back into the measurement.)
    heads.forEach((h) => {
      if (narrow.matches) { h.style.translate = ''; h._t = 0; return; }
      const nat = h.getBoundingClientRect().top - (h._t || 0);
      if (nat > vh + 400 || nat < -600) return;
      const t = -clamp((nat - vh * 0.38) * 0.14, 0, 90);
      h._t = t;
      h.style.translate = t ? `0 ${t.toFixed(1)}px` : '';
    });
  }

  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', () => { measure(); queue(); });
  measure();
  update();
})();

// Cursor-follow shine on glass panels (CSS reads --mx / --my).
if (matchMedia('(hover: hover)').matches) {
  $$('.shine').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${e.clientX - r.left}px`);
      el.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  });
}

// Stack marquees: clone each list so the loop is seamless (the clone is hidden from screen readers).
$$('.marquee .track').forEach((track) => {
  const copy = track.firstElementChild.cloneNode(true);
  copy.setAttribute('aria-hidden', 'true');
  track.append(copy);
});

// Nav: a glass highlight springs to the hovered link, and rests on the current section.
(function () {
  const wrap = $('.nav-links'), slider = $('.nav-slider');
  const links = $$('.nav-links a');
  if (!wrap || !slider) return;
  const anchors = links.filter((a) => a.hash);
  let active = null;

  const place = (a) => {
    if (!a || !a.offsetWidth) { slider.style.opacity = 0; return; }
    slider.style.opacity = 1;
    slider.style.width = `${a.offsetWidth}px`;
    slider.style.translate = `${a.offsetLeft}px 0`;
  };
  links.forEach((a) => {
    a.addEventListener('pointerenter', () => place(a));
    a.addEventListener('focus', () => place(a));
  });
  wrap.addEventListener('pointerleave', () => place(active));
  wrap.addEventListener('focusout', () => place(active));

  if ('IntersectionObserver' in window) {
    const spy = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (!e.isIntersecting) return;
      active = anchors.find((a) => a.hash === `#${e.target.id}`) || null;
      links.forEach((a) => a.classList.toggle('active', a === active));
      place(active);
    }), { rootMargin: '-45% 0px -50% 0px' });
    anchors.forEach((a) => { const s = $(a.hash); if (s) spy.observe(s); });
  }
  const refresh = () => place(active);
  addEventListener('resize', refresh);
  if (document.fonts) document.fonts.ready.then(refresh);
})();

// Hero globe: dotted sphere with packets arcing between nodes. Canvas 2D, no deps.
(function () {
  const canvas = document.querySelector('.globe');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;
  const TILT = 0.4;
  const ARCS = 5;
  let size = 0, R = 0, rot = 0.6, last = 0, running = false;

  const dots = [];
  for (let i = 0; i < 2400; i++) {
    const y = 1 - (2 * (i + 0.5)) / 2400;
    const r = Math.sqrt(1 - y * y);
    const th = i * 2.39996323; // golden angle
    dots.push([Math.cos(th) * r, y, Math.sin(th) * r]);
  }

  const ll = (lat, lon) => {
    const la = (lat * Math.PI) / 180, lo = (lon * Math.PI) / 180;
    return [Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo)];
  };
  const nodes = [[37, -122], [40, -74], [51, 0], [52, 13], [19, 73], [1, 104], [35, 139], [-34, 151], [-23, -46], [-26, 28]].map((n) => ll(n[0], n[1]));

  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.trim().slice(i, i + 2), 16)).join();

  function resize() {
    size = canvas.clientWidth;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.height = Math.round(size * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    R = size * 0.42;
  }

  function newArc(now) {
    const a = Math.floor(Math.random() * nodes.length);
    let b;
    do { b = Math.floor(Math.random() * nodes.length); } while (b === a);
    return { a: nodes[a], b: nodes[b], t0: now + Math.random() * 1500, dur: 2800 + Math.random() * 1400 };
  }

  let arcs = [];

  function draw(now) {
    const cs = getComputedStyle(root);
    const ink = rgb(cs.getPropertyValue('--ink'));
    const accent = rgb(cs.getPropertyValue('--accent'));
    const c = size / 2;
    const cr = Math.cos(rot), sr = Math.sin(rot), ct = Math.cos(TILT), st = Math.sin(TILT);
    const proj = (p, k) => {
      const x1 = p[0] * cr + p[2] * sr, z1 = -p[0] * sr + p[2] * cr;
      return [c + x1 * R * k, c - (p[1] * ct - z1 * st) * R * k, p[1] * st + z1 * ct];
    };

    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = `rgb(${ink})`;
    for (const d of dots) {
      const [x, y, z] = proj(d, 1);
      ctx.globalAlpha = z > 0 ? 0.18 + 0.55 * z : 0.07;
      ctx.fillRect(x - 0.7, y - 0.7, 1.4, 1.4);
    }

    if (reduce) { ctx.globalAlpha = 1; return; }
    while (arcs.length < ARCS) arcs.push(newArc(now));

    ctx.lineWidth = 1.2;
    ctx.strokeStyle = ctx.fillStyle = `rgb(${accent})`;
    arcs = arcs.map((arc) => {
      const t = (now - arc.t0) / arc.dur;
      if (t > 1.35) return newArc(now);
      if (t < 0) return arc;
      const head = Math.min(t, 1);
      const tail = Math.max(0, Math.min(t - 0.35, 1));
      const fade = t > 1 ? 1 - (t - 1) / 0.35 : 1;
      const w = Math.acos(Math.min(1, arc.a[0] * arc.b[0] + arc.a[1] * arc.b[1] + arc.a[2] * arc.b[2]));
      const at = (s) => {
        const ka = Math.sin((1 - s) * w) / Math.sin(w), kb = Math.sin(s * w) / Math.sin(w);
        const p = [0, 1, 2].map((i) => ka * arc.a[i] + kb * arc.b[i]);
        return proj(p, 1 + 0.35 * Math.sin(Math.PI * s) * (w / Math.PI));
      };
      const N = 24;
      let prev = at(tail);
      for (let i = 1; i <= N; i++) {
        const cur = at(tail + ((head - tail) * i) / N);
        if (prev[2] > 0 && cur[2] > 0) {
          ctx.globalAlpha = 0.85 * (i / N) * fade;
          ctx.beginPath();
          ctx.moveTo(prev[0], prev[1]);
          ctx.lineTo(cur[0], cur[1]);
          ctx.stroke();
        }
        prev = cur;
      }
      if (prev[2] > 0) {
        ctx.globalAlpha = fade;
        ctx.beginPath();
        ctx.arc(prev[0], prev[1], 2, 0, 6.2832);
        ctx.fill();
        if (t > 1) { // arrival ping
          ctx.globalAlpha = 0.6 * fade;
          ctx.beginPath();
          ctx.arc(prev[0], prev[1], 2 + ((t - 1) / 0.35) * 12, 0, 6.2832);
          ctx.stroke();
        }
      }
      return arc;
    });
    ctx.globalAlpha = 1;
  }

  function frame(now) {
    if (!running) return;
    rot += Math.min(now - last, 50) * 0.00018;
    last = now;
    draw(now);
    requestAnimationFrame(frame);
  }

  resize();
  draw(0);
  window.addEventListener('resize', () => { resize(); draw(last); });

  if (reduce) {
    // Static frame, already drawn above.
  } else if ('IntersectionObserver' in window) {
    // Pause while scrolled out of view.
    new IntersectionObserver(([e]) => {
      running = e.isIntersecting;
      if (running) { last = performance.now(); requestAnimationFrame(frame); }
    }).observe(canvas);
  } else {
    running = true;
    requestAnimationFrame(frame);
  }
})();
