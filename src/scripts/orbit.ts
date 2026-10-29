// "Social Orbit": an emoji face at the centre (you) with the nine likeability
// dimensions orbiting as their emojis. Quiz answers pull each dimension in and
// make it bigger; the face brightens as the overall score rises.
// The canvas lives inside a panel and only renders while that panel is visible.
import * as THREE from 'three';

export const DIMENSION_COLORS = ['#22b8e6', '#4f73ff', '#f5b301', '#ec4899', '#8b5cf6', '#10b981', '#3b82f6', '#f76a0c', '#d946ef'];
export const DIMENSION_EMOJI = ['👋', '🗣️', '☀️', '💛', '🧠', '🤲', '🔐', '🤝', '🎭'];
const FACES = ['🙂', '😊', '😄', '🤩'];

export type Theme = 'light' | 'dark';
export type Orbit = {
  setMode(mode: 'idle' | 'quiz' | 'result'): void;
  setScores(scores: number[]): void;
  pulse(index: number): void;
  setTheme(theme: Theme): void;
  destroy(): void;
};

const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","Twemoji Mozilla",sans-serif';
const textures = new Map<string, THREE.Texture>();
function emojiTexture(ch: string) {
  let t = textures.get(ch);
  if (t) return t;
  const c = document.createElement('canvas');
  c.width = c.height = 192;
  const g = c.getContext('2d')!;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `148px ${EMOJI_FONT}`;
  g.fillText(ch, 96, 104);
  t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  textures.set(ch, t);
  return t;
}
function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.45)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createOrbit(canvas: HTMLCanvasElement, { reduced = false, theme = 'light' as Theme } = {}): Orbit {
  const lowPower = (navigator.hardwareConcurrency || 4) <= 4 && matchMedia('(pointer: coarse)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, lowPower ? 1.25 : 1.75));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0, 0, 9);
  const world = new THREE.Group();
  scene.add(world);
  const system = new THREE.Group();
  system.rotation.x = 0.95; // tilted toward the viewer so the orbit fills the panel
  world.add(system);
  const glowTex = glowTexture();

  // Core: a big emoji face over a soft halo.
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false }));
  halo.scale.setScalar(4.2);
  system.add(halo);
  const face = new THREE.Sprite(new THREE.SpriteMaterial({ map: emojiTexture(FACES[1]), transparent: true, depthWrite: false }));
  face.scale.setScalar(1.7);
  system.add(face);

  // Satellites
  const sats = DIMENSION_EMOJI.map((ch, i) => {
    const color = new THREE.Color(DIMENSION_COLORS[i]);
    const base = 2.15 + i * 0.12;
    const tilt = new THREE.Group();
    tilt.rotation.set((i % 2 ? 1 : -1) * 0.05 * (i % 3), 0, (i % 2 ? -1 : 1) * 0.06 * ((i + 1) % 3));
    system.add(tilt);
    const ring = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(new THREE.EllipseCurve(0, 0, 1, 1, 0, Math.PI * 2).getPoints(128).map((p) => new THREE.Vector3(p.x, 0, p.y))),
      new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.2, depthWrite: false }),
    );
    ring.scale.setScalar(base);
    tilt.add(ring);
    const body = new THREE.Group();
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity: 0.55, depthWrite: false }));
    glow.scale.setScalar(1.05);
    const icon = new THREE.Sprite(new THREE.SpriteMaterial({ map: emojiTexture(ch), transparent: true, depthWrite: false }));
    icon.scale.setScalar(0.62);
    body.add(glow, icon);
    tilt.add(body);
    return { tilt, ring, body, glow, icon, base, radius: base, target: base, speed: 0.1 + ((i * 37) % 9) * 0.014, phase: (i / 9) * Math.PI * 2, score: 0, pulse: 0 };
  });

  // Links from the core to each satellite (visible once answered).
  const linkGeo = new THREE.BufferGeometry();
  const linkPos = new Float32Array(9 * 6);
  const linkCol = new Float32Array(9 * 6);
  linkGeo.setAttribute('position', new THREE.BufferAttribute(linkPos, 3));
  linkGeo.setAttribute('color', new THREE.BufferAttribute(linkCol, 3));
  const links = new THREE.LineSegments(linkGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, depthWrite: false }));
  system.add(links);

  // Stars (dark theme only)
  const starPos = new Float32Array(500 * 3);
  for (let i = 0; i < 500; i++) {
    const r = 12 + Math.random() * 30;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    starPos.set([r * Math.sin(ph) * Math.cos(th), r * Math.sin(ph) * Math.sin(th), -Math.abs(r * Math.cos(ph))], i * 3);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ size: 0.08, color: '#c3ccff', transparent: true, opacity: 0.7, depthWrite: false }));
  scene.add(stars);

  const state = { mode: 'idle' as 'idle' | 'quiz' | 'result', linkTarget: 0, link: 0, pointer: new THREE.Vector2(), pointerS: new THREE.Vector2(), mood: 1 };

  function applyTheme(t: Theme) {
    const dark = t === 'dark';
    stars.visible = dark;
    const blend = dark ? THREE.AdditiveBlending : THREE.NormalBlending;
    halo.material.color.set(dark ? '#6d5cff' : '#b7c4ff');
    halo.material.opacity = dark ? 0.55 : 0.85;
    halo.material.blending = blend;
    sats.forEach((s) => {
      s.glow.material.blending = blend;
      s.glow.material.opacity = dark ? 0.55 : 0.4;
      (s.ring.material as THREE.LineBasicMaterial).opacity = dark ? 0.16 : 0.22;
    });
    (links.material as THREE.LineBasicMaterial).blending = blend;
    [halo.material, ...sats.map((s) => s.glow.material), links.material as THREE.Material].forEach((m) => (m.needsUpdate = true));
    render();
  }

  function fit() {
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    // Keep the outermost orbit inside the panel on narrow canvases.
    const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
    const halfW = halfH * camera.aspect;
    // Fit the outer orbit (radius ~3.1 plus emoji) inside the panel both ways.
    const tiltY = Math.sin(system.rotation.x);
    world.scale.setScalar(Math.min(1.15, (halfW * 0.86) / 3.45, (halfH * 0.86) / (3.45 * tiltY + 0.35)));
    render();
  }

  const onPointer = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    state.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, ((e.clientY - r.top) / r.height) * 2 - 1).clampScalar(-1.2, 1.2);
  };
  addEventListener('pointermove', onPointer, { passive: true });

  let last = performance.now();
  let elapsed = 0;
  let raf = 0;
  let visible = false;
  const tmp = new THREE.Vector3();

  function step(dt: number) {
    elapsed += dt;
    const t = elapsed;
    const k = 1 - Math.pow(0.002, dt);
    state.pointerS.lerp(state.pointer, k * 0.5);
    world.rotation.y = state.pointerS.x * 0.25;
    world.rotation.x = state.pointerS.y * 0.15;
    system.rotation.y = t * 0.05;
    state.link += (state.linkTarget - state.link) * k;
    face.scale.setScalar(1.7 * (1 + Math.sin(t * 1.6) * 0.025));
    sats.forEach((s, i) => {
      s.radius += (s.target - s.radius) * k * 0.6;
      s.pulse *= Math.pow(0.05, dt);
      const a = s.phase + t * s.speed * (state.mode === 'quiz' ? 1.5 : 1);
      s.body.position.set(Math.cos(a) * s.radius, Math.sin(t * 0.9 + i) * 0.06, Math.sin(a) * s.radius);
      s.ring.scale.setScalar(s.radius);
      s.body.scale.setScalar(1 + s.score * 0.55 + s.pulse * 0.7);
      s.body.getWorldPosition(tmp);
      system.worldToLocal(tmp);
      linkPos.set([0, 0, 0, tmp.x, tmp.y, tmp.z], i * 6);
      const c = s.glow.material.color;
      const w = 0.35 + s.score * 0.65;
      linkCol.set([c.r * w, c.g * w, c.b * w, c.r * w, c.g * w, c.b * w], i * 6);
    });
    linkGeo.attributes.position.needsUpdate = true;
    linkGeo.attributes.color.needsUpdate = true;
    (links.material as THREE.LineBasicMaterial).opacity = state.link;
  }
  function render() {
    renderer.render(scene, camera);
  }
  function loop(now: number) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    step(dt);
    render();
    raf = requestAnimationFrame(loop);
  }
  function update() {
    const should = visible && !document.hidden && !reduced;
    if (should && !raf) {
      last = performance.now();
      raf = requestAnimationFrame(loop);
    } else if (!should && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  }
  // Reduced motion: settle and draw a single frame when something changes.
  function still() {
    if (!reduced) return;
    sats.forEach((s) => (s.radius = s.target));
    state.link = state.linkTarget;
    step(0);
    render();
  }

  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    update();
  });
  io.observe(canvas);
  const ro = new ResizeObserver(fit);
  ro.observe(canvas);
  const onVis = () => update();
  document.addEventListener('visibilitychange', onVis);

  applyTheme(theme);
  fit();
  still();

  return {
    setMode(mode) {
      state.mode = mode;
      state.linkTarget = mode === 'result' ? 0.6 : mode === 'quiz' ? 0.3 : 0;
      still();
    },
    setScores(scores) {
      let sum = 0;
      let n = 0;
      scores.forEach((v, i) => {
        const s = sats[i];
        if (!s) return;
        s.score = v < 0 ? 0 : v;
        s.target = v < 0 ? s.base : s.base - v * 0.7;
        if (v >= 0) {
          sum += v;
          n++;
        }
      });
      const avg = n ? sum / n : -1;
      const mood = avg < 0 ? 1 : avg >= 0.85 ? 3 : avg >= 0.7 ? 2 : avg >= 0.5 ? 1 : 0;
      if (mood !== state.mood) {
        state.mood = mood;
        face.material.map = emojiTexture(FACES[mood]);
        face.material.needsUpdate = true;
      }
      still();
    },
    pulse(i) {
      if (sats[i]) sats[i].pulse = 1;
    },
    setTheme(t) {
      applyTheme(t);
    },
    destroy() {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      removeEventListener('pointermove', onPointer);
      document.removeEventListener('visibilitychange', onVis);
      renderer.dispose();
    },
  };
}
