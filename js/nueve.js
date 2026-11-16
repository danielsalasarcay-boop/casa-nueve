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
renderer.toneMappingExposure = 1.0;
renderer.setClearColor(0xffffff, 0);

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.03).texture;
scene.environmentIntensity = .42;

const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
camera.position.set(0, 0, 7.4);

const key = new THREE.DirectionalLight(0xfff0dc, 1.9);
key.position.set(-3.5, 3.5, 5);
scene.add(key);
const fill = new THREE.DirectionalLight(0xe9f4f4, .45);
fill.position.set(4, -1, 3);
scene.add(fill);
const rim = new THREE.DirectionalLight(0xfff1e2, .7);
rim.position.set(2, 3, -4);
scene.add(rim);
const glow = new THREE.PointLight(0xffe9d2, 0, 9, 1.6);
scene.add(glow);

/* ───────── Forma ───────── */
const toV = arr => { const o = []; for (let i = 0; i < arr.length; i += 2) o.push(new THREE.Vector2(arr[i], arr[i + 1])); return o; };
const SHAPE = new THREE.Shape(toV(CONTORNO));
SHAPE.holes.push(new THREE.Path(toV(OJO)));

const DEPTH = .16;
const geo = new THREE.ExtrudeGeometry(SHAPE, {
  depth: DEPTH, steps: 1, bevelEnabled: true,
  bevelThickness: .03, bevelSize: .026, bevelOffset: -.026, bevelSegments: 10,
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
const [woodMap, woodBump] = await Promise.all([tex('img/madera-9.jpg?v=6', true), tex('img/madera-9-relieve.jpg?v=6', false)]);

/* Las vetas del boceto: las mismas líneas que dibuja el lápiz son las que luego
   se abren en madera. */
let seed = 3;
const r1 = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const NG = 11;
const GRAIN = Array.from({ length: NG }, (_, k) => new THREE.Vector4(-.86 + k * .17 + (r1() - .5) * .05, .014 + r1() * .02, 1.6 + r1() * 2, r1() * 6));
const grainX = (g, y) => g.x + y * .12 + Math.sin(y * g.z + g.w) * g.y + Math.sin(y * 11 + g.w) * .004;

/* La madera nace de cada veta dibujada y se va abriendo hacia los lados hasta
   cubrir la pieza, con un borde más oscuro como aceite recién pasado.
   uReveal: 0 → nada, 1 → todo. */
const uReveal = { value: REDUCED ? 1 : 0 };
const uGrain = { value: GRAIN };
const revealize = (mat, isSide = false) => {
  mat.alphaToCoverage = true;
  mat.onBeforeCompile = sh => {
    sh.uniforms.uReveal = uReveal;
    sh.uniforms.uGrain = uGrain;
    sh.vertexShader = 'varying vec3 vObjPos; varying vec3 vObjN;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vObjPos = position; vObjN = normal;');
    sh.fragmentShader = `uniform float uReveal; uniform vec4 uGrain[${NG}]; varying vec3 vObjPos; varying vec3 vObjN;
float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p){ float a = .5, s = 0.; for (int i = 0; i < 4; i++) { s += a * vn(p); p *= 2.03; a *= .5; } return s; }
` + sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
  vec2 q = vObjPos.xy;
` + (isSide ? `
  // canto: la veta de la cara atraviesa el grosor de la tabla
  vec4 across = texture2D(map, q * vec2(.4524, .475) + vec2(.5, .4962) + vec2(.004, .002) * sin(vObjPos.z * 40.0));
  diffuseColor.rgb = across.rgb * mix(vec3(.74, .68, .64), vec3(1.0), smoothstep(.6, 1.0, abs(vObjN.z)));` : '') + `
  float lum = dot(diffuseColor.rgb, vec3(.3, .55, .15));
  float gd = 9.0;
  for (int i = 0; i < ${NG}; i++) { vec4 g = uGrain[i];
    float d = abs(q.x - (g.x + q.y * .12 + sin(q.y * g.z + g.w) * g.y + sin(q.y * 11.0 + g.w) * .004));
    // cada veta arranca a su tiempo y se abre a su ritmo: pinceladas, no barras
    gd = min(gd, smoothstep(0.0, .1 + .05 * fract(g.w * 3.3), d) * .34 + fract(g.w * 1.7) * .2); }
  float T = gd + (1.0 - q.y) * .5 * .5
    + (fbm(q * vec2(9.0, 1.3) + 3.7) - .5) * .12` + (isSide ? '' : ` + (.22 - lum) * .12`) + `;
  float m = uReveal * 1.36 - T - .05;
  if (m < 0.0) discard;
  diffuseColor.a = smoothstep(0.0, max(fwidth(m) * 1.6, 1e-4), m);
  float stain = 1.0 - smoothstep(0.0, .07, m);
  diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(.5, .38, .3), stain * .8);` + (isSide ? `
  // dentro del ojo y de la ranura sigue siendo la misma madera, algo más en sombra
  float inEye = (1.0 - smoothstep(.2, .26, abs(q.x - .147))) * (1.0 - smoothstep(.1, .14, abs(q.y - .345)));
  float inSlot = (1.0 - smoothstep(.24, .28, abs(q.x - .075))) * (1.0 - smoothstep(.09, .12, abs(q.y + .36)));
  float raw = max(inEye, inSlot);
  diffuseColor.rgb *= 1.0 - .3 * raw;` : `
  // poro fino de la madera, para que de cerca siga siendo nítida
  float pore = vn(q * vec2(150.0, 11.0) + vec2(q.y * 18.0, 0.0));
  diffuseColor.rgb *= 1.0 - .07 * smoothstep(.55, .95, pore);`)).replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>' + (isSide ? `` : `
  // la veta oscura bebe más aceite: brilla menos que la clara
  roughnessFactor = clamp(roughnessFactor + (.2 - lum) * .5, .28, .8);`));
  };
  return mat;
};

const group = new THREE.Group();   // mouse / arrastre
const piece = new THREE.Group();   // animación
group.add(piece);
scene.add(group);

const front = revealize(new THREE.MeshPhysicalMaterial({
  map: woodMap, bumpMap: woodBump, bumpScale: .45,
  roughness: .5, clearcoat: .32, clearcoatRoughness: .22,
}));
const side = revealize(new THREE.MeshPhysicalMaterial({
  map: woodMap, roughness: .56, clearcoat: .22, clearcoatRoughness: .3,
}), true);
const nine = new THREE.Mesh(geo, [front, side]);
nine.scale.z = .05;
piece.add(nine);

/* boceto: trazos finos, como un plano a lápiz */
const zf = DEPTH / 2 + .012;
const strokes = [];
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
const plan = new THREE.Group();    // guías del plano: no giran con la pieza
group.add(plan);
const stroke = (pts, color, op, from, to, o = {}) => {
  const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: op, vertexColors: true, depthWrite: false });
  const g = new THREE.BufferGeometry().setFromPoints(pts.map(p => new THREE.Vector3(p.x, p.y, o.guide ? 0 : zf)));
  pressure(g, pts.length, o.guide ? .8 : .55);
  const l = o.segs ? new THREE.LineSegments(g, mat) : o.loop ? new THREE.LineLoop(g, mat) : new THREE.Line(g, mat);
  g.setDrawRange(0, 0);
  l.userData = { n: pts.length, from, to, op, guide: !!o.guide, segs: !!o.segs };
  (o.guide ? plan : piece).add(l); strokes.push(l);
  return l;
};
const V = (x, y) => new THREE.Vector2(x, y);
const C = toV(CONTORNO), E = toV(OJO);
const bb = C.reduce((b, p) => ({ x0: Math.min(b.x0, p.x), x1: Math.max(b.x1, p.x), y0: Math.min(b.y0, p.y), y1: Math.max(b.y1, p.y) }), { x0: 9, x1: -9, y0: 9, y1: -9 });
const jitter = (pts, s, r, dx, dy) => pts.map(p => V(p.x * s * Math.cos(r) - p.y * s * Math.sin(r) + dx, p.x * s * Math.sin(r) + p.y * s * Math.cos(r) + dy));
const circle = (r, n = 200) => Array.from({ length: n + 1 }, (_, i) => V(Math.cos(i / n * Math.PI * 2 + 2.2) * r, Math.sin(i / n * Math.PI * 2 + 2.2) * r));
const GUIDE = 0xc9bcb1, o1 = { guide: true }, o2 = { guide: true, segs: true };
// ejes y círculo de construcción
stroke([V(-1.38, 0), V(1.38, 0)], GUIDE, .6, 0, .22, o1);
stroke([V(0, 1.3), V(0, -1.3)], GUIDE, .6, .04, .26, o1);
stroke(circle(1.16), GUIDE, .5, .08, .42, o1);
// caja de la pieza: solo las esquinas, como marcas de corte
{ const c = .09, g = .035, m = [];
  for (const [x, sx] of [[bb.x0 - g, 1], [bb.x1 + g, -1]]) for (const [y, sy] of [[bb.y0 - g, 1], [bb.y1 + g, -1]])
    m.push(V(x, y), V(x + c * sx, y), V(x, y), V(x, y + c * sy));
  stroke(m, 0xb5a598, .7, .18, .4, o2); }
// cotas: ancho abajo y alto a la derecha, con sus marcas a 45°
{ const y = bb.y0 - .15, x = bb.x1 + .15, k = .022, e = .05;
  stroke([V(bb.x0, y), V(bb.x1, y), V(bb.x0, y - e), V(bb.x0, y + e), V(bb.x1, y - e), V(bb.x1, y + e),
    V(bb.x0 - k, y - k), V(bb.x0 + k, y + k), V(bb.x1 - k, y - k), V(bb.x1 + k, y + k)], 0xb5a598, .7, .26, .5, o2);
  stroke([V(x, bb.y1), V(x, bb.y0), V(x - e, bb.y1), V(x + e, bb.y1), V(x - e, bb.y0), V(x + e, bb.y0),
    V(x - k, bb.y1 - k), V(x + k, bb.y1 + k), V(x - k, bb.y0 - k), V(x + k, bb.y0 + k)], 0xb5a598, .7, .32, .56, o2); }
// línea del corte (la ranura del 9)
stroke([V(-1.3, -.29), V(.62, -.29)], GUIDE, .5, .3, .5, o1);
// el 9: trazo principal y un segundo trazo levemente corrido, como a mano
stroke(C, 0x4a3a30, 1, .2, .8, { loop: true });
stroke(jitter(C, 1.003, .003, .003, -.002), 0x8a7464, .4, .34, .9, { loop: true });
stroke(E, 0x4a3a30, 1, .68, .88, { loop: true });
stroke(jitter(E, 1.018, -.008, .002, .002), 0x8a7464, .35, .76, .96, { loop: true });
// vetas a lápiz dentro del 9: de ellas nace la madera
const inside = (pt, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
  const a = poly[i], b = poly[j];
  if ((a.y > pt.y) !== (b.y > pt.y) && pt.x < (b.x - a.x) * (pt.y - a.y) / (b.y - a.y) + a.x) c = !c; } return c; };
const Ein = jitter(E, 1.15, 0, -.02, 0);
GRAIN.forEach((gr, k) => {
  const seg = []; let prev = null;
  for (let i = 0; i <= 120; i++) {
    const y = .99 - i / 120 * 1.98, pt = V(grainX(gr, y), y);
    const ok = inside(pt, C) && !inside(pt, Ein);
    if (ok && prev) seg.push(prev, pt);
    prev = ok ? pt : null;
  }
  if (seg.length) stroke(seg, 0x9a7f6a, .55, .5 + k * .028, .78 + k * .02, { segs: true });
});

/* sombra de contacto */
const shCanvas = document.createElement('canvas'); shCanvas.width = shCanvas.height = 128;
{ const g = shCanvas.getContext('2d'); const rg = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  rg.addColorStop(0, 'rgba(58,32,18,.62)'); rg.addColorStop(.22, 'rgba(58,32,18,.34)'); rg.addColorStop(.5, 'rgba(58,32,18,.12)'); rg.addColorStop(.78, 'rgba(58,32,18,.03)'); rg.addColorStop(1, 'rgba(58,32,18,0)');
  g.fillStyle = rg; g.fillRect(0, 0, 128, 128); }
const shadow = new THREE.Mesh(new THREE.PlaneGeometry(2.5, .5), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shCanvas), transparent: true, opacity: 0, depthWrite: false }));
shadow.position.set(0, -1.2, 0);
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
const ptr = { x: 0, y: 0, tx: 0, ty: 0, seen: 0 };
const drag = { on: false, x0: 0, a: 0 };
addEventListener('pointermove', e => {
  if (e.pointerType === 'mouse') { ptr.tx = e.clientX / innerWidth * 2 - 1; ptr.ty = e.clientY / innerHeight * 2 - 1; ptr.seen = 1; }
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
    const { n, from, to, segs } = l.userData;
    const k = eio(clamp((sk - from) / (to - from)));
    const c = Math.floor(n * k);
    l.geometry.setDrawRange(0, Math.max(0, segs ? c - c % 2 : c));
    l.visible = k > 0;
  }
  // 2) con el scroll la madera nace de las vetas; el plano se retira primero y el lápiz después
  const rv = clamp(p / .56);
  uReveal.value = REDUCED ? 1 : rv * rv * (3 - 2 * rv) * .35 + rv * .65;
  const guides = 1 - eio(clamp((p - .06) / .3)), pencil = 1 - eio(clamp((p - .34) / .26));
  for (const l of strokes) l.material.opacity = l.userData.op * (l.userData.guide ? guides : pencil);

  // 3) toma cuerpo: gana grosor, gira para enseñar el canto y se queda en tres cuartos
  const body = eio(clamp((p - .46) / .26));
  nine.scale.z = .05 + .95 * body;
  const a = clamp((p - .46) / .54), turn = Math.sin(a * Math.PI), rest = eio(a);
  piece.rotation.y = -.42 * turn - .2 * rest;
  piece.rotation.x = .07 * turn + .035 * rest;
  piece.rotation.z = -.012 * rest;
  piece.position.y = Math.sin(t * .8) * .016 * body;
  piece.position.z = .05 * rest;
  // reflejo que recorre el aceite de la madera, más amplio cuando la pieza ya está armada
  key.position.x = THREE.MathUtils.lerp(-4.5, -1.8, p) + Math.sin(t * .35) * (.4 + 1.5 * body);
  key.position.y = THREE.MathUtils.lerp(4.5, 2.8, p);
  shadow.material.opacity = .9 * eio(clamp((p - .3) / .5));
  shadow.scale.x = 1 - .1 * rest;

  // mouse y arrastre (vuelve suave al soltar); una luz sigue al cursor sobre la madera
  ptr.x += (ptr.tx - ptr.x) * .06; ptr.y += (ptr.ty - ptr.y) * .06;
  if (!drag.on) drag.a *= .94;
  group.rotation.y = ptr.x * .2 + drag.a;
  group.rotation.x = ptr.y * .09;
  glow.position.set(ptr.x * 3.2, -ptr.y * 2.2, 2.6);
  glow.intensity = 5 * body * ptr.seen;

  renderer.render(scene, camera);
}
loop();
document.documentElement.classList.add('has-3d');
