// The "Get the Android app" 3D phone: a glossy handset showing the real app screens
// (cross-fading home → question → result), with the nine dimension emojis orbiting it
// in depth (the soft glow behind it is CSS). It floats, sways and tilts toward the pointer.
// Loaded only when its section nears the screen, renders only while visible, and
// draws a single still frame when the visitor prefers reduced motion.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { DIMENSION_COLORS, DIMENSION_EMOJI } from './orbit';

export type Phone = { destroy(): void };

const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","Twemoji Mozilla",sans-serif';

function emojiTexture(ch: string, ring: string) {
  const c = document.createElement('canvas');
  c.width = c.height = 160;
  const g = c.getContext('2d')!;
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.arc(80, 80, 70, 0, Math.PI * 2);
  g.fill();
  g.lineWidth = 9;
  g.strokeStyle = ring;
  g.stroke();
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `76px ${EMOJI_FONT}`;
  g.fillText(ch, 80, 86);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// A rounded rectangle with UVs running 0..1 across it, for the screen glass.
function screenGeometry(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  const geo = new THREE.ShapeGeometry(s, 12);
  const pos = geo.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = (pos.getX(i) - x) / w;
    uv[i * 2 + 1] = (pos.getY(i) - y) / h;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geo;
}

export type PhoneOptions = {
  screens: string[];
  reduced?: boolean;
  onReady?: () => void;
  /** Called with the screen index each time a new screen starts fading in (for synced captions). */
  onScreen?: (index: number) => void;
  /** Seconds each screen stays before cross-fading to the next. */
  hold?: number;
};
export function createPhone(canvas: HTMLCanvasElement, { screens, reduced = false, onReady, onScreen, hold = 3.2 }: PhoneOptions): Phone {
  const lowPower = (navigator.hardwareConcurrency || 4) <= 4 && matchMedia('(pointer: coarse)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, lowPower ? 1.5 : 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 0, 6.4);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x2a2350, 1.4));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(2.5, 3, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x9b7bff, 2.4);
  rim.position.set(-3, -1, -2);
  scene.add(rim);

  // The handset.
  const W = 1.12;
  const H = W * (844 / 390) + 0.12;
  const phone = new THREE.Group();
  const body = new THREE.Mesh(
    new RoundedBoxGeometry(W + 0.1, H + 0.1, 0.12, 6, 0.14),
    new THREE.MeshPhysicalMaterial({ color: 0x16143a, metalness: 0.55, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.15 }),
  );
  phone.add(body);
  const glassGeo = screenGeometry(W, H - 0.12, 0.1);
  const loader = new THREE.TextureLoader();
  const tex = screens.map((src) => {
    const t = loader.load(src, () => draw());
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return t;
  });
  const front = new THREE.Mesh(glassGeo, new THREE.MeshBasicMaterial({ map: tex[0], transparent: true }));
  const back = new THREE.Mesh(glassGeo, new THREE.MeshBasicMaterial({ map: tex[1 % tex.length], transparent: true, opacity: 0 }));
  front.position.z = 0.0615;
  back.position.z = 0.062;
  phone.add(front, back);
  // A speaker slot, so it reads as a phone from any angle.
  const slot = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.16, 4, 8), new THREE.MeshBasicMaterial({ color: 0x0b0a20 }));
  slot.rotation.z = Math.PI / 2;
  slot.position.set(0, H / 2 - 0.04, 0.063);
  phone.add(slot);
  scene.add(phone);

  // Nine dimension emojis on a tilted ring around the phone (some pass behind it).
  const ring = new THREE.Group();
  ring.rotation.x = 1.15;
  const bubbles = DIMENSION_EMOJI.map((e, i) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: emojiTexture(e, DIMENSION_COLORS[i]), transparent: true }));
    s.scale.setScalar(0.38);
    ring.add(s);
    return s;
  });
  scene.add(ring);
  const R = 1.5;
  const placeBubbles = (t: number) =>
    bubbles.forEach((s, i) => {
      const a = (i / bubbles.length) * Math.PI * 2 + t * 0.25;
      s.position.set(Math.cos(a) * R, Math.sin(a) * R, Math.sin(i * 1.7 + t) * 0.08);
    });

  // Size: fit the scene to the canvas.
  const resize = () => {
    const { clientWidth: w, clientHeight: h } = canvas;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Fit the whole scene: the emoji ring sideways (radius + bubble) and the phone
    // top to bottom (with its float), whatever the canvas shape.
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    camera.position.z = Math.max((R + 0.32) / (tan * camera.aspect), 1.62 / tan);
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(() => (resize(), draw()));
  ro.observe(canvas);
  resize();

  // Pointer tilt (desktop) within the section.
  const target = { x: 0, y: 0 };
  const stage = canvas.parentElement!;
  const onMove = (e: PointerEvent) => {
    const r = stage.getBoundingClientRect();
    target.x = ((e.clientY - r.top) / r.height - 0.5) * -0.35;
    target.y = ((e.clientX - r.left) / r.width - 0.5) * 0.6;
  };
  const onLeave = () => ((target.x = 0), (target.y = 0));
  if (!reduced) {
    stage.addEventListener('pointermove', onMove);
    stage.addEventListener('pointerleave', onLeave);
  }

  let screen = 0;
  let fadeStart = -1;
  const SHOW = hold;
  const FADE = 0.7;
  const pose = (t: number) => {
    phone.rotation.y += ((reduced ? -0.32 : -0.28 + Math.sin(t * 0.45) * 0.22) + target.y - phone.rotation.y) * 0.06;
    phone.rotation.x += ((reduced ? 0.06 : 0.05 + Math.sin(t * 0.6) * 0.04) + target.x - phone.rotation.x) * 0.06;
    phone.position.y = reduced ? 0 : Math.sin(t * 0.9) * 0.07;
    ring.rotation.z = reduced ? 0.4 : t * 0.04;
    placeBubbles(reduced ? 0.4 : t);
  };

  function draw() {
    renderer.render(scene, camera);
  }

  let raf = 0;
  let visible = false;
  const clock = new THREE.Clock();
  let last = 0;
  const loop = () => {
    raf = 0;
    if (!visible || document.hidden) return;
    const t = clock.getElapsedTime();
    pose(t);
    // Screen carousel: hold, then cross-fade to the next screen.
    if (fadeStart < 0 && t - last > SHOW) {
      fadeStart = t;
      // Captions change as the next screen starts to appear, so they never lag behind it.
      onScreen?.((screen + 1) % tex.length);
    }
    if (fadeStart >= 0) {
      const p = Math.min(1, (t - fadeStart) / FADE);
      (back.material as THREE.MeshBasicMaterial).opacity = p;
      if (p >= 1) {
        screen = (screen + 1) % tex.length;
        (front.material as THREE.MeshBasicMaterial).map = tex[screen];
        (back.material as THREE.MeshBasicMaterial).map = tex[(screen + 1) % tex.length];
        (back.material as THREE.MeshBasicMaterial).opacity = 0;
        fadeStart = -1;
        last = t;
      }
    }
    draw();
    raf = requestAnimationFrame(loop);
  };
  const start = () => {
    if (reduced) return pose(0), draw();
    if (!raf && visible && !document.hidden) raf = requestAnimationFrame(loop);
  };
  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    start();
  });
  io.observe(canvas);
  const onVis = () => start();
  document.addEventListener('visibilitychange', onVis);

  pose(0);
  draw();
  onReady?.();
  onScreen?.(0);

  return {
    destroy() {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      stage.removeEventListener('pointermove', onMove);
      stage.removeEventListener('pointerleave', onLeave);
      renderer.dispose();
    },
  };
}
