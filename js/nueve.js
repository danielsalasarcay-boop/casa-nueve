/* Casa Nueve — portada: el 9 de madera en 3D.
   La forma está trazada sobre la pieza real y la cara lleva su madera (foto de la pieza).
   Al cargar se dibuja el boceto a trazos finos; con el scroll la madera aparece poco a poco
   subiendo por la veta, la pieza gana grosor y gira suave mientras una luz barre la madera.
   El mouse la inclina y se puede girar arrastrando. Three.js r160. */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CONTORNO, OJO } from './nueve-forma.js';

const hero = document.getElementById('inicio');
const canvas = document.getElementById('nueve');
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const SMALL = Math.min(innerWidth, innerHeight) < 700;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
} catch (e) {
  document.documentElement.classList.add('no-webgl');
  throw e;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, SMALL ? 2 : 1.75));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.setClearColor(0xffffff, 0);

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.03).texture;
scene.environmentIntensity = .55;

const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
camera.position.set(0, 0, 7.4);

const key = new THREE.DirectionalLight(0xfff0dc, 2.1);
key.position.set(-3.5, 3.5, 5);
scene.add(key);
const fill = new THREE.DirectionalLight(0xe9f4f4, .45);
fill.position.set(4, -1, 3);
scene.add(fill);
const rim = new THREE.DirectionalLight(0xfff1e2, .7);
rim.position.set(2, 3, -4);
scene.add(rim);

/* ───────── Forma ───────── */
const toV = arr => { const o = []; for (let i = 0; i < arr.length; i += 2) o.push(new THREE.Vector2(arr[i], arr[i + 1])); return o; };
const SHAPE = new THREE.Shape(toV(CONTORNO));
SHAPE.holes.push(new THREE.Path(toV(OJO)));

const DEPTH = .16;
const geo = new THREE.ExtrudeGeometry(SHAPE, {
  depth: DEPTH, steps: 1, bevelEnabled: true,
  bevelThickness: .014, bevelSize: .012, bevelSegments: 5,
});
geo.translate(0, 0, -DEPTH / 2);

/* ───────── Madera real ───────── */
const loader = new THREE.TextureLoader();
const aniso = renderer.capabilities.getMaxAnisotropy();
const tex = (url, srgb) => new Promise(res => loader.load(url, t => {
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso;
  // la cara del 9 calza con la foto de la pieza (coordenadas medidas)
  t.repeat.set(.4524, .475); t.offset.set(.5, .4962);
  res(t);
}, undefined, () => res(null)));
const [woodMap, woodBump] = await Promise.all([tex('img/madera-9.jpg?v=4', true), tex('img/madera-9-relieve.jpg?v=3', false)]);
const sideMap = woodMap ? woodMap.clone() : null;
if (sideMap) { sideMap.needsUpdate = true; sideMap.repeat.set(.6, 4); sideMap.offset.set(.2, 0); sideMap.wrapS = sideMap.wrapT = THREE.MirroredRepeatWrapping; }

/* La madera aparece poco a poco, subiendo por la veta, con un borde más oscuro
   como madera recién aceitada. uReveal: 0 → nada, 1 → todo. */
const uReveal = { value: REDUCED ? 1 : 0 };
const revealize = (mat, isSide = false) => {
  mat.onBeforeCompile = sh => {
    sh.uniforms.uReveal = uReveal;
    sh.vertexShader = 'varying vec3 vObjPos;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vObjPos = position;');
    sh.fragmentShader = `uniform float uReveal; varying vec3 vObjPos;
float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p){ float a = .5, s = 0.; for (int i = 0; i < 4; i++) { s += a * vn(p); p *= 2.03; a *= .5; } return s; }
` + sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
  float front = (vObjPos.y + 1.0) / 2.0 * .82 + (vObjPos.x + 1.0) / 2.0 * .18;
  float nn = fbm(vObjPos.xy * vec2(2.6, 1.2) + 3.7) * .2;
  float m = uReveal * 1.26 - (front + nn);
  if (m < 0.0) discard;
  if (m < .012 && h21(gl_FragCoord.xy) > m / .012) discard;
  float stain = 1.0 - smoothstep(0.0, .09, m);
  diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(.52, .4, .32), stain * .85);` + (isSide ? `
  // dentro del ojo y de la ranura la madera queda cruda y más clara, como en la pieza
  vec2 q = vObjPos.xy;
  float inEye = (1.0 - smoothstep(.2, .26, abs(q.x - .147))) * (1.0 - smoothstep(.1, .14, abs(q.y - .345)));
  float inSlot = (1.0 - smoothstep(.24, .28, abs(q.x - .075))) * (1.0 - smoothstep(.09, .12, abs(q.y + .36)));
  float raw = max(inEye, inSlot);
  vec3 rawWood = vec3(.5, .32, .2) * (.86 + .28 * fbm(q * vec2(4.0, 40.0) + vObjPos.z * 9.0));
  diffuseColor.rgb = mix(diffuseColor.rgb, rawWood, raw * .8);` : '')).replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>' + (isSide ? `
  roughnessFactor = mix(roughnessFactor, .95, raw);` : ''));
  };
  return mat;
};

const group = new THREE.Group();   // mouse / arrastre
const piece = new THREE.Group();   // animación
group.add(piece);
scene.add(group);

const front = revealize(new THREE.MeshPhysicalMaterial({
  map: woodMap, bumpMap: woodBump, bumpScale: .75,
  roughness: .5, clearcoat: .5, clearcoatRoughness: .2,
}));
const side = revealize(new THREE.MeshPhysicalMaterial({
  map: sideMap, color: 0xa87657, roughness: .6, clearcoat: .12, clearcoatRoughness: .5,
}), true);
const nine = new THREE.Mesh(geo, [front, side]);
nine.scale.z = .06;
piece.add(nine);

/* boceto: trazos finos, como un dibujo a lápiz */
const zf = DEPTH / 2 + .02;
const strokes = [];
let seed = 3;
const r1 = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const pressure = (g, n, base = .55) => {
  // el lápiz no pesa igual en todo el trazo: suave al empezar, más firme al medio
  const col = new Float32Array(n * 4), ph = r1() * 6, ph2 = r1() * 6;
  for (let i = 0; i < n; i++) {
    const u = i / Math.max(1, n - 1);
    const a = base + (1 - base) * (.5 + .3 * Math.sin(u * 9 + ph) + .2 * Math.sin(u * 23 + ph2));
    col.set([1, 1, 1, Math.min(1, Math.max(.15, a))], i * 4);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 4));
};
const stroke = (pts, color, op, from, to, loop = true, segs = false) => {
  const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: op, vertexColors: true, depthWrite: false });
  const g = new THREE.BufferGeometry().setFromPoints(pts.map(p => new THREE.Vector3(p.x, p.y, zf)));
  pressure(g, pts.length);
  const l = segs ? new THREE.LineSegments(g, mat) : loop ? new THREE.LineLoop(g, mat) : new THREE.Line(g, mat);
  g.setDrawRange(0, 0);
  l.userData = { n: pts.length, from, to, op };
  piece.add(l); strokes.push(l);
  return l;
};
const C = toV(CONTORNO), E = toV(OJO);
const jitter = (pts, s, r, dx, dy) => pts.map(p => new THREE.Vector2(p.x * s * Math.cos(r) - p.y * s * Math.sin(r) + dx, p.x * s * Math.sin(r) + p.y * s * Math.cos(r) + dy));
const circle = (r, n = 160) => Array.from({ length: n + 1 }, (_, i) => new THREE.Vector2(Math.cos(i / n * Math.PI * 2 + 2.2) * r, Math.sin(i / n * Math.PI * 2 + 2.2) * r));
// guías de construcción (muy suaves)
stroke(circle(1.16), 0xcdbfb4, .55, 0, .45, false);
stroke([new THREE.Vector2(-1.35, 0), new THREE.Vector2(1.35, 0)], 0xcdbfb4, .6, .05, .35, false);
stroke([new THREE.Vector2(0, -1.25), new THREE.Vector2(0, 1.25)], 0xcdbfb4, .6, .1, .4, false);
stroke([new THREE.Vector2(-1.3, -.29), new THREE.Vector2(.6, -.29)], 0xd6cac0, .5, .3, .55, false);
// el 9: trazo principal y un segundo trazo levemente corrido, como a mano
stroke(C, 0x5e4a3e, .95, .15, .85);
stroke(jitter(C, 1.004, .004, .004, -.003), 0x8a7464, .45, .3, .95);
stroke(E, 0x5e4a3e, .95, .7, .92);
stroke(jitter(E, 1.02, -.01, .003, .002), 0x8a7464, .4, .78, 1);
// vetas a lápiz dentro del 9: luego se vuelven la madera
const inside = (pt, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
  const a = poly[i], b = poly[j];
  if ((a.y > pt.y) !== (b.y > pt.y) && pt.x < (b.x - a.x) * (pt.y - a.y) / (b.y - a.y) + a.x) c = !c; } return c; };
const grain = [];
for (let k = 0; k < 11; k++) {
  const x0 = -.86 + k * .17 + (r1() - .5) * .05, amp = .025 + r1() * .03, f = 2 + r1() * 2.5, ph = r1() * 6;
  let prev = null;
  for (let i = 0; i <= 90; i++) {
    const y = .98 - i / 90 * 1.96;
    const pt = new THREE.Vector2(x0 + y * .12 + Math.sin(y * f + ph) * amp + Math.sin(y * 11 + ph) * .006, y);
    const ok = inside(pt, C) && !inside(pt, jitter(E, 1.15, 0, -.02, 0));
    if (ok && prev) grain.push(prev, pt);
    prev = ok ? pt : null;
  }
}
stroke(grain, 0xa08672, .5, .55, 1, false, true);

/* sombra de contacto */
const shCanvas = document.createElement('canvas'); shCanvas.width = shCanvas.height = 128;
{ const g = shCanvas.getContext('2d'); const rg = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  rg.addColorStop(0, 'rgba(70,40,22,.6)'); rg.addColorStop(.55, 'rgba(70,40,22,.18)'); rg.addColorStop(1, 'rgba(70,40,22,0)');
  g.fillStyle = rg; g.fillRect(0, 0, 128, 128); }
const shadow = new THREE.Mesh(new THREE.PlaneGeometry(2.3, .55), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shCanvas), transparent: true, opacity: 0, depthWrite: false }));
shadow.position.set(0, -1.22, 0);
shadow.rotation.x = -Math.PI / 2.25;
group.add(shadow);

/* ───────── Tamaño ───────── */
function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  const visH = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const s = Math.min(visH * .64 / 1.95, visH * camera.aspect * .78 / 2.05);
  group.scale.setScalar(s);
  group.position.y = camera.aspect < .8 ? visH * .03 : visH * .01;
}
addEventListener('resize', resize);
resize();

/* ───────── Interacción ───────── */
const ptr = { x: 0, y: 0, tx: 0, ty: 0 };
const drag = { on: false, x0: 0, a: 0 };
addEventListener('pointermove', e => {
  if (e.pointerType === 'mouse') { ptr.tx = e.clientX / innerWidth * 2 - 1; ptr.ty = e.clientY / innerHeight * 2 - 1; }
  if (drag.on) { const dx = e.clientX - drag.x0; drag.x0 = e.clientX; drag.a += dx * .01; }
}, { passive: true });
canvas.addEventListener('pointerdown', e => { drag.on = true; drag.x0 = e.clientX; canvas.classList.add('is-grab'); });
const up = () => { drag.on = false; canvas.classList.remove('is-grab'); };
addEventListener('pointerup', up);
addEventListener('pointercancel', up);

/* ───────── Animación ───────── */
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const eo = t => 1 - Math.pow(1 - t, 4);
const eio = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
let sketch = REDUCED ? 1 : 0, sketchOn = false;
let prog = REDUCED ? 1 : 0, target = prog;

const startSketch = () => { sketchOn = true; };
if (document.documentElement.classList.contains('is-loaded')) startSketch();
else document.addEventListener('loaderdone', startSketch, { once: true });

function scrollTarget() {
  const r = hero.getBoundingClientRect();
  const run = hero.offsetHeight - innerHeight;
  target = run > 0 ? clamp(-r.top / run) : 1;
}
addEventListener('scroll', scrollTarget, { passive: true });
scrollTarget();

let visible = true, raf = 0;
new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) loop(); }).observe(hero);

let last = performance.now();
function loop() {
  cancelAnimationFrame(raf);
  if (!visible) return;
  raf = requestAnimationFrame(loop);
  const now = performance.now();
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  const t = now / 1000;

  if (sketchOn && sketch < 1) sketch = Math.min(1, sketch + dt / 2.6);
  prog += (target - prog) * Math.min(1, dt * 3.2);
  const p = prog;

  // 1) boceto a trazos finos (al cargar)
  const sk = sketch;
  for (const l of strokes) {
    const { n, from, to, op } = l.userData;
    const k = eio(clamp((sk - from) / (to - from)));
    l.geometry.setDrawRange(0, Math.max(0, Math.floor(n * k)));
    l.visible = k > 0;
  }
  // 2) la madera aparece poco a poco con el scroll; el lápiz se desvanece detrás
  uReveal.value = REDUCED ? 1 : clamp(p / .6) * (2 - clamp(p / .6)) * .55 + clamp(p / .6) * .45;
  const pencil = 1 - clamp((p - .42) / .28);
  for (const l of strokes) l.material.opacity = l.userData.op * pencil;

  // 3) toma cuerpo: gana grosor y gira suave para mostrar el canto
  const body = eio(clamp((p - .45) / .3));
  nine.scale.z = .06 + .94 * body;
  const turn = Math.sin(clamp((p - .45) / .55) * Math.PI);
  piece.rotation.y = -.5 * turn - .1 * body;
  piece.rotation.x = .08 * turn;
  piece.position.y = Math.sin(t * .8) * .018 * body;
  // reflejo que recorre la laca, más amplio cuando la pieza ya está armada
  key.position.x = THREE.MathUtils.lerp(-4.5, -1.5, p) + Math.sin(t * .35) * (.4 + 1.6 * body);
  key.position.y = THREE.MathUtils.lerp(4.5, 2.6, p);
  shadow.material.opacity = .85 * clamp((p - .2) / .5);

  // mouse y arrastre (vuelve suave al soltar)
  ptr.x += (ptr.tx - ptr.x) * .06; ptr.y += (ptr.ty - ptr.y) * .06;
  if (!drag.on) drag.a *= .94;
  group.rotation.y = ptr.x * .22 + drag.a;
  group.rotation.x = ptr.y * .1;

  renderer.render(scene, camera);
}
loop();
document.documentElement.classList.add('has-3d');
