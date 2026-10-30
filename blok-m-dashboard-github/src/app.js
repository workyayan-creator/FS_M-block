// Blok M 3D: peta isometrik interaktif (Three.js)
// Data: window.D3 (data3d.js) dan window.ASET (gambar base64, aset.js)
import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';

const D = window.D3, A = window.ASET;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const nf = (v, d = 0) => new Intl.NumberFormat('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d }).format(v);
const ease = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const hexRGB = (h) => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
const dec = (b64) => { const s = atob(b64); const a = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i); return a; };
const dec8 = (b64) => new Int8Array(dec(b64).buffer);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

const S = { lapis: 'ringkasan', jam: 16.5, doy: 80, arah: 'B', uref: 2.6, main: false, tampil: 'iso', dasar: 'dasar' };
let varMode = 'variety';
const EXT = D.meta.extent; // [x0,z0,x1,z1] meter
const EW = EXT[2] - EXT[0], EH = EXT[3] - EXT[1], CX = (EXT[0] + EXT[2]) / 2, CZ = (EXT[1] + EXT[3]) / 2;

// =============================================================
//  Renderer, scene, kamera
// =============================================================
const canvas = $('#gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(2, devicePixelRatio));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.0;
const scene = new THREE.Scene();
const LANGIT_SIANG = new THREE.Color('#F3F0EA'), LANGIT_MALAM = new THREE.Color('#1C2236'), LANGIT_SENJA = new THREE.Color('#F2C9A6');
scene.background = LANGIT_SIANG.clone();
scene.fog = new THREE.Fog(scene.background, 1800, 4200);
const camera = new THREE.PerspectiveCamera(16, 1, 5, 12000);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true; controls.dampingFactor = .08; controls.maxPolarAngle = Math.PI * .495; controls.minDistance = 60; controls.maxDistance = 7000;
controls.target.set(150, 0, -60);

function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(canvas);

// --- cahaya ---
const hemi = new THREE.HemisphereLight(0xffffff, 0xd9d2c6, 1.15); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 2.4); sun.castShadow = true;
const LITE = /lite/.test(location.search) || matchMedia('(max-width: 900px)').matches; sun.shadow.mapSize.set(LITE ? 2048 : 4096, LITE ? 2048 : 4096); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.6;
const sc = sun.shadow.camera; sc.left = -1150; sc.right = 1150; sc.top = 1150; sc.bottom = -1150; sc.near = 10; sc.far = 5000; sc.updateProjectionMatrix();
scene.add(sun); scene.add(sun.target); sun.target.position.set(CX, 0, CZ);

// =============================================================
//  Tanah: tekstur dasar + lapisan analisis
// =============================================================
const texLoader = new THREE.TextureLoader();
const TEX = {};
for (const k of ['dasar', 'peta', 'satelit']) { TEX[k] = texLoader.load(A[k]); TEX[k].colorSpace = THREE.SRGBColorSpace; TEX[k].anisotropy = 8; }
const groundMat = new THREE.MeshStandardMaterial({ map: TEX.dasar, roughness: 1, metalness: 0 });
const ground = new THREE.Mesh(new THREE.PlaneGeometry(EW, EH), groundMat);
ground.rotation.x = -Math.PI / 2; ground.position.set(CX, 0, CZ); ground.receiveShadow = true; scene.add(ground);
// tanah luas di luar bingkai
const far = new THREE.Mesh(new THREE.PlaneGeometry(14000, 14000), new THREE.MeshStandardMaterial({ color: '#E9E6E0', roughness: 1 }));
far.rotation.x = -Math.PI / 2; far.position.set(CX, -0.6, CZ); far.receiveShadow = true; scene.add(far);

// lapisan analisis (kanvas -> tekstur)
const GM = D.gmeta, GW = GM.gw, GH = GM.gh;
const GR = {}; for (const k in D.grid) GR[k] = dec(D.grid[k]);
const ov = document.createElement('canvas'); ov.width = GW; ov.height = GH;
const octx = ov.getContext('2d'); const oimg = octx.createImageData(GW, GH);
const ovTex = new THREE.CanvasTexture(ov); ovTex.colorSpace = THREE.SRGBColorSpace; ovTex.magFilter = THREE.LinearFilter; ovTex.minFilter = THREE.LinearFilter;
const ovMat = new THREE.MeshBasicMaterial({ map: ovTex, transparent: true, depthWrite: false, opacity: 0 });
const ovMesh = new THREE.Mesh(new THREE.PlaneGeometry(EW * (GW * 4 / 1400), EH * (GH * 4 / 717)), ovMat);
ovMesh.rotation.x = -Math.PI / 2; ovMesh.position.set(EXT[0] + EW * (GW * 4 / 1400) / 2, .25, EXT[1] + EH * (GH * 4 / 717) / 2); ovMesh.renderOrder = 2; scene.add(ovMesh);
// bayangan tetap terlihat di atas lapisan: lapisan tipis penerima bayangan
const shadowCatcher = new THREE.Mesh(new THREE.PlaneGeometry(EW, EH), new THREE.ShadowMaterial({ opacity: .28 }));
shadowCatcher.rotation.x = -Math.PI / 2; shadowCatcher.position.set(CX, .4, CZ); shadowCatcher.receiveShadow = true; shadowCatcher.renderOrder = 3; scene.add(shadowCatcher);

// =============================================================
//  Bangunan (satu geometri gabungan)
// =============================================================
const LU_COL = { 3: '#C99A1E', 4: '#D9573A', 5: '#3E7FD0', 6: '#3F9A5E', 8: '#9A6BB8' };
const LU_NAMA = { 3: 'Hunian', 4: 'Komersial & jasa', 5: 'Pendidikan & publik', 6: 'Ruang hijau', 8: 'Fasilitas lain' };
const B = D.bld;
let bGeo, bMesh, bBid, bTop;
(function buatBangunan() {
  const pos = [], nor = [], bid = [], dist = [], top = [];
  const tmpN = new THREE.Vector3();
  B.forEach((b, i) => {
    const s = new THREE.Shape();
    for (let k = 0; k < b.p.length; k += 2) { const x = b.p[k], y = -b.p[k + 1]; k === 0 ? s.moveTo(x, y) : s.lineTo(x, y); }
    const g = new THREE.ExtrudeGeometry(s, { depth: b.h, bevelEnabled: false }); g.rotateX(-Math.PI / 2);
    const ng = g.index ? g.toNonIndexed() : g; ng.computeVertexNormals();
    const P = ng.attributes.position.array, N = ng.attributes.normal.array;
    const d = Math.hypot(b.c[0] - 150, b.c[1] + 40);
    for (let v = 0; v < P.length; v += 3) { pos.push(P[v], P[v + 1], P[v + 2]); nor.push(N[v], N[v + 1], N[v + 2]); bid.push(i); dist.push(d); top.push(b.h); }
    g.dispose(); if (ng !== g) ng.dispose();
  });
  bGeo = new THREE.BufferGeometry();
  bGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  bGeo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  bGeo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(pos.length), 3));
  bGeo.setAttribute('aDist', new THREE.Float32BufferAttribute(dist, 1));
  bGeo.setAttribute('aTop', new THREE.Float32BufferAttribute(top, 1));
  bBid = new Int32Array(bid);
})();
const U = { uGrow: { value: 0 }, uNight: { value: 0 }, uTime: { value: 0 } };
const bMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .82, metalness: 0 });
bMat.onBeforeCompile = (sh) => {
  Object.assign(sh.uniforms, U);
  sh.vertexShader = sh.vertexShader
    .replace('#include <common>', `#include <common>
      uniform float uGrow; attribute float aDist; attribute float aTop; varying vec3 vWp; varying vec3 vN; varying float vTop;`)
    .replace('#include <begin_vertex>', `#include <begin_vertex>
      float gr = clamp(uGrow * 2.2 - aDist / 900.0, 0.0, 1.0); gr = 1.0 - pow(1.0 - gr, 3.0);
      transformed.y *= max(gr, 0.002);`)
    .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
      vWp = (modelMatrix * vec4(transformed, 1.0)).xyz; vN = normal; vTop = aTop;`);
  sh.fragmentShader = sh.fragmentShader
    .replace('#include <common>', `#include <common>
      uniform float uNight; varying vec3 vWp; varying vec3 vN; varying float vTop;
      float h21(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }`)
    .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      if (uNight > 0.01 && abs(vN.y) < 0.5) {
        float along = abs(vN.x) > 0.5 ? vWp.z : vWp.x;
        vec2 cell = vec2(floor(along / 3.2), floor(vWp.y / 3.6));
        vec2 f = vec2(fract(along / 3.2), fract(vWp.y / 3.6));
        float win = step(0.22, f.x) * step(f.x, 0.78) * step(0.3, f.y) * step(f.y, 0.78);
        float lit = step(0.45, h21(cell + floor(vWp.xz / 40.0)));
        float lowFloor = step(vWp.y, vTop - 1.0);
        totalEmissiveRadiance += vec3(1.0, 0.72, 0.38) * win * lit * lowFloor * uNight * 0.9;
      }`);
};
bMesh = new THREE.Mesh(bGeo, bMat); bMesh.castShadow = true; bMesh.receiveShadow = true; scene.add(bMesh);

let warnaMode = 'fungsi';
function warnaiBangunan(mode = warnaMode) {
  warnaMode = mode;
  const C = bGeo.attributes.color.array, N = bGeo.attributes.normal.array;
  const base = new THREE.Color(), tmp = new THREE.Color();
  const rampH = (h) => { const t = clamp(Math.log(h / 3) / Math.log(60)); return new THREE.Color().setRGB(...[lerp(.95, .76, t), lerp(.93, .27, t), lerp(.9, .12, t)]); };
  for (let v = 0, n = bBid.length; v < n; v++) {
    const b = B[bBid[v]];
    if (mode === 'fungsi') base.setRGB(...hexRGB(LU_COL[b.u] || '#bbbbbb')).lerp(tmp.set('#F4F1EC'), .45);
    else if (mode === 'tinggi') base.copy(rampH(b.h));
    else if (mode === 'putih') base.set('#F5F3EF');
    else base.set('#E4DFD8');
    if (b.n) base.lerp(tmp.set('#C2441F'), mode === 'putih' ? .0 : .25);
    const shade = N[v * 3 + 1] > .5 ? 1.0 : .9;
    C[v * 3] = base.r * shade; C[v * 3 + 1] = base.g * shade; C[v * 3 + 2] = base.b * shade;
  }
  bGeo.attributes.color.needsUpdate = true;
}

// sorotan bangunan terpilih
const selMat = new THREE.MeshBasicMaterial({ color: '#C2441F', transparent: true, opacity: .35, depthTest: true });
let selMesh = null, selLine = null;
function sorot(i) {
  if (selMesh) { scene.remove(selMesh, selLine); selMesh.geometry.dispose(); selLine.geometry.dispose(); selMesh = selLine = null; }
  if (i == null) return;
  const b = B[i]; const s = new THREE.Shape();
  for (let k = 0; k < b.p.length; k += 2) { const x = b.p[k], y = -b.p[k + 1]; k === 0 ? s.moveTo(x, y) : s.lineTo(x, y); }
  const g = new THREE.ExtrudeGeometry(s, { depth: b.h + .6, bevelEnabled: false }); g.rotateX(-Math.PI / 2);
  selMesh = new THREE.Mesh(g, selMat); selMesh.scale.set(1.01, 1, 1.01);
  selLine = new THREE.LineSegments(new THREE.EdgesGeometry(g, 30), new THREE.LineBasicMaterial({ color: '#C2441F' }));
  scene.add(selMesh, selLine);
}

// =============================================================
//  Pohon (vegetasi satelit + taman OSM)
// =============================================================
const T = D.trees;
const crownGeo = new THREE.IcosahedronGeometry(1, 1), trunkGeo = new THREE.CylinderGeometry(.18, .25, 1, 5);
const crown = new THREE.InstancedMesh(crownGeo, new THREE.MeshStandardMaterial({ color: '#7FAE73', roughness: .9, flatShading: true }), T.length);
const trunk = new THREE.InstancedMesh(trunkGeo, new THREE.MeshStandardMaterial({ color: '#8B7262', roughness: 1 }), T.length);
crown.castShadow = true; crown.receiveShadow = true; trunk.castShadow = true;
(function () {
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), c = new THREE.Color();
  T.forEach(([x, z, r], i) => {
    const h = r * 1.5;
    p.set(x, h, z); s.set(r, r * .85, r); m.compose(p, q, s); crown.setMatrixAt(i, m);
    c.setHSL(.25 + Math.random() * .06, .32, .55 + Math.random() * .1); crown.setColorAt(i, c);
    p.set(x, h * .45, z); s.set(1, h * .9, 1); m.compose(p, q, s); trunk.setMatrixAt(i, m);
  });
})();
scene.add(crown, trunk);

// =============================================================
//  MRT layang + kereta
// =============================================================
const tm = (x, y) => [(x - D.meta.origin[0]) * D.meta.mpp, (y - D.meta.origin[1]) * D.meta.mpp];
const JALUR_MRT = [[549, -30], [548, 60], [546, 104], [541, 230], [532, 340], [523, 410], [515, 462], [508, 540], [501, 640], [496, 760]].map(([x, y]) => tm(x, y));
const mrtCurve = new THREE.CatmullRomCurve3(JALUR_MRT.map(([x, z]) => new THREE.Vector3(x, 11, z)));
(function () {
  const n = 160, deckMat = new THREE.MeshStandardMaterial({ color: '#D3CEC6', roughness: .8 });
  const seg = new THREE.InstancedMesh(new THREE.BoxGeometry(9.5, 1.8, 1), deckMat, n); const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < n; i++) { const a = mrtCurve.getPointAt(i / n), b = mrtCurve.getPointAt((i + 1) / n); const mid = a.clone().add(b).multiplyScalar(.5); q.setFromAxisAngle(up, Math.atan2(b.x - a.x, b.z - a.z)); s.set(1, 1, a.distanceTo(b) + .6); m.compose(mid, q, s); seg.setMatrixAt(i, m); }
  seg.castShadow = true; seg.receiveShadow = true; scene.add(seg);
})();
// pilar
(function () {
  const L = mrtCurve.getLength(), n = Math.floor(L / 30);
  const pil = new THREE.InstancedMesh(new THREE.CylinderGeometry(1.2, 1.4, 10, 8), new THREE.MeshStandardMaterial({ color: '#BDB7AE' }), n);
  const m = new THREE.Matrix4();
  for (let i = 0; i < n; i++) { const p = mrtCurve.getPointAt(i / n); m.makeTranslation(p.x, 5, p.z); pil.setMatrixAt(i, m); }
  pil.castShadow = true; scene.add(pil);
})();
// stasiun
const stasiun = [];
for (const [nama, x, y, len] of [['MRT Blok M BCA', 515, 462, 150], ['MRT ASEAN', 546, 104, 140]]) {
  const [sx, sz] = tm(x, y); const t = mrtCurve.getTangentAt(clamp(nearestT(sx, sz))); const ang = Math.atan2(t.x, t.z);
  const g = new THREE.Group(); g.position.set(sx, 0, sz); g.rotation.y = ang;
  const plat = new THREE.Mesh(new THREE.BoxGeometry(24, 2.4, len), new THREE.MeshStandardMaterial({ color: '#E8E4DE' })); plat.position.y = 11.2;
  const roof = new THREE.Mesh(new THREE.BoxGeometry(27, 1.2, len + 6), new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: .35 })); roof.position.y = 20.5;
  for (const sx of [-12, 12]) for (let zz = -len / 2 + 8; zz <= len / 2 - 8; zz += 24) { const col = new THREE.Mesh(new THREE.BoxGeometry(.8, 8, .8), plat.material); col.position.set(sx, 16, zz); g.add(col); }
  plat.castShadow = roof.castShadow = true; g.add(plat, roof); scene.add(g); stasiun.push(g);
}
function nearestT(x, z) { let best = 0, bd = 1e9; for (let i = 0; i <= 200; i++) { const p = mrtCurve.getPointAt(i / 200); const d = (p.x - x) ** 2 + (p.z - z) ** 2; if (d < bd) { bd = d; best = i / 200; } } return best; }
// kereta (6 kereta x 2 arah)
const KERETA = [];
const carGeo = new THREE.BoxGeometry(3, 3.6, 19.5); carGeo.translate(0, 1.8, 0);
const carMat = new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: .35, metalness: .1 });
const stripeMat = new THREE.MeshStandardMaterial({ color: '#2F6BD8', emissive: '#1E4FB8', emissiveIntensity: .2 });
for (let d = 0; d < 2; d++) for (let k = 0; k < 2; k++) {
  const grp = new THREE.Group();
  for (let c = 0; c < 6; c++) { const car = new THREE.Mesh(carGeo, carMat); car.castShadow = true; const st = new THREE.Mesh(new THREE.BoxGeometry(3.05, .5, 19.6), stripeMat); st.position.y = 1.4; const cg = new THREE.Group(); cg.add(car, st); grp.add(cg); }
  scene.add(grp); KERETA.push({ grp, arah: d, fase: k * .5 + d * .23 });
}

// =============================================================
//  Label HTML yang mengikuti posisi 3D
// =============================================================
const LBL = [];
const lblRoot = $('#labels');
function label(teks, x, y, z, kelas = '', data = {}) { const el = document.createElement('div'); el.className = 'lbl ' + kelas; el.innerHTML = teks; lblRoot.appendChild(el); const o = { el, p: new THREE.Vector3(x, y, z), ...data }; LBL.push(o); return o; }
for (const t of D.transit) label(`<i class="pin ${t.jenis === 'MRT' ? 'mrt' : 'tj'}"></i>${t.nama}`, t.m[0], t.jenis === 'MRT' ? 18 : 4, t.m[1], 'transit', { grup: 'transit' });
for (const b of B.filter((b) => b.n)) label(`<b>${b.n}</b><span>${b.f} lantai · ±${Math.round(b.h)} m</span>`, b.c[0], b.h + 6, b.c[1], 'landmark', { grup: 'landmark' });
for (const [n, x, y] of [['Taman Literasi', 548, 352], ['M Bloc Space', 548, 228], ['Little Tokyo', 585, 432], ['Taman Sepeda', 715, 578]]) { const [mx, mz] = tm(x, y); label(n, mx, 3, mz, 'tempat', { grup: 'tempat' }); }
const vtmp = new THREE.Vector3();
function updateLabels() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  for (const o of LBL) {
    vtmp.copy(o.p); if (o.grup === 'landmark') vtmp.y *= U.uGrow.value > .9 ? 1 : clamp(U.uGrow.value * 1.2);
    vtmp.project(camera);
    const vis = vtmp.z < 1 && Math.abs(vtmp.x) < 1.1 && Math.abs(vtmp.y) < 1.1 && !o.sembunyi;
    o.el.style.display = vis ? '' : 'none';
    if (vis) o.el.style.transform = `translate(${(vtmp.x * .5 + .5) * w}px,${(-vtmp.y * .5 + .5) * h}px)`;
  }
}

// =============================================================
//  Matahari (NOAA)
// =============================================================
const LAT = D.meta.lat, LON = D.meta.lon;
function posisiMatahari(doy, jam) {
  const g = 2 * Math.PI / 365 * (doy - 1 + (jam - 12) / 24);
  const eqt = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const tst = jam * 60 + eqt + 4 * LON - 60 * 7; const ha = (tst / 4 - 180) * Math.PI / 180; const la = LAT * Math.PI / 180;
  const cz = Math.sin(la) * Math.sin(decl) + Math.cos(la) * Math.cos(decl) * Math.cos(ha);
  const zen = Math.acos(clamp(cz, -1, 1)); const el = Math.PI / 2 - zen;
  let az = Math.atan2(Math.sin(ha), Math.cos(ha) * Math.sin(la) - Math.tan(decl) * Math.cos(la)) + Math.PI;
  return { el, az, elDeg: el * 180 / Math.PI, azDeg: (az * 180 / Math.PI) % 360 };
}
const sunDir = new THREE.Vector3();
let SUN = posisiMatahari(80, 15);
function setMatahari() {
  SUN = posisiMatahari(S.doy, S.jam);
  const el = Math.max(SUN.el, -0.3);
  sunDir.set(Math.cos(el) * Math.sin(SUN.az), Math.sin(el), -Math.cos(el) * Math.cos(SUN.az)).normalize();
  sun.position.copy(sunDir).multiplyScalar(2500).add(sun.target.position);
  const siang = clamp(SUN.elDeg / 25 + .15), senja = clamp(1 - Math.abs(SUN.elDeg - 4) / 10) * (SUN.elDeg > -6 ? 1 : 0);
  sun.intensity = 2.5 * clamp(SUN.elDeg / 12);
  sun.color.setRGB(1, lerp(.72, 1, clamp(SUN.elDeg / 25)), lerp(.5, .96, clamp(SUN.elDeg / 25)));
  hemi.intensity = lerp(.7, .72, siang);
  hemi.color.set(siang > .3 ? '#ffffff' : '#a9b8e0'); hemi.groundColor.set(siang > .3 ? '#d9d2c6' : '#3a3550');
  const bg = LANGIT_MALAM.clone().lerp(LANGIT_SIANG, siang).lerp(LANGIT_SENJA, senja * .45);
  scene.background.copy(bg); scene.fog.color.copy(bg); far.material.color.copy(bg).multiplyScalar(.97);
  U.uNight.value = clamp(-SUN.elDeg / 6 + .25);
  document.body.classList.toggle('malam', SUN.elDeg < -2);
  renderer.toneMappingExposure = lerp(.95, 1.0, siang);
}

// =============================================================
//  Peta tinggi (untuk analisis bayangan & teduhan jalan)
// =============================================================
const HC = 3; // m per sel
const HW = Math.ceil(EW / HC), HH = Math.ceil(EH / HC);
const hmap = new Float32Array(HW * HH);
(function () {
  const c = document.createElement('canvas'); c.width = HW; c.height = HH; const x = c.getContext('2d');
  const sorted = B.map((b, i) => i).sort((a, b) => B[a].h - B[b].h);
  for (const i of sorted) { const b = B[i]; const v = Math.min(255, Math.round(b.h)); x.fillStyle = `rgb(${v},0,0)`; x.beginPath(); for (let k = 0; k < b.p.length; k += 2) { const px = (b.p[k] - EXT[0]) / HC, pz = (b.p[k + 1] - EXT[1]) / HC; k ? x.lineTo(px, pz) : x.moveTo(px, pz); } x.fill(); }
  const d = x.getImageData(0, 0, HW, HH).data; for (let i = 0; i < HW * HH; i++) hmap[i] = d[i * 4];
  for (const [tx, tz, r] of T) { const cx = Math.round((tx - EXT[0]) / HC), cz = Math.round((tz - EXT[1]) / HC), rr = Math.ceil(r / HC); for (let j = -rr; j <= rr; j++) for (let i = -rr; i <= rr; i++) { if (i * i + j * j > rr * rr) continue; const k = (cz + j) * HW + cx + i; if (k >= 0 && k < hmap.length) hmap[k] = Math.max(hmap[k], r * 1.6); } }
})();
// titik sampel jalur pejalan (sel jalan dari grid analisis 2D)
const JALAN = [];
for (let j = 0; j < GH; j += 1) for (let i = 0; i < GW; i += 1) if (GR.lu[j * GW + i] === 1 && (i + j) % 2 === 0) JALAN.push([(i * 4 + 2 - D.meta.origin[0]) * D.meta.mpp, (j * 4 + 2 - D.meta.origin[1]) * D.meta.mpp]);
function persenTeduh() {
  if (SUN.elDeg <= 0) return null;
  const tanE = Math.tan(SUN.el), sx = Math.sin(SUN.az), sz = -Math.cos(SUN.az);
  let teduh = 0, n = 0;
  for (const [x, z] of JALAN) {
    if (Math.hypot(x, z) > 800) continue; n++;
    for (let d = 3; d < 900; d += 3) {
      const px = x + sx * d, pz = z + sz * d; const i = Math.floor((px - EXT[0]) / HC), j = Math.floor((pz - EXT[1]) / HC);
      if (i < 0 || j < 0 || i >= HW || j >= HH) break; const hh = hmap[j * HW + i]; const need = d * tanE + 1.5;
      if (need > 175) break; if (hh > need) { teduh++; break; }
    }
  }
  return 100 * teduh / Math.max(1, n);
}

// =============================================================
//  Angin: medan LBM steady + partikel
// =============================================================
const WD = D.wind, WNX = WD.nx, WNY = WD.ny, WCS = WD.cs;
const WFIELD = {}; for (const k in WD.dirs) WFIELD[k] = { u: dec8(WD.dirs[k].u), v: dec8(WD.dirs[k].v) };
const WSOLID = (() => { const p = dec(WD.solid); const a = new Uint8Array(WNX * WNY); for (let i = 0; i < a.length; i++) a[i] = (p[i >> 3] >> (7 - (i & 7))) & 1; return a; })();
const WX0 = EXT[0], WZ0 = EXT[1];
function anginDi(x, z, f) {
  const gx = (x - WX0) / WCS - .5, gz = (z - WZ0) / WCS - .5; const i = Math.floor(gx), j = Math.floor(gz);
  if (i < 0 || j < 0 || i >= WNX - 1 || j >= WNY - 1) return null; const fx = gx - i, fz = gz - j; const k = j * WNX + i, s = WD.scale;
  const u = ((f.u[k] * (1 - fx) + f.u[k + 1] * fx) * (1 - fz) + (f.u[k + WNX] * (1 - fx) + f.u[k + WNX + 1] * fx) * fz) / s;
  const v = ((f.v[k] * (1 - fx) + f.v[k + 1] * fx) * (1 - fz) + (f.v[k + WNX] * (1 - fx) + f.v[k + WNX + 1] * fx) * fz) / s;
  return [u, v, WSOLID[k]];
}
const NP = 9000, TRAIL = 10;
const pPos = new Float32Array(NP * 2), pAge = new Float32Array(NP), pHist = new Float32Array(NP * TRAIL * 2);
const wGeo = new THREE.BufferGeometry();
const wPosA = new Float32Array(NP * (TRAIL - 1) * 2 * 3), wColA = new Float32Array(NP * (TRAIL - 1) * 2 * 4);
wGeo.setAttribute('position', new THREE.BufferAttribute(wPosA, 3)); wGeo.setAttribute('color', new THREE.BufferAttribute(wColA, 4));
const wMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, opacity: 1, toneMapped: false });
const wLines = new THREE.LineSegments(wGeo, wMat); wLines.frustumCulled = false; wLines.visible = false; wLines.renderOrder = 5; scene.add(wLines);
const hGeo = new THREE.BufferGeometry(); const hPos = new Float32Array(NP * 3), hCol = new Float32Array(NP * 3);
hGeo.setAttribute('position', new THREE.BufferAttribute(hPos, 3)); hGeo.setAttribute('color', new THREE.BufferAttribute(hCol, 3));
const wHeads = new THREE.Points(hGeo, new THREE.PointsMaterial({ size: 3.2, vertexColors: true, map: null, transparent: true, opacity: .95, depthWrite: false, toneMapped: false, sizeAttenuation: true }));
wHeads.frustumCulled = false; wLines.add(wHeads);
function respawn(i) { let x, z; for (let t = 0; t < 20; t++) { x = EXT[0] + Math.random() * EW; z = EXT[1] + Math.random() * EH; const w = anginDi(x, z, WFIELD[S.arah]); if (w && !w[2]) break; } pPos[i * 2] = x; pPos[i * 2 + 1] = z; pAge[i] = Math.random() * 120; for (let k = 0; k < TRAIL; k++) { pHist[(i * TRAIL + k) * 2] = x; pHist[(i * TRAIL + k) * 2 + 1] = z; } }
for (let i = 0; i < NP; i++) respawn(i);
const WCOL = [[.18, .42, .85], [.25, .66, .72], [.55, .78, .45], [.96, .75, .3], [.86, .3, .2]];
function warnaAngin(ms) { const t = clamp(ms / 4) * 4; const i = Math.min(3, Math.floor(t)), f = t - i; return [lerp(WCOL[i][0], WCOL[i + 1][0], f), lerp(WCOL[i][1], WCOL[i + 1][1], f), lerp(WCOL[i][2], WCOL[i + 1][2], f)]; }
let tick = 0;
function langkahAngin(dt) {
  const f = WFIELD[S.arah], Uref = S.uref * .78; // 10 m -> ±2 m (profil log, perkiraan)
  const sp = dt * 95; // percepatan visual
  let p = 0, c = 0; tick++;
  for (let i = 0; i < NP; i++) {
    let x = pPos[i * 2], z = pPos[i * 2 + 1]; const w = anginDi(x, z, f);
    if (!w || w[2] || (pAge[i] -= dt * 10) < 0) { respawn(i); continue; }
    const ms = Math.hypot(w[0], w[1]) * Uref;
    x += w[0] * Uref * sp; z += w[1] * Uref * sp; pPos[i * 2] = x; pPos[i * 2 + 1] = z;
    { const b = i * TRAIL * 2; pHist.copyWithin(b + 2, b, b + (TRAIL - 1) * 2); pHist[b] = x; pHist[b + 1] = z; }
    const col = warnaAngin(ms); const b = i * TRAIL * 2; const y = 2.2 + (i % 7) * .9;
    hPos[i * 3] = x; hPos[i * 3 + 1] = y; hPos[i * 3 + 2] = z; hCol[i * 3] = col[0]; hCol[i * 3 + 1] = col[1]; hCol[i * 3 + 2] = col[2];
    for (let k = 0; k < TRAIL - 1; k++) {
      wPosA[p++] = pHist[b + k * 2]; wPosA[p++] = y; wPosA[p++] = pHist[b + k * 2 + 1];
      wPosA[p++] = pHist[b + k * 2 + 2]; wPosA[p++] = y; wPosA[p++] = pHist[b + k * 2 + 3];
      const a0 = (1 - k / (TRAIL - 1)) * .9, a1 = (1 - (k + 1) / (TRAIL - 1)) * .9;
      wColA[c++] = col[0]; wColA[c++] = col[1]; wColA[c++] = col[2]; wColA[c++] = a0;
      wColA[c++] = col[0]; wColA[c++] = col[1]; wColA[c++] = col[2]; wColA[c++] = a1;
    }
  }
  wGeo.setDrawRange(0, p / 3); wGeo.attributes.position.needsUpdate = true; wGeo.attributes.color.needsUpdate = true; hGeo.attributes.position.needsUpdate = true; hGeo.attributes.color.needsUpdate = true;
}
// statistik kenyamanan angin (Lawson, disederhanakan) di sel jalan
function statAngin() {
  const f = WFIELD[S.arah], Uref = S.uref * .78; let n = 0, stag = 0, nyaman = 0, kencang = 0, sum = 0;
  for (const [x, z] of JALAN) { if (Math.hypot(x, z) > 800) continue; const w = anginDi(x, z, f); if (!w || w[2]) continue; const ms = Math.hypot(w[0], w[1]) * Uref; n++; sum += ms; if (ms < .3) stag++; else if (ms < 4) nyaman++; else kencang++; }
  return { rata: sum / n, stag: 100 * stag / n, nyaman: 100 * nyaman / n, kencang: 100 * kencang / n };
}

// =============================================================
//  Heatmap sosial: kolom heksagon (POI OSM x profil jam, dikalibrasi)
// =============================================================
const g2 = (h, m, s) => Math.exp(-(((h - m + 36) % 24 - 12) ** 2) / (2 * s * s));
const PROFIL = { // relatif per jam (0-23)
  kuliner: (h) => .03 + .9 * g2(h, 12.5, 1.3) + 1 * g2(h, 19.3, 1.9) + .35 * g2(h, 16, 1.5) + .25 * g2(h, 22.5, 1.2),
  belanja: (h) => .02 + .8 * g2(h, 13, 1.8) + 1 * g2(h, 17.5, 2.2),
  akomodasi: (h) => .25 + .3 * g2(h, 8, 2) + .4 * g2(h, 20, 2.5),
  jasa: (h) => .02 + 1 * g2(h, 10, 1.8) + .7 * g2(h, 14, 1.6),
  kesehatan: (h) => .05 + .9 * g2(h, 10, 2) + .7 * g2(h, 18, 2),
  ibadah: (h) => .05 + .5 * g2(h, 4.7, .5) + 1 * g2(h, 12, .6) + .6 * g2(h, 15.2, .5) + .9 * g2(h, 18, .5) + .7 * g2(h, 19.2, .5),
  mrt: (h) => .05 * (h >= 5 && h <= 24 ? 1 : 0) + .9 * g2(h, 7.6, 1) + .45 * g2(h, 12.5, 2.5) + 1 * g2(h, 17.8, 1.2) + .4 * g2(h, 20.5, 1.5),
  hub: (h) => .02 + .5 * g2(h, 12.5, 1.6) + .9 * g2(h, 17.5, 1.8) + 1 * g2(h, 20, 2),
};
const norm = (f) => { let s = 0; for (let h = 0; h < 24; h++) s += f(h); return (h) => f(h) / s; };
const PN = {}; for (const k in PROFIL) PN[k] = norm(PROFIL[k]);
const KAT = D.poi_cat, BOBOT = { kuliner: 1.6, belanja: 1.2, akomodasi: .45, jasa: .7, kesehatan: .5, ibadah: .6 };
const ANCHOR = [ // kunjungan/hari dari sumber terukur
  { n: 'Stasiun MRT Blok M BCA', xy: [515, 462], v: 17858, p: 'mrt', src: 'PT MRT Jakarta, Des 2025: 553.599 pelanggan/bulan' },
  { n: 'Blok M Hub (Terminal & Taman Literasi)', xy: [600, 375], v: 25000, p: 'hub', src: 'Katadata 2026: rata-rata 25.000 kunjungan/hari' },
  { n: 'M Bloc Space', xy: [548, 228], v: 6000, p: 'hub', src: 'Latip dkk. 2024: 6.000 pengunjung/hari' },
  { n: 'Taman Literasi Martha Tiahahu', xy: [548, 352], v: 400, p: 'hub', src: 'Ramadhan dkk. 2025: ±400 pengunjung/hari' },
];
const TOTAL_KAWASAN = 80000; // PT MRT Jakarta (Tuhiyat), 2026
const sumAnchor = ANCHOR.reduce((s, a) => s + a.v, 0);
const sumBobot = D.poi.reduce((s, p) => s + BOBOT[KAT[p[2]]], 0);
const SUMBER_SOS = []; // [x,z,harian,profil]
for (const p of D.poi) SUMBER_SOS.push([p[0], p[1], (TOTAL_KAWASAN - sumAnchor) * BOBOT[KAT[p[2]]] / sumBobot, KAT[p[2]]]);
for (const a of ANCHOR) { const [x, z] = tm(...a.xy); SUMBER_SOS.push([x, z, a.v, a.p]); }
// grid heksagon
const HR = 26; const HEX = [];
{ const dx = HR * Math.sqrt(3), dz = HR * 1.5; let row = 0;
  for (let z = EXT[1] + HR; z < EXT[3]; z += dz, row++) for (let x = EXT[0] + HR + (row % 2 ? dx / 2 : 0); x < EXT[2]; x += dx) HEX.push({ x, z, v: new Float32Array(24) }); }
for (const [x, z, harian, prof] of SUMBER_SOS) {
  const ws = []; let tot = 0;
  for (const hx of HEX) { const d2 = (hx.x - x) ** 2 + (hx.z - z) ** 2; if (d2 > (HR * 3.2) ** 2) continue; const w = Math.exp(-d2 / (2 * (HR * 1.1) ** 2)); ws.push([hx, w]); tot += w; }
  for (const [hx, w] of ws) for (let h = 0; h < 24; h++) hx.v[h] += harian * PN[prof](h) * w / tot;
}
const HEXA = HEX.filter((h) => h.v.reduce((a, b) => a + b, 0) > 40);
const hexGeo = new THREE.CylinderGeometry(HR * .93, HR * .93, 1, 6); hexGeo.translate(0, .5, 0); hexGeo.rotateY(Math.PI / 6);
const hexMat = new THREE.MeshStandardMaterial({ roughness: .55, transparent: true, opacity: .92, emissive: '#000000' });
hexMat.onBeforeCompile = (sh) => { sh.uniforms.uNight = U.uNight; sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uNight;').replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n#ifdef USE_COLOR\ntotalEmissiveRadiance += vColor.rgb * (0.18 + 0.7 * uNight);\n#endif'); };
const hexMesh = new THREE.InstancedMesh(hexGeo, hexMat, HEXA.length); hexMesh.castShadow = false; hexMesh.visible = false; scene.add(hexMesh);
const hexMaxJam = Math.max(...HEXA.map((h) => Math.max(...h.v)));
const SOS_RAMP = ['#FBE9CF', '#F6C177', '#EE8A4A', '#D5482E', '#9E2149', '#5B1A5E'].map(hexRGB);
function rampSos(t) { t = clamp(t) * (SOS_RAMP.length - 1); const i = Math.min(SOS_RAMP.length - 2, Math.floor(t)), f = t - i; return SOS_RAMP[i].map((v, k) => lerp(v, SOS_RAMP[i + 1][k], f)); }
const hexNow = new Float32Array(HEXA.length);
let sosGrow = 0;
function updateHex() {
  const h0 = Math.floor(S.jam) % 24, h1 = (h0 + 1) % 24, f = S.jam - Math.floor(S.jam);
  const m = new THREE.Matrix4(), c = new THREE.Color();
  HEXA.forEach((hx, i) => {
    const v = lerp(hx.v[h0], hx.v[h1], f); hexNow[i] = v; const t = Math.sqrt(v / hexMaxJam);
    const hh = Math.max(.6, t * 480 * sosGrow);
    m.makeScale(1, hh, 1); m.setPosition(hx.x, 0, hx.z); hexMesh.setMatrixAt(i, m);
    c.setRGB(...rampSos(t)); hexMesh.setColorAt(i, c);
  });
  hexMesh.instanceMatrix.needsUpdate = true; hexMesh.instanceColor.needsUpdate = true;
}
const totalJam = (h) => SUMBER_SOS.reduce((s, [, , v, p]) => s + v * PN[p](h), 0);

// =============================================================
//  Pejalan kaki (jejak jaringan dari analisis 2D)
// =============================================================
const PATHS = D.paths.map((p) => { const pts = p.p; const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); return { pts, cum, L: cum[cum.length - 1] }; }).filter((p) => p.L > 30);
const NA = 900;
const agGeo = new THREE.BufferGeometry(); const agPos = new Float32Array(NA * 3); agGeo.setAttribute('position', new THREE.BufferAttribute(agPos, 3));
const dotTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.35, 'rgba(255,255,255,.9)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
const agMat = new THREE.PointsMaterial({ size: 5.5, map: dotTex, color: '#C2441F', transparent: true, depthWrite: false, sizeAttenuation: true });
const agents = new THREE.Points(agGeo, agMat); agents.frustumCulled = false; agents.renderOrder = 6; scene.add(agents);
const AG = Array.from({ length: NA }, () => ({ p: PATHS[(Math.random() * PATHS.length) | 0], d: Math.random() * 300, v: 1.1 + Math.random() * .5, back: Math.random() < .4, on: false }));
function langkahAgen(dt) {
  const aktif = Math.round(NA * clamp(totalJam(S.jam % 24) / totalJam(19.3)) * .95 + 25);
  let k = 0;
  AG.forEach((a, i) => {
    a.on = i < aktif; if (!a.on) { agPos[k++] = 0; agPos[k++] = -50; agPos[k++] = 0; return; }
    a.d += a.v * dt * 22; if (a.d > a.p.L) { a.p = PATHS[(Math.random() * PATHS.length) | 0]; a.d = 0; a.back = Math.random() < (S.jam > 19 ? .6 : .35); }
    const { pts, cum, L } = a.p; let d = a.back ? L - a.d : a.d; let j = 1; while (j < cum.length - 1 && cum[j] < d) j++;
    const u = (d - cum[j - 1]) / (cum[j] - cum[j - 1] || 1);
    agPos[k++] = lerp(pts[j - 1][0], pts[j][0], u); agPos[k++] = 1.6; agPos[k++] = lerp(pts[j - 1][1], pts[j][1], u);
  });
  agGeo.attributes.position.needsUpdate = true;
}

// =============================================================
//  Lapisan analisis tanah (grid 2D)
// =============================================================
const rampF = (stops) => { const S_ = stops.map(([t, h]) => [t, hexRGB(h)]); return (t) => { t = clamp(t); for (let i = 1; i < S_.length; i++) if (t <= S_[i][0]) { const u = (t - S_[i - 1][0]) / (S_[i][0] - S_[i - 1][0]); return S_[i - 1][1].map((v, k) => lerp(v, S_[i][1][k], u)); } return S_[S_.length - 1][1]; }; };
const RAMP = {
  akses: [[0, '#1E4FB8'], [.33, '#5C8BE6'], [.66, '#BBD0F6'], [1, '#F4F1EC']],
  panas: [[0, '#2C9C9A'], [.3, '#BFE3D6'], [.5, '#F7EBC4'], [.72, '#F29A55'], [1, '#B8241C']],
  mix: [[0, '#F4F1EC'], [.4, '#D9CCF2'], [.7, '#A27FE0'], [1, '#5A2FA8']],
  angin: [[0, '#2E6BD9'], [.25, '#3FA8B8'], [.5, '#8CC56F'], [.75, '#F5BE4C'], [1, '#DB4B33']],
};
const fA = rampF(RAMP.akses), fP = rampF(RAMP.panas), fM = rampF(RAMP.mix), fW = rampF(RAMP.angin);
let isoR = 0, isoT0 = 0;
function gambarOverlay() {
  const d = oimg.data, n = GW * GH; const L = S.lapis === 'variety' ? varMode : (LAPIS[S.lapis].overlay || S.lapis); const rad = clamp(Math.sin(Math.PI * (S.jam - 6) / 12.4));
  const fld = L === 'angin' ? WFIELD[S.arah] : null; const Uref = S.uref * .78;
  for (let i = 0; i < n; i++) {
    let c = null, a = 0; const lu = GR.lu[i];
    if (L === 'akses') { const m = GR.akses[i] / 255 * 15; if (m <= 15) { c = fA(Math.floor(m / 2.5) * 2.5 / 15 + .04); a = .72; } }
    else if (L === 'walk') { const iso = GR.iso[i] / 255 * 1600; if (iso <= isoR) { c = iso <= 400 ? [.13, .5, .34] : [.49, .77, .61]; a = .7; if (isoR - iso < 10) { c = [.05, .31, .19]; a = 1; } } else { c = [.6, .58, .55]; a = .25; } }
    else if (L === 'variety') { if (LU_COL[lu]) { c = hexRGB(LU_COL[lu]); a = .55; } }
    else if (L === 'mix') { c = fM(GR.mix[i] / 255); a = .75; }
    else if (L === 'termal') { const h = GR.panas[i] / 255; c = fP(h * (.25 + .75 * rad) + (1 - rad) * .12); a = .75; }
    else if (L === 'angin') { const x = ((i % GW) * 4 + 2 - D.meta.origin[0]) * D.meta.mpp, z = (Math.floor(i / GW) * 4 + 2 - D.meta.origin[1]) * D.meta.mpp; const w = anginDi(x, z, fld); if (w && !w[2]) { c = fW(Math.hypot(w[0], w[1]) * Uref / 4); a = .5; } }
    const j = i * 4; if (c) { d[j] = c[0] * 255; d[j + 1] = c[1] * 255; d[j + 2] = c[2] * 255; d[j + 3] = a * 255; } else d[j + 3] = 0;
  }
  octx.putImageData(oimg, 0, 0); ovTex.needsUpdate = true;
}

// =============================================================
//  State + tampilan kamera
// =============================================================
const VIEWS = {
  iso: { fov: 14, pos: [2250, 1830, 2250], tgt: [160, 0, -60] },
  persp: { fov: 42, pos: [820, 520, 900], tgt: [120, 0, -60] },
  atas: { fov: 30, pos: [CX, 2900, CZ + 1], tgt: [CX, 0, CZ] },
  jalan: { fov: 55, pos: [120, 34, 175], tgt: [420, 20, 30] },
  burung: { fov: 34, pos: [-650, 420, 420], tgt: [250, 0, -80] },
};
let camAnim = null;
function keView(nama, dur = 1800) {
  S.tampil = nama; const v = VIEWS[nama]; $$('[data-view]').forEach((b) => b.classList.toggle('on', b.dataset.view === nama));
  const p0 = camera.position.clone(), t0 = controls.target.clone(), f0 = camera.fov;
  const p1 = new THREE.Vector3(...v.pos), t1 = new THREE.Vector3(...v.tgt);
  camAnim = { t: 0, dur: reduce ? 1 : dur, p0, t0, f0, p1, t1, f1: v.fov };
}
function stepCam(dt) {
  if (!camAnim) return; camAnim.t += dt * 1000; const u = ease(clamp(camAnim.t / camAnim.dur));
  camera.position.lerpVectors(camAnim.p0, camAnim.p1, u); controls.target.lerpVectors(camAnim.t0, camAnim.t1, u);
  // busur halus: angkat kamera di tengah transisi
  camera.position.y += Math.sin(u * Math.PI) * 120;
  camera.fov = lerp(camAnim.f0, camAnim.f1, u); camera.updateProjectionMatrix();
  if (u >= 1) camAnim = null;
}
let tur = null;
function mulaiTur() {
  const urutan = ['burung', 'jalan', 'persp', 'atas', 'iso']; let i = 0;
  const lanjut = () => { if (!tur) return; keView(urutan[i % urutan.length], 2600); i++; tur = setTimeout(lanjut, 5200); };
  tur = 1; lanjut();
}
function stopTur() { if (tur) { clearTimeout(tur); tur = null; $('#v-tur').classList.remove('on'); } }

// =============================================================
//  Konfigurasi lapisan
// =============================================================
const LAPIS = {
  ringkasan: { judul: 'Ringkasan kawasan', warna: '#C2441F', bangunan: 'fungsi', overlay: null, agen: true },
  akses: { judul: 'Aksesibilitas', warna: '#2F6BD8', bangunan: 'netral', overlay: 'akses', agen: true },
  walk: { judul: 'Walkability', warna: '#2E9A6A', bangunan: 'netral', overlay: 'walk', agen: true },
  variety: { judul: 'Variety function', warna: '#7C4DCC', bangunan: 'fungsi', overlay: 'variety', agen: false },
  termal: { judul: 'Termal & bayangan', warna: '#E4572E', bangunan: 'putih', overlay: 'termal', agen: false },
  angin: { judul: 'Angin pejalan kaki', warna: '#2E8FB8', bangunan: 'putih', overlay: 'angin', agen: false },
  sosial: { judul: 'Heatmap sosial', warna: '#9E2149', bangunan: 'netral', overlay: null, agen: true },
};
let ovFade = 0, ovTarget = 0;
function setLapis(id) {
  if (!LAPIS[id]) id = 'ringkasan';
  S.lapis = id; const L = LAPIS[id];
  document.documentElement.style.setProperty('--c', L.warna);
  $$('.lapis').forEach((b) => b.classList.toggle('on', b.dataset.l === id));
  warnaiBangunan(L.bangunan);
  ovTarget = L.overlay ? 1 : 0; ovFade = 0; ovMat.opacity = 0;
  if (L.overlay) { if (id === 'walk') { isoR = 0; isoT0 = performance.now(); } gambarOverlay(); }
  wLines.visible = id === 'angin'; hexMesh.visible = id === 'sosial'; sosGrow = 0; if (id === 'sosial') updateHex();
  agents.visible = L.agen && $('#t-orang').checked;
  agMat.color.set(id === 'sosial' ? '#ffffff' : L.warna);
  bMat.transparent = id === 'sosial'; bMat.opacity = id === 'sosial' ? .3 : 1; bMat.needsUpdate = true;
  $('#ctl-angin').hidden = id !== 'angin';
  ring.visible = id === 'walk' || id === 'ringkasan' || id === 'akses';
  shadowCatcher.visible = true; shadowCatcher.material.opacity = L.overlay ? .3 : .12;
  for (const o of LBL) o.sembunyi = (o.grup === 'transit' && !['ringkasan', 'akses', 'walk', 'sosial'].includes(id)) || (o.grup === 'ring' && !ring.visible);
  renderPanel(); renderLegenda();
  if (id === 'termal' && !S.main) animJam(13.5);
  if (id === 'sosial' && !S.main && (S.jam < 16 || S.jam > 21)) animJam(19.5);
}

// cincin radius 400/800 m dari MRT
const ring = new THREE.Group();
for (const r of [400, 800]) {
  const g = new THREE.RingGeometry(r - 1.6, r + 1.6, 160); const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: '#1F1F1F', transparent: true, opacity: r === 400 ? .55 : .35, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = .6; ring.add(m);
}
scene.add(ring);
label('<b>400 m</b>', 400 * .71, 2, -400 * .71, 'ring'); label('<b>800 m</b>', 800 * .71, 2, -800 * .71 * .55, 'ring');
LBL.slice(-2).forEach((o) => o.grup = 'ring');

// =============================================================
//  Panel UI
// =============================================================
const ST = D.stat2d;
let teduhCache = { k: '', v: null }, anginCache = { k: '', v: null };
function kpi(n, lbl, suf = '', d = 0) { return `<div class="kpi"><b>${typeof n === 'number' ? nf(n, d) : n}<small>${suf}</small></b><span>${lbl}</span></div>`; }
function renderPanel() {
  const P = $('#panel-isi'); const id = S.lapis; let h = '';
  if (id === 'ringkasan') {
    h = `<h2>Blok M dalam 3D</h2><p class="teks">${B.length.toLocaleString('id-ID')} bangunan dari OpenStreetMap diekstrusi menurut tinggi. Lima landmark memakai jumlah lantai dari sumber publik; lainnya estimasi tipologi yang dikalibrasi ke KLB/KDB audit TOD.</p>
    <div class="kpi-grid">${kpi(B.length, 'bangunan dimodelkan')}${kpi(T.length, 'pohon dari citra satelit & taman')}${kpi(D.poi.length, 'titik POI OSM (kuliner, toko, jasa…)')}${kpi(80000, 'pengunjung kawasan per hari (PT MRT Jakarta)')}</div>
    <p class="sumber">Pilih lensa di kiri. Geser jam untuk melihat matahari, bayangan, dan keramaian berubah. Klik bangunan untuk detail.</p>`;
  } else if (id === 'akses') {
    h = `<h2>Aksesibilitas transit</h2><p class="teks">Waktu jalan kaki lewat jaringan jalan ke MRT, terminal, dan halte TransJakarta terdekat (80 m/menit).</p>
    <div class="kpi-grid">${kpi(ST.akses.persen_10menit_800, 'area 800 m ≤10 menit ke transit', '%', 0)}${kpi(ST.akses.menit_rata_400, 'rata-rata menit (400 m)', ' mnt', 1)}${kpi(553599, 'pelanggan MRT Blok M BCA, Des 2025')}${kpi(2, 'peringkat stasiun MRT terpadat')}</div>
    <p class="sumber">Ridership: PT MRT Jakarta via Media Asuransi (Jan 2026). Kereta di layar berjalan pada jalur layang Panglima Polim.</p>`;
  } else if (id === 'walk') {
    h = `<h2>Walkability · pedshed</h2><p class="teks">Area hijau tumbuh dari MRT Blok M mengikuti jaringan jalan. Selisih dengan cincin 400/800 m = jalan memutar.</p>
    <div class="kpi-grid">${kpi(ST.pedshed['400'].rasio, 'pedshed 400 m', '%', 1)}${kpi(ST.pedshed['800'].rasio, 'pedshed 800 m', '%', 1)}${kpi(ST.pedshed['800'].simpang_per_km2, 'simpang per km²')}${kpi(ST.walk.skor_800, 'skor walkability 800 m', '', 1)}</div>`;
  } else if (id === 'variety') {
    const m = ST.mix.r800; h = `<h2>Keragaman fungsi</h2><p class="teks">Bangunan diwarnai menurut fungsi guna lahan. Indeks campuran 800 m: <b>${nf(ST.mix.entropi_800, 2)}</b> dari 1.</p>
    <div class="bars">${Object.entries(m).map(([k, v], i) => `<div class="bar"><span>${k}</span><i style="--w:${v}%;--col:${['#C99A1E', '#D9573A', '#3E7FD0', '#3F9A5E', '#9A6BB8'][i]}"></i><b>${nf(v, 1)}%</b></div>`).join('')}</div>
    <div class="seg"><button data-vm="variety" class="on">Guna lahan</button><button data-vm="mix">Indeks campuran</button><button data-bc="tinggi">Warna tinggi</button></div>`;
  } else if (id === 'termal') {
    const k = S.doy + '|' + S.jam.toFixed(1); if (teduhCache.k !== k) teduhCache = { k, v: persenTeduh() };
    const td = teduhCache.v;
    h = `<h2>Termal & bayangan</h2><p class="teks">Posisi matahari dihitung untuk lintang Blok M pada tanggal dan jam terpilih. Bayangan bangunan dan pohon dihitung langsung.</p>
    <div class="kpi-grid">${kpi(SUN.elDeg > 0 ? SUN.elDeg : 0, 'elevasi matahari', '°', 0)}${kpi(SUN.elDeg > 0 ? SUN.azDeg : 0, 'azimut (dari utara)', '°', 0)}${kpi(td == null ? '–' : td, 'jalur pejalan 800 m yang ternaungi', td == null ? '' : '%', 0)}${kpi(25 + 7.6 * Math.pow(clamp(Math.sin(Math.PI * (S.jam - 6.2) / 15.6)), 1.25), 'suhu udara tipikal (asumsi)', ' °C', 1)}</div>
    <p class="sumber">Teduhan = sampel tiap ±11 m di sel jalan, ray-march ke arah matahari terhadap peta tinggi bangunan &amp; pohon. Lapisan warna = indeks panas permukaan (estimasi, lihat dashboard 2D).</p>`;
  } else if (id === 'angin') {
    const k = S.arah + '|' + S.uref; if (anginCache.k !== k) anginCache = { k, v: statAngin() }; const a = anginCache.v;
    h = `<h2>Angin di level pejalan kaki</h2><p class="teks">Medan aliran 2D <b>Lattice-Boltzmann</b> (D2Q9, sel 6 m) di antara bangunan. Garis = jejak partikel, warna = kecepatan.</p>
    <div class="kpi-grid">${kpi(a.rata, 'rata-rata kecepatan di jalan (800 m)', ' m/s', 2)}${kpi(a.stag, 'jalan dengan udara stagnan (<0,3 m/s)', '%', 0)}${kpi(a.nyaman, 'jalan dengan angin nyaman', '%', 0)}${kpi(a.kencang, 'jalan berangin kencang (>4 m/s)', '%', 0)}</div>
    <p class="sumber">Arah & kecepatan referensi mengikuti pola monsun Jakarta (BMKG; monsun barat Okt–Mar, monsun timur Apr–Sep). Model 2D untuk penyaringan awal, bukan CFD 3D.</p>`;
  } else if (id === 'sosial') {
    const tj = totalJam(Math.floor(S.jam) % 24); const top = [...HEXA.keys()].sort((a, b) => hexNow[b] - hexNow[a]).slice(0, 1)[0];
    h = `<h2>Heatmap sosial</h2><p class="teks">Kolom = estimasi kunjungan per jam di tiap heksagon (radius ${HR} m). Dibangun dari ${D.poi.length} POI OpenStreetMap dikali profil jam buka, plus titik jangkar terukur.</p>
    <div class="kpi-grid">${kpi(Math.round(tj / 100) * 100, 'estimasi kunjungan kawasan pukul ' + fmtJam(S.jam))}${kpi(Math.round((hexNow[top] || 0) / 10) * 10, 'kunjungan/jam di heksagon terpadat')}${kpi(80000, 'total kalibrasi per hari')}${kpi(145855, 'rekor kunjungan Blok M Hub, malam tahun baru 2026')}</div>
    <table><tbody>${ANCHOR.map((a) => `<tr><td>${a.n}</td><td class="r">${nf(a.v)}/hari</td></tr>`).join('')}</tbody></table>
    <p class="sumber">${ANCHOR.map((a) => a.src).join(' · ')} · Total 80.000/hari: Dirut PT MRT Jakarta (investortrust.id, 2026). Profil jam = model.</p>`;
  }
  P.innerHTML = h;
  $$('[data-vm]', P).forEach((b) => b.onclick = () => { $$('[data-vm],[data-bc]', P).forEach((x) => x.classList.toggle('on', x === b)); varMode = b.dataset.vm; warnaiBangunan('fungsi'); gambarOverlay(); });
  $$('[data-bc]', P).forEach((b) => b.onclick = () => { $$('[data-vm],[data-bc]', P).forEach((x) => x.classList.toggle('on', x === b)); warnaiBangunan('tinggi'); });
}

function renderLegenda() {
  const L = S.lapis, el = $('#legenda'); let h = '';
  const grad = (st) => `linear-gradient(90deg,${st.map(([t, c]) => `${c} ${t * 100}%`).join(',')})`;
  if (L === 'akses') h = `<b>Menit jalan ke transit</b><div class="sk" style="background:${grad(RAMP.akses)}"></div><div class="tk"><span>0</span><span>5</span><span>10</span><span>15+</span></div>`;
  else if (L === 'walk') h = `<b>Jangkauan dari MRT Blok M</b><div class="li"><i style="background:#21804F"></i>≤400 m</div><div class="li"><i style="background:#7DC49B"></i>400–800 m</div><div class="li"><i style="background:#9A948C"></i>belum terjangkau</div>`;
  else if (L === 'variety' || L === 'ringkasan') h = `<b>Fungsi bangunan</b>${Object.entries(LU_NAMA).map(([k, n]) => `<div class="li"><i style="background:${LU_COL[k]}"></i>${n}</div>`).join('')}`;
  else if (L === 'termal') h = `<b>Indeks panas permukaan</b><div class="sk" style="background:${grad(RAMP.panas)}"></div><div class="tk"><span>sejuk</span><span>panas</span></div><div class="li"><i style="background:#555"></i>bayangan aktual jam ini</div>`;
  else if (L === 'angin') h = `<b>Kecepatan angin (m/s)</b><div class="sk" style="background:${grad(RAMP.angin)}"></div><div class="tk"><span>0</span><span>1</span><span>2</span><span>3</span><span>4+</span></div>`;
  else if (L === 'sosial') h = `<b>Kunjungan per jam / heksagon</b><div class="sk" style="background:linear-gradient(90deg,#FBE9CF,#F6C177,#EE8A4A,#D5482E,#9E2149,#5B1A5E)"></div><div class="tk"><span>sepi</span><span>${nf(Math.round(hexMaxJam / 10) * 10)}+</span></div>`;
  el.innerHTML = h;
}

// =============================================================
//  Waktu
// =============================================================
const fmtJam = (h) => { h = ((h % 24) + 24) % 24; return String(Math.floor(h)).padStart(2, '0') + ':' + String(Math.floor((h % 1) * 60)).padStart(2, '0'); };
let lastPanel = 0;
function setJam(h) {
  S.jam = h; $('#slider').value = h; $('#jam').textContent = fmtJam(h);
  setMatahari();
  $('#jam-info').textContent = SUN.elDeg > 0 ? `Matahari ${nf(SUN.elDeg, 0)}° · azimut ${nf(SUN.azDeg, 0)}°` : 'Malam · lampu kota menyala';
  if (S.lapis === 'termal') gambarOverlay();
  if (S.lapis === 'sosial') updateHex();
  const now = performance.now(); if (now - lastPanel > 350 && ['termal', 'sosial'].includes(S.lapis)) { lastPanel = now; renderPanel(); }
  gambarRitme();
}
function animJam(tgt) { const h0 = S.jam, t0 = performance.now(); const st = (n) => { const u = ease(clamp((n - t0) / 1600)); setJam(lerp(h0, tgt, u)); if (u < 1 && !S.main) requestAnimationFrame(st); }; requestAnimationFrame(st); }
function gambarRitme() {
  const svg = $('#ritme'); if (!svg.dataset.ok) {
    let d = ''; let mx = 0; const vals = []; for (let h = 5; h <= 24; h += .25) { const v = totalJam(Math.floor(h) % 24); vals.push(v); mx = Math.max(mx, v); }
    vals.forEach((v, i) => { d += (i ? 'L' : 'M') + (i / (vals.length - 1) * 300).toFixed(1) + ' ' + (34 - v / mx * 30).toFixed(1); });
    svg.innerHTML = `<path d="${d}L300 36L0 36Z" fill="var(--c)" opacity=".15"/><path d="${d}" fill="none" stroke="var(--c)" stroke-width="1.4" vector-effect="non-scaling-stroke"/>`; svg.dataset.ok = 1;
  }
}

// =============================================================
//  Interaksi: hover / klik bangunan
// =============================================================
const ray = new THREE.Raycaster(); const mouse = new THREE.Vector2(); let downXY = null;
canvas.addEventListener('pointerdown', (e) => { downXY = [e.clientX, e.clientY]; stopTur(); });
canvas.addEventListener('pointerup', (e) => { if (!downXY || Math.hypot(e.clientX - downXY[0], e.clientY - downXY[1]) > 4) return; pilih(e); });
function pilih(e) {
  const r = canvas.getBoundingClientRect(); mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(mouse, camera); const hit = ray.intersectObject(bMesh, false)[0];
  if (!hit) { sorot(null); $('#info').hidden = true; return; }
  const i = bBid[hit.faceIndex * 3]; sorot(i); const b = B[i];
  const gi = Math.floor(((b.c[1] / D.meta.mpp) + D.meta.origin[1]) / 4) * GW + Math.floor(((b.c[0] / D.meta.mpp) + D.meta.origin[0]) / 4);
  const menit = GR.akses[gi] / 255 * 15, panas = GR.panas[gi] / 255;
  const w = anginDi(b.c[0], b.c[1], WFIELD[S.arah]);
  $('#info').hidden = false;
  $('#info').innerHTML = `<button class="x" aria-label="Tutup">✕</button><span class="pill" style="background:${LU_COL[b.u]}22;color:${LU_COL[b.u]}">${LU_NAMA[b.u]}</span>
    <h3>${b.n || 'Bangunan #' + (i + 1)}</h3>
    <div class="kpi-grid">${kpi(b.f, 'lantai', '')}${kpi(Math.round(b.h), 'tinggi', ' m')}${kpi(b.a, 'luas tapak', ' m²')}${kpi(Math.round(b.a * b.f * .85), 'est. luas lantai', ' m²')}</div>
    <p class="teks">±${nf(menit, 1)} menit jalan ke transit · indeks panas ${nf(panas * 100, 0)}/100</p>
    <p class="sumber">${b.n ? 'Sumber tinggi: ' + b.s : 'Tinggi: estimasi tipologi (lihat Metodologi)'}</p>`;
  $('#info .x').onclick = () => { $('#info').hidden = true; sorot(null); };
}

// =============================================================
//  Kontrol UI
// =============================================================
$$('.lapis').forEach((b) => b.onclick = () => { location.hash = b.dataset.l; });
window.addEventListener('hashchange', () => setLapis(location.hash.slice(1)));
$$('[data-view]').forEach((b) => b.onclick = () => { stopTur(); if (b.dataset.view === 'tur') { b.classList.add('on'); mulaiTur(); } else keView(b.dataset.view); });
$$('[data-dasar]').forEach((b) => b.onclick = () => { $$('[data-dasar]').forEach((x) => x.classList.toggle('on', x === b)); groundMat.map = TEX[b.dataset.dasar]; groundMat.needsUpdate = true; });
$('#slider').oninput = (e) => { berhenti(); setJam(+e.target.value); };
$('#tanggal').onchange = (e) => { S.doy = +e.target.value; teduhCache.k = ''; setJam(S.jam); renderPanel(); };
$('#arah').onchange = (e) => { S.arah = e.target.value; gambarOverlay(); renderPanel(); };
$('#uref').oninput = (e) => { S.uref = +e.target.value; $('#uref-v').textContent = nf(S.uref, 1) + ' m/s'; gambarOverlay(); anginCache.k = ''; clearTimeout(window._ut); window._ut = setTimeout(renderPanel, 200); };
$('#main').onclick = () => { S.main = !S.main; $('#main').classList.toggle('on', S.main); $('#ikon-main').innerHTML = S.main ? '<path d="M6 4h4v16H6zM14 4h4v16h-4z"/>' : '<path d="M6 4l14 8-14 8z"/>'; };
function berhenti() { S.main = false; $('#main').classList.remove('on'); $('#ikon-main').innerHTML = '<path d="M6 4l14 8-14 8z"/>'; }
$('#t-orang').onchange = (e) => { agents.visible = e.target.checked && LAPIS[S.lapis].agen; };
$('#t-pohon').onchange = (e) => { crown.visible = trunk.visible = e.target.checked; };
$('#t-label').onchange = (e) => { lblRoot.style.display = e.target.checked ? '' : 'none'; };
$('#t-kereta').onchange = (e) => { KERETA.forEach((k) => k.grp.visible = e.target.checked); };
$('#b-metode').onclick = () => { $('#modal').hidden = false; };
$('#modal').onclick = (e) => { if (e.target.id === 'modal' || e.target.classList.contains('tutup')) $('#modal').hidden = true; };
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { $('#modal').hidden = true; $('#info').hidden = true; sorot(null); } });

// =============================================================
//  Loop
// =============================================================
const clock = new THREE.Clock(); let t0 = performance.now(); let simMenit = 0;
function loop() {
  const dt = Math.min(.05, clock.getDelta());
  const el = (performance.now() - t0) / 1000;
  U.uGrow.value = reduce ? 1 : clamp(el / 3.2); U.uTime.value = el;
  if (S.main) { let h = S.jam + dt * .9; if (h > 24) h = 5; setJam(h); }
  stepCam(dt); controls.update();
  const cd = camera.position.distanceTo(controls.target); scene.fog.near = cd * 1.1; scene.fog.far = cd * 3.2;
  const az = Math.atan2(camera.position.x - controls.target.x, camera.position.z - controls.target.z); $('#utara').style.transform = `rotate(${az * 180 / Math.PI}deg)`;
  // overlay fade & isokron
  if (ovMat.opacity < ovTarget) ovMat.opacity = Math.min(ovTarget, ovMat.opacity + dt * 2.2); else if (ovMat.opacity > ovTarget) ovMat.opacity = Math.max(0, ovMat.opacity - dt * 3);
  if (S.lapis === 'walk' && isoR < 800) { isoR = 800 * ease(clamp((performance.now() - isoT0) / 2800)); gambarOverlay(); }
  if (S.lapis === 'sosial' && sosGrow < 1) { sosGrow = Math.min(1, sosGrow + dt * .8); updateHex(); }
  if (wLines.visible) langkahAngin(dt);
  if (agents.visible) langkahAgen(dt);
  // kereta: headway 5 menit, waktu simulasi dipercepat
  simMenit += dt * 1.4;
  const L = mrtCurve.getLength();
  for (const k of KERETA) {
    const u = ((simMenit / 5 + k.fase) % 1); const pos = k.arah ? 1 - u : u;
    const dir = k.arah ? -1 : 1, off = k.arah ? 2.2 : -2.2;
    k.grp.children.forEach((car, ci) => { const tt = clamp(pos - dir * ci * 20.6 / L); const p = mrtCurve.getPointAt(tt); const tg = mrtCurve.getTangentAt(tt); car.position.set(p.x + off * tg.z, 11.9, p.z - off * tg.x); car.rotation.y = Math.atan2(tg.x, tg.z); car.visible = tt > 0.002 && tt < .998; });
  }
  renderer.render(scene, camera);
  updateLabels();
  requestAnimationFrame(loop);
}

// =============================================================
//  Mulai
// =============================================================
resize();
camera.position.set(3400, 2900, 3400); camera.lookAt(controls.target);
setMatahari(); warnaiBangunan('fungsi');
setLapis(location.hash.slice(1) || 'ringkasan');
setJam(S.jam);
keView('iso', 2600);
requestAnimationFrame(() => { $('#memuat').classList.add('hilang'); });
loop();
window.__bm = { S, B, setLapis, keView, setJam, camera, controls, sun, scene, renderer, ground, bMesh, THREE };
