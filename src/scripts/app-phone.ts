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
  /** Radius of the emoji ring (smaller = the camera can frame the phone larger). */
  ringRadius?: number;
  /** 'phone': a modern phone (slim bezels, camera pill, side buttons), screens 390×844.
   *  'tablet': a tablet held upright (even bezels, front camera), screens 820×1180. */
  device?: 'phone' | 'tablet';
};
export function createPhone(canvas: HTMLCanvasElement, { screens, reduced = false, onReady, onScreen, hold = 3.2, ringRadius = 1.5, device = 'phone' }: PhoneOptions): Phone {
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

  // The device: screen size, bezel and corner radii. No brand marks.
  const tablet = device === 'tablet';
  const SW = tablet ? 1.9 : 1.12; // screen width
  const SH = tablet ? SW * (1180 / 820) : SW * (844 / 390); // screen height
  const bezel = tablet ? 0.1 : 0.045;
  const depth = tablet ? 0.075 : 0.1;
  const W = SW + bezel * 2; // body
  const H = SH + bezel * 2;
  const phone = new THREE.Group();
  const frameMat = new THREE.MeshPhysicalMaterial({ color: tablet ? 0x1c1b33 : 0x24223f, metalness: 0.7, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.12 });
  const body = new THREE.Mesh(new RoundedBoxGeometry(W, H, depth, 8, tablet ? 0.17 : 0.2), frameMat);
  phone.add(body);
  const glassGeo = screenGeometry(SW, SH, tablet ? 0.08 : 0.17);
  const loader = new THREE.TextureLoader();
  const tex = screens.map((src) => {
    const t = loader.load(src, () => draw());
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return t;
  });
  const front = new THREE.Mesh(glassGeo, new THREE.MeshBasicMaterial({ map: tex[0], transparent: true }));
  const back = new THREE.Mesh(glassGeo, new THREE.MeshBasicMaterial({ map: tex[1 % tex.length], transparent: true, opacity: 0 }));
  const face = depth / 2 + 0.0015;
  front.position.z = face;
  back.position.z = face + 0.0005;
  phone.add(front, back);
  const dark = new THREE.MeshBasicMaterial({ color: 0x07061a });
  if (tablet) {
    // Front camera in the top bezel.
    const cam = new THREE.Mesh(new THREE.CircleGeometry(0.022, 20), dark);
    cam.position.set(0, H / 2 - bezel / 2, face + 0.001);
    phone.add(cam);
  } else {
    // A pill-shaped camera cut-out at the top of the screen, and side buttons.
    const pill = new THREE.Mesh(new THREE.CapsuleGeometry(0.052, 0.17, 6, 16), dark);
    pill.rotation.z = Math.PI / 2;
    pill.position.set(0, SH / 2 - 0.1, face + 0.002);
    phone.add(pill);
    const button = (x: number, y: number, h: number) => {
      const m = new THREE.Mesh(new RoundedBoxGeometry(0.03, h, depth * 0.45, 2, 0.012), frameMat);
      m.position.set(x, y, 0);
      phone.add(m);
    };
    button(W / 2 + 0.008, 0.45, 0.3); // power
    button(-W / 2 - 0.008, 0.62, 0.2); // volume up
    button(-W / 2 - 0.008, 0.36, 0.2); // volume down
  }
  scene.add(phone);

  // Nine dimension emojis on a tilted ring around the phone (some pass behind it).
  const ring = new THREE.Group();
  ring.rotation.x = 1.15;
  const bubbles = DIMENSION_EMOJI.map((e, i) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: emojiTexture(e, DIMENSION_COLORS[i]), transparent: true }));
    ring.add(s);
    return s;
  });
  scene.add(ring);
  // Tall, narrow stages pull the ring in close, so the phone itself can fill the height.
  let R = ringRadius;
  const bubbleSize = () => (R < 1 ? 0.26 : R < 1.4 ? 0.32 : 0.38);
  // Bubbles fade while they pass in front of the phone, so the screen stays readable.
  const world = new THREE.Vector3();
  const placeBubbles = (t: number) => {
    bubbles.forEach((s, i) => {
      const a = (i / bubbles.length) * Math.PI * 2 + t * 0.25;
      s.position.set(Math.cos(a) * R, Math.sin(a) * R, Math.sin(i * 1.7 + t) * 0.08);
    });
    ring.updateMatrixWorld();
    bubbles.forEach((s) => {
      s.getWorldPosition(world);
      const overScreen = world.z > 0 && Math.abs(world.x - phone.position.x) < W / 2 + 0.22 && Math.abs(world.y - phone.position.y) < H / 2 + 0.1;
      const m = s.material as THREE.SpriteMaterial;
      m.opacity += ((overScreen ? 0.1 : 1) - m.opacity) * 0.15;
    });
  };

  // Size: fit the scene to the canvas.
  const resize = () => {
    const { clientWidth: w, clientHeight: h } = canvas;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Fit the whole scene: the emoji ring sideways (radius + bubble) and the phone
    // top to bottom (with its float), whatever the canvas shape.
    // Narrow stages: the ring hugs the phone and sits behind it, so the emojis peek out
    // around its edges in full colour instead of crossing (and fading over) the screen.
    const narrow = camera.aspect < 0.8;
    R = narrow ? Math.min(ringRadius, 0.74) : ringRadius;
    ring.rotation.x = narrow ? 0.25 : 1.15;
    ring.position.z = narrow ? -0.4 : 0;
    bubbles.forEach((b) => b.scale.setScalar(bubbleSize()));
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    camera.position.z = Math.max((R + bubbleSize() / 2 + 0.1) / (tan * camera.aspect), (H / 2 + 0.16) / tan);
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
