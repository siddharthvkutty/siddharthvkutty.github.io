// Plain JS, no build step.

document.getElementById('year').textContent = new Date().getFullYear();

// Tabs
(function () {
  const tabs = [...document.querySelectorAll('.tab-btn')];
  tabs.forEach((tab) => tab.addEventListener('click', () => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.classList.toggle('active', on);
      t.setAttribute('aria-selected', on);
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
  }));
})();

// Cursor-follow shine on glass panels (CSS reads --mx / --my)
if (matchMedia('(hover: hover)').matches) {
  document.querySelectorAll('.tile, .about-card').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${e.clientX - r.left}px`);
      el.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  });
}

// Scroll reveal + nav scroll-spy
if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const reveal = new IntersectionObserver((entries, obs) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    const el = e.target;
    el.classList.add('reveal-visible');
    obs.unobserve(el);
    // Drop the reveal classes once done so they don't slow or delay hover transitions.
    el.addEventListener('transitionend', () => {
      el.classList.remove('reveal-pending', 'reveal-visible');
      el.style.transitionDelay = '';
    }, { once: true });
  }), { threshold: 0.05, rootMargin: '0px 0px -4% 0px' });
  document.querySelectorAll('.tile, .about-rows div, .about-card, .tech-group').forEach((el, i) => {
    el.classList.add('reveal-pending');
    el.style.transitionDelay = `${(i % 3) * 30}ms`;
    reveal.observe(el);
  });
}

if ('IntersectionObserver' in window) {
  const links = [...document.querySelectorAll('.nav-links a[href^="#"]')];
  const spy = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) links.forEach((l) => l.classList.toggle('active', l.hash === `#${e.target.id}`));
  }), { rootMargin: '-45% 0px -50% 0px' });
  links.forEach((l) => { const s = document.querySelector(l.hash); if (s) spy.observe(s); });
}

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
  for (let i = 0; i < 1100; i++) {
    const y = 1 - (2 * (i + 0.5)) / 1100;
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
