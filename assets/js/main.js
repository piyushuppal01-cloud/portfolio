/* ─────────────────────────────────────────────────────────────
   PIYUSH UPPAL — PORTFOLIO / BEHAVIOUR
   3D hero scene · starfield · tilt cards · parallax
   plus scroll reveals, pinned header, active nav, footer year.
   Degrades gracefully (static canvas, no tilt) with reduced motion.
   ───────────────────────────────────────────────────────────── */
(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;
  const smallMQ = window.matchMedia("(max-width: 960px)");
  const mqSmall = () => (smallMQ.matches ? 100 : 170);

  /* Header — pin state after scroll ─────────────────────────── */
  const header = document.querySelector("[data-header]");
  const onScroll = () => {
    if (!header) return;
    header.classList.toggle("is-pinned", window.scrollY > 12);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* Footer year ─────────────────────────────────────────────── */
  const yearEl = document.querySelector("[data-year]");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* Reveal on scroll ────────────────────────────────────────── */
  const revealEls = Array.from(document.querySelectorAll(".reveal"));

  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  } else {
    revealEls.forEach((el) => {
      if (el.matches("[data-split]")) return;
      const siblings = Array.from(el.parentElement ? el.parentElement.children : []);
      const idx = siblings.indexOf(el);
      if (idx > 0 && siblings[idx - 1]?.classList.contains("reveal")) {
        el.style.setProperty("--d", `${Math.min(idx, 4) * 90}ms`);
      }
    });

    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );

    revealEls.forEach((el) => revealObserver.observe(el));
  }

  /* Active nav link ─────────────────────────────────────────── */
  const navLinks = Array.from(document.querySelectorAll(".nav-link"));
  const sections = navLinks
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  if ("IntersectionObserver" in window && sections.length) {
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          navLinks.forEach((link) => {
            const match = link.getAttribute("href") === `#${entry.target.id}`;
            if (match) link.setAttribute("aria-current", "true");
            else link.removeAttribute("aria-current");
          });
        });
      },
      { rootMargin: "-42% 0px -52% 0px" }
    );

    sections.forEach((section) => sectionObserver.observe(section));
  }

  /* ── Background starfield ─────────────────────────────────── */
  const initStarfield = () => {
    const canvas = document.querySelector("[data-bg-scene]");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const isMobile = mqSmall() === 100;
    let stars = [];
    let w = 0;
    let h = 0;
    let raf = 0;
    let running = false;

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = isMobile ? 70 : 130;
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 0.4 + Math.random() * 1.1,
        phase: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 1.2,
        violet: Math.random() < 0.22,
        accent: Math.random() < 0.14
      }));
      if (reduceMotion) draw(0);
    };

    const draw = (t) => {
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t / 700 * s.speed + s.phase));
        const alpha = 0.55 * tw;
        let rgb = "255,255,255";
        if (s.accent) rgb = "255,106,61";
        else if (s.violet) rgb = "139,124,255";
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb},${alpha})`;
        ctx.fill();
      }
    };

    const loop = (t) => {
      if (!running) return;
      draw(t);
      raf = requestAnimationFrame(loop);
    };

    const start = () => {
      if (running) return;
      running = true;
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    resize();
    window.addEventListener("resize", resize, { passive: true });
    if (reduceMotion) {
      draw(0);
      return;
    }
    document.addEventListener("visibilitychange", () => {
      document.hidden ? stop() : start();
    });
    start();
  };

  /* ── Hero 3D scene ────────────────────────────────────────── */
  const initHeroScene = () => {
    const holder = document.querySelector("[data-scene]");
    if (!holder || reduceMotion) return;
    const canvas = document.createElement("canvas");
    canvas.className = "hero-scene__canvas";
    holder.appendChild(canvas);
    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const isSmall = () => smallMQ.matches;

    const ACCENT = [255, 106, 61];
    const VIOLET = [139, 124, 255];

    let w = 0;
    let h = 0;
    let points = [];
    let pairs = [];
    let raf = 0;
    let running = false;
    let rotX = 0;
    let rotY = 0;
    let autoX = 0;
    let autoY = 0;
    let mouseX = 0;
    let mouseY = 0;

    const buildPoints = () => {
      const count = isSmall() ? 100 : 170;
      points = [];
      pairs = [];
      for (let i = 0; i < count; i++) {
        const y = 1 - (2 * (i + 0.5)) / count;
        const r = Math.sqrt(Math.max(0, 1 - y * y));
        const th = i * 2.399963;
        points.push({
          x: r * Math.cos(th),
          y,
          z: r * Math.sin(th),
          mixAccent: i % 3 !== 0
        });
      }
      /* constellation pairs — nearest neighbours */
      if (isSmall()) return;
      for (let i = 0; i < count; i++) {
        const a = points[i];
        const dists = [];
        for (let j = 0; j < count; j++) {
          if (i === j) continue;
          const dx = a.x - points[j].x;
          const dy = a.y - points[j].y;
          const dz = a.z - points[j].z;
          dists.push([j, dx * dx + dy * dy + dz * dz]);
        }
        dists.sort((p, q) => p[1] - q[1]);
        let linked = 0;
        for (let k = 0; k < 4 && linked < 2 && k < dists.length; k++) {
          const [j, d] = dists[k];
          if (d < 0.85) {
            pairs.push([i, j]);
            linked++;
          }
        }
      }
    };

    const rotate = (x, y, z) => {
      const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
      const y2 = y * cosX - z * sinX;
      const z2 = y * sinX + z * cosX;
      const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
      const x3 = x * cosY + z2 * sinY;
      const z3 = -x * sinY + z2 * cosY;
      return [x3, y2, z3];
    };

    const resize = () => {
      w = holder.clientWidth;
      h = holder.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildPoints();
    };

    const draw = (t) => {
      ctx.clearRect(0, 0, w, h);
      const S = Math.min(w, h) * 0.3;
      const cx = w / 2 + mouseX * S * 0.06;
      const cy = h / 2 + mouseY * S * 0.06;
      const fl = 3;
      const glow = finePointer && !isSmall();

      autoY += 0.0026;
      autoX += 0.001;
      const tx = autoX + mouseY * 0.85;
      const ty = autoY + mouseX * 1.05;
      rotX += (tx - rotX) * 0.05;
      rotY += (ty - rotY) * 0.05;

      const proj = new Array(points.length);
      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        const [x, y, z] = rotate(p.x, p.y, p.z);
        const f = fl / (fl - z);
        proj[i] = { x: cx + x * S * f, y: cy - y * S * f, f, z, a: p.mixAccent };
      }

      /* constellation lines */
      if (pairs.length) {
        ctx.lineWidth = 1;
        ctx.strokeStyle = "rgba(139,124,255,0.14)";
        ctx.beginPath();
        for (const [i, j] of pairs) {
          ctx.moveTo(proj[i].x, proj[i].y);
          ctx.lineTo(proj[j].x, proj[j].y);
        }
        ctx.stroke();
      }

      /* orbital rings */
      const drawRing = (radius, tilt, alpha) => {
        ctx.lineWidth = 1;
        ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
        ctx.beginPath();
        const cb = Math.cos(tilt), sb = Math.sin(tilt);
        for (let s = 0; s <= 48; s++) {
          const ang = (s / 48) * Math.PI * 2;
          const rx = radius * Math.cos(ang);
          const ry = radius * Math.sin(ang) * cb;
          const rz = radius * Math.sin(ang) * sb;
          const [x, y, z] = rotate(rx, ry, rz);
          const f = fl / (fl - z);
          const px = cx + x * S * f;
          const py = cy - y * S * f;
          if (s === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      };
      drawRing(1.28, 0.85, 0.16);
      drawRing(1.5, -0.5, 0.1);

      /* points */
      for (let i = 0; i < proj.length; i++) {
        const q = proj[i];
        const depth = q.f;
        const alpha = Math.min(1, 0.25 + depth * 0.5);
        const base = q.a ? ACCENT : VIOLET;
        let rgb = `rgba(${base[0]},${base[1]},${base[2]},${alpha})`;
        const radius = (1.1 + (depth - 1) * 1.6) * (isSmall() ? 0.8 : 1);

        if (glow) {
          ctx.shadowBlur = 12;
          ctx.shadowColor = `rgba(${base[0]},${base[1]},${base[2]},${0.8})`;
        }
        ctx.beginPath();
        ctx.arc(q.x, q.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = rgb;
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      void t;
    };

    const loop = (t) => {
      if (!running) return;
      draw(t);
      raf = requestAnimationFrame(loop);
    };
    const start = () => {
      if (running) return;
      running = true;
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    resize();
    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener("mousemove", (e) => {
      mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      mouseY = (e.clientY / window.innerHeight) * 2 - 1;
    }, { passive: true });
    document.addEventListener("visibilitychange", () => {
      document.hidden ? stop() : start();
    });
    start();
  };

  /* ── 3D tilt cards ────────────────────────────────────────── */
  const initTilt = () => {
    const els = Array.from(document.querySelectorAll("[data-tilt]"));
    if (!els.length) return;
    const max = 6;

    els.forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        const rx = (0.5 - py) * max * 2;
        const ry = (px - 0.5) * max * 2;
        el.style.transform = `perspective(900px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateZ(0)`;
        el.style.transition = "transform 0.16s ease-out";
        el.style.setProperty("--mx", `${(px * 100).toFixed(1)}%`);
        el.style.setProperty("--my", `${(py * 100).toFixed(1)}%`);
      });

      el.addEventListener("pointerleave", () => {
        el.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg) translateZ(0)";
        el.style.transition = "transform 0.55s cubic-bezier(0.2, 0.66, 0.18, 1)";
      });
    });
  };

  /* ── Scroll parallax ──────────────────────────────────────── */
  const initParallax = () => {
    const els = Array.from(document.querySelectorAll("[data-parallax]"));
    if (!els.length) return;
    let ticking = false;

    const update = () => {
      const y = window.scrollY;
      els.forEach((el) => {
        const speed = parseFloat(el.dataset.parallax) || 0.04;
        el.style.transform = `translate3d(0, ${(y * speed).toFixed(1)}px, 0)`;
      });
      ticking = false;
    };

    window.addEventListener(
      "scroll",
      () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(update);
      },
      { passive: true }
    );
    update();
  };

  /* ── Custom cursor ────────────────────────────────────────── */
  const initCursor = () => {
    if (reduceMotion || !window.matchMedia("(pointer: fine)").matches) return;

    const dot = document.createElement("div");
    dot.className = "cursor-dot";
    dot.setAttribute("aria-hidden", "true");
    const ring = document.createElement("div");
    ring.className = "cursor-ring";
    ring.setAttribute("aria-hidden", "true");
    const label = document.createElement("span");
    label.className = "cursor-ring__label";
    ring.appendChild(label);
    document.body.appendChild(dot);
    document.body.appendChild(ring);
    document.documentElement.classList.add("has-custom-cursor");

    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let rx = mx;
    let ry = my;
    let scale = 1;
    let targetScale = 1;
    let filled = false;
    let labelText = "";

    const apply = (dt) => {
      const k = 1 - Math.exp((-dt / 1000) * 6);
      rx += (mx - rx) * k;
      ry += (my - ry) * k;
      scale += (targetScale - scale) * k;
      if (label.textContent !== labelText) label.textContent = labelText;
      dot.style.transform = `translate3d(${mx}px,${my}px,0) translate(-50%,-50%)`;
      ring.style.transform = `translate3d(${rx.toFixed(2)}px,${ry.toFixed(2)}px,0) translate(-50%,-50%) scale(${scale.toFixed(3)})`;
      ring.classList.toggle("is-label", labelText !== "");
      ring.classList.toggle("is-filled", filled);
      dot.classList.toggle("is-hidden", labelText !== "" || filled);
    };

    const reset = () => {
      targetScale = 1;
      filled = false;
      labelText = "";
    };

    window.addEventListener(
      "mousemove",
      (e) => {
        mx = e.clientX;
        my = e.clientY;
        if (!dot.classList.contains("is-visible")) {
          dot.classList.add("is-visible");
          ring.classList.add("is-visible");
        }
      },
      { passive: true }
    );

    document.addEventListener(
      "mouseover",
      (e) => {
        const t = e.target.closest
          ? e.target.closest(".hero__visual, [data-scene], .project__visual, .cta-primary, .contact__links a, button, a")
          : null;
        if (!t) {
          reset();
          return;
        }
        if (t.matches(".hero__visual, [data-scene]")) {
          targetScale = 2.1;
          filled = true;
          labelText = "EXPLORE";
        } else if (t.matches(".project__visual")) {
          targetScale = 2.1;
          filled = true;
          labelText = "VIEW";
        } else if (t.matches(".cta-primary, .contact__links a, button")) {
          targetScale = 1.65;
          filled = true;
          labelText = "";
        } else {
          targetScale = 1.45;
          filled = false;
          labelText = "";
        }
      },
      { passive: true }
    );

    document.documentElement.addEventListener("mouseleave", () => {
      dot.classList.remove("is-visible");
      ring.classList.remove("is-visible");
    });
    document.documentElement.addEventListener("mouseenter", () => {
      dot.classList.add("is-visible");
      ring.classList.add("is-visible");
    });

    let last = performance.now();
    const loop = (now) => {
      if (!document.hidden) {
        const dt = Math.min(now - last, 64);
        last = now;
        apply(dt);
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  };

  /* ── Boot ─────────────────────────────────────────────────── */
  initStarfield();
  initHeroScene();
  initCursor();
  if (finePointer && !reduceMotion) initTilt();
  if (!reduceMotion) initParallax();
})();