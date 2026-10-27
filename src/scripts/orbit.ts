// "Social Orbit" — the glowing core is you; the nine satellites are the nine
// likeability dimensions. Quiz answers pull satellites in and brighten them.
import * as THREE from 'three';

export const DIMENSION_COLORS = ['#38d6ff', '#5b84ff', '#fbbf24', '#f472b6', '#a78bfa', '#34d399', '#60a5fa', '#f76a0c', '#e879f9'];

export type Orbit = {
  setScroll(p: number): void;
  setMode(mode: 'hero' | 'content' | 'quiz' | 'result'): void;
  setScores(scores: number[]): void;
  pulse(index: number): void;
  setProgress(p: number): void;
  destroy(): void;
};

const NOISE = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.0-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;vec3 ns=n_*D.wyz-D.xzx;vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.0*x_);vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);vec4 s0=floor(b0)*2.0+1.0;vec4 s1=floor(b1)*2.0+1.0;vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,255,255,0.45)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createOrbit(canvas: HTMLCanvasElement, { reduced = false } = {}): Orbit {
  const lowPower = (navigator.hardwareConcurrency || 4) <= 4 && matchMedia('(pointer: coarse)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lowPower, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, lowPower ? 1 : 1.5));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
  camera.position.set(0, 0, 10);

  const world = new THREE.Group();
  scene.add(world);
  const system = new THREE.Group();
  system.rotation.x = 0.38;
  world.add(system);

  // --- Core -----------------------------------------------------------------
  const coreUniforms = {
    uTime: { value: 0 },
    uIntensity: { value: 0.4 },
    uScore: { value: 0.0 },
    uA: { value: new THREE.Color('#2b5cff') },
    uB: { value: new THREE.Color('#8b5cf6') },
    uC: { value: new THREE.Color('#ff8a3d') },
  };
  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.25, lowPower ? 24 : 64),
    new THREE.ShaderMaterial({
      uniforms: coreUniforms,
      transparent: true,
      vertexShader: /* glsl */ `
        uniform float uTime; uniform float uIntensity;
        varying vec3 vNormal; varying vec3 vView; varying float vNoise;
        ${NOISE}
        void main(){
          float n = snoise(normal * 1.1 + vec3(uTime * 0.18));
          float n2 = snoise(normal * 2.6 - vec3(uTime * 0.27)) * 0.25;
          vNoise = n + n2;
          vec3 pos = position + normal * (n + n2) * (0.06 + uIntensity * 0.09);
          vec4 mv = modelViewMatrix * vec4(pos, 1.0);
          vNormal = normalize(normalMatrix * normal);
          vView = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uA; uniform vec3 uB; uniform vec3 uC; uniform float uScore; uniform float uTime;
        varying vec3 vNormal; varying vec3 vView; varying float vNoise;
        void main(){
          float fres = pow(1.0 - max(dot(vNormal, vView), 0.0), 2.6);
          float t = clamp(vNoise * 0.55 + 0.5, 0.0, 1.0);
          vec3 col = mix(uA, uB, smoothstep(0.15, 0.85, t));
          col = mix(col, uC, smoothstep(0.6, 1.0, t) * (0.3 + uScore * 0.6));
          float light = 0.62 + 0.38 * dot(vNormal, normalize(vec3(-0.45, 0.65, 0.6)));
          float sheen = pow(max(dot(reflect(-vView, vNormal), normalize(vec3(-0.3, 0.8, 0.5))), 0.0), 18.0);
          col = col * light * 1.15 + fres * vec3(0.62, 0.8, 1.0) * 1.25 + sheen * 0.6;
          gl_FragColor = vec4(col, 0.96);
        }`,
    }),
  );
  system.add(core);

  const glowTex = glowTexture();
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: '#5b7dff', transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.scale.setScalar(6.5);
  system.add(halo);

  // --- Satellites (9 dimensions) -------------------------------------------
  const sats = DIMENSION_COLORS.map((hex, i) => {
    const color = new THREE.Color(hex);
    const radius = 2.25 + (i % 3) * 0.55 + i * 0.06;
    const tilt = new THREE.Group();
    tilt.rotation.set((i % 2 ? 1 : -1) * (0.15 + (i % 4) * 0.12), 0, (i / 9) * Math.PI);
    system.add(tilt);

    const ringGeo = new THREE.BufferGeometry().setFromPoints(
      new THREE.EllipseCurve(0, 0, 1, 1, 0, Math.PI * 2).getPoints(160).map((p) => new THREE.Vector3(p.x, 0, p.y)),
    );
    const ring = new THREE.LineLoop(ringGeo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.12, depthWrite: false }));
    ring.scale.setScalar(radius);
    tilt.add(ring);

    const body = new THREE.Mesh(new THREE.SphereGeometry(0.09, 24, 24), new THREE.MeshBasicMaterial({ color }));
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending }));
    glow.scale.setScalar(0.75);
    body.add(glow);
    tilt.add(body);

    return { tilt, ring, body, glow, radius, target: radius, speed: 0.12 + ((i * 37) % 9) * 0.018, phase: (i / 9) * Math.PI * 2, score: 0, pulse: 0 };
  });

  // Links from the core to each satellite, visible once scored.
  const linkGeo = new THREE.BufferGeometry();
  const linkPos = new Float32Array(9 * 2 * 3);
  const linkCol = new Float32Array(9 * 2 * 3);
  linkGeo.setAttribute('position', new THREE.BufferAttribute(linkPos, 3));
  linkGeo.setAttribute('color', new THREE.BufferAttribute(linkCol, 3));
  const links = new THREE.LineSegments(linkGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  system.add(links);

  // --- Starfield + dust ------------------------------------------------------
  const starCount = lowPower ? 900 : 2200;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const r = 18 + Math.random() * 60;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    starPos.set([r * Math.sin(ph) * Math.cos(th), r * Math.sin(ph) * Math.sin(th), r * Math.cos(ph)], i * 3);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ size: 0.12, color: '#b9c6ff', transparent: true, opacity: 0.7, depthWrite: false, sizeAttenuation: true }));
  scene.add(stars);

  const dustCount = lowPower ? 250 : 700;
  const dustPos = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    const r = 1.6 + Math.pow(Math.random(), 0.6) * 3.4;
    const a = Math.random() * Math.PI * 2;
    dustPos.set([Math.cos(a) * r, (Math.random() - 0.5) * 0.5 * (r - 1), Math.sin(a) * r], i * 3);
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ size: 0.035, color: '#9fb4ff', transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
  system.add(dust);

  // --- State -----------------------------------------------------------------
  const state = {
    mode: 'hero' as 'hero' | 'content' | 'quiz' | 'result',
    scroll: 0,
    pointer: new THREE.Vector2(),
    pointerS: new THREE.Vector2(),
    pos: new THREE.Vector3(),
    targetPos: new THREE.Vector3(),
    scale: 1,
    targetScale: 1,
    intensity: 0.4,
    targetIntensity: 0.4,
    progress: 0,
    linkOpacity: 0,
    opacity: 1,
  };
  let width = 1;
  let height = 1;

  function layout() {
    width = canvas.clientWidth || innerWidth;
    height = canvas.clientHeight || innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    computeTarget();
  }

  function computeTarget() {
    const wide = camera.aspect > 1.1;
    const s = state.scroll;
    switch (state.mode) {
      case 'hero':
        // Drop back and drift aside as the hero scrolls away.
        state.targetPos.set(wide ? 2.6 + s * 1.2 : 0, wide ? -0.1 + s * 1.6 : 1.9 + s * 2.4, -s * 7);
        state.targetScale = wide ? 1 : 0.62;
        state.targetIntensity = 0.45;
        break;
      case 'content':
        // Parked high on the right edge while people read.
        state.targetPos.set(wide ? 7.2 : 2.6, wide ? 3.4 : 4.6, -10);
        state.targetScale = 0.75;
        state.targetIntensity = 0.3;
        break;
      case 'quiz':
        state.targetPos.set(0, wide ? 0 : 0.5, -3.4);
        state.targetScale = wide ? 1.15 : 0.8;
        state.targetIntensity = 0.55 + state.progress * 0.6;
        break;
      case 'result':
        state.targetPos.set(wide ? -2.6 : 0, wide ? 0 : 1.2, -1.2);
        state.targetScale = wide ? 1.1 : 0.7;
        state.targetIntensity = 0.9;
        break;
    }
  }

  const onPointer = (e: PointerEvent) => state.pointer.set((e.clientX / innerWidth) * 2 - 1, (e.clientY / innerHeight) * 2 - 1);
  addEventListener('pointermove', onPointer, { passive: true });
  const ro = new ResizeObserver(layout);
  ro.observe(canvas);
  layout();
  state.pos.copy(state.targetPos);
  state.scale = state.targetScale;

  // --- Loop ------------------------------------------------------------------
  let last = performance.now();
  let elapsed = 0;
  let raf = 0;
  let running = false;
  const tmp = new THREE.Vector3();

  function frame() {
    const now = performance.now();
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    elapsed += dt;
    const t = elapsed;
    const k = 1 - Math.pow(0.0018, dt); // smooth follow

    state.pointerS.lerp(state.pointer, k * 0.6);
    state.pos.lerp(state.targetPos, k * 0.55);
    state.scale += (state.targetScale - state.scale) * k * 0.55;
    state.intensity += (state.targetIntensity - state.intensity) * k;
    state.linkOpacity += ((state.mode === 'result' ? 0.55 : state.mode === 'quiz' ? 0.25 : 0) - state.linkOpacity) * k * 0.5;

    world.position.copy(state.pos);
    world.scale.setScalar(state.scale);
    world.rotation.y = state.pointerS.x * 0.35;
    world.rotation.x = state.pointerS.y * 0.2;
    system.rotation.y = t * 0.06;

    coreUniforms.uTime.value = t;
    coreUniforms.uIntensity.value = state.intensity;
    halo.material.opacity = 0.35 + state.intensity * 0.35;

    sats.forEach((s, i) => {
      s.radius += (s.target - s.radius) * k * 0.5;
      s.pulse *= Math.pow(0.04, dt);
      const a = s.phase + t * s.speed * (state.mode === 'quiz' ? 1.6 : 1);
      s.body.position.set(Math.cos(a) * s.radius, Math.sin(a * 2) * 0.05, Math.sin(a) * s.radius);
      s.ring.scale.setScalar(s.radius);
      const size = 1 + s.score * 0.9 + s.pulse * 1.6;
      s.body.scale.setScalar(size);
      s.glow.material.opacity = 0.55 + s.score * 0.4 + s.pulse * 0.5;
      (s.ring.material as THREE.LineBasicMaterial).opacity = 0.08 + s.score * 0.22 + s.pulse * 0.4;
      s.body.getWorldPosition(tmp);
      system.worldToLocal(tmp);
      linkPos.set([0, 0, 0, tmp.x, tmp.y, tmp.z], i * 6);
      const c = (s.body.material as THREE.MeshBasicMaterial).color;
      const w = 0.25 + s.score;
      linkCol.set([c.r * w, c.g * w, c.b * w, c.r * w, c.g * w, c.b * w], i * 6);
    });
    linkGeo.attributes.position.needsUpdate = true;
    linkGeo.attributes.color.needsUpdate = true;
    (links.material as THREE.LineBasicMaterial).opacity = state.linkOpacity;

    dust.rotation.y = -t * 0.04;
    stars.rotation.y = t * 0.004 + state.scroll * 0.3;
    stars.rotation.x = state.scroll * 0.15;

    renderer.render(scene, camera);
    if (running) raf = requestAnimationFrame(frame);
  }

  function start() {
    if (running || reduced) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }
  // Reduced motion: render settled frames on demand only.
  function still() {
    if (!reduced) return;
    state.pos.copy(state.targetPos);
    state.scale = state.targetScale;
    state.intensity = state.targetIntensity;
    sats.forEach((s) => (s.radius = s.target));
    frame();
  }
  const onVis = () => (document.hidden ? stop() : start());
  document.addEventListener('visibilitychange', onVis);
  if (reduced) still();
  else start();

  return {
    setScroll(p) {
      state.scroll = p;
      computeTarget();
    },
    setMode(mode) {
      if (state.mode === mode) return;
      state.mode = mode;
      computeTarget();
      still();
    },
    setScores(scores) {
      // scores: 0..1 per dimension (or -1 for unanswered)
      let sum = 0;
      let n = 0;
      scores.forEach((v, i) => {
        const s = sats[i];
        if (!s) return;
        const base = 2.25 + (i % 3) * 0.55 + i * 0.06;
        if (v < 0) {
          s.score = 0;
          s.target = base;
          return;
        }
        s.score = v;
        s.target = base - v * 0.85;
        sum += v;
        n++;
      });
      coreUniforms.uScore.value = n ? sum / n : 0;
      still();
    },
    pulse(i) {
      if (sats[i]) sats[i].pulse = 1;
    },
    setProgress(p) {
      state.progress = p;
      computeTarget();
    },
    destroy() {
      stop();
      ro.disconnect();
      removeEventListener('pointermove', onPointer);
      document.removeEventListener('visibilitychange', onVis);
      renderer.dispose();
    },
  };
}
