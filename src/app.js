// Blok M 3D v2: peta studi kelayakan interaktif
// Vendor open source: three.js (MIT), camera-controls (MIT), Apache ECharts (Apache-2.0), anime.js (MIT)
import * as THREE from 'three';
import CameraControls from './vendor/camera-controls.module.js';
import { EffectComposer } from './vendor/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from './vendor/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from './vendor/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from './vendor/jsm/postprocessing/OutputPass.js';
import anime from './vendor/anime.es.js';
import * as echarts from 'echarts/core';
import { BarChart, LineChart, RadarChart, PieChart, GaugeChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, RadarComponent, MarkLineComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
echarts.use([BarChart, LineChart, RadarChart, PieChart, GaugeChart, GridComponent, TooltipComponent, RadarComponent, MarkLineComponent, LegendComponent, CanvasRenderer]);
CameraControls.install({ THREE });

const D = window.D3, V = window.DV2, A = window.ASET;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const nf = (v, d = 0) => new Intl.NumberFormat('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d }).format(v);
const hexRGB = (h) => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
const dec = (b64) => { const s = atob(b64); const a = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i); return a; };
const dec8 = (b64) => new Int8Array(dec(b64).buffer);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mqHP = matchMedia('(max-width: 860px)');
const LITE = /lite/.test(location.search) || mqHP.matches || (navigator.hardwareConcurrency || 8) <= 4;
const avg = (a) => a.reduce((s, x) => s + x, 0) / a.length;
const fmtJam = (h) => { h = ((h % 24) + 24) % 24; return String(Math.floor(h)).padStart(2, '0') + ':' + String(Math.floor((h % 1) * 60)).padStart(2, '0'); };

const S = { lapis: 'ringkasan', jam: 16.5, doy: 80, arah: 'B', uref: 2.6, main: false, kecepatan: 1, fokus: true, varMode: 'lu', pohonSkenario: false, klbPakai: 0 };
const EXT = D.meta.extent, EW = EXT[2] - EXT[0], EH = EXT[3] - EXT[1], CX = (EXT[0] + EXT[2]) / 2, CZ = (EXT[1] + EXT[3]) / 2;
const MPP = D.meta.mpp, ORI = D.meta.origin;
const tm = (x, y) => [(x - ORI[0]) * MPP, (y - ORI[1]) * MPP];

// =============================================================
//  Grid analisis (350 x 179 sel, 5,76 m)
// =============================================================
const GW = D.gmeta.gw, GH = D.gmeta.gh, CELL_M = 4 * MPP;
const GR = {}; for (const k in D.grid) GR[k] = dec(D.grid[k]);
for (const k in V.grid) GR[k] = dec(V.grid[k]);
const dv = (b, lo, hi) => (b ? lo + (b - 1) / 254 * (hi - lo) : NaN);
const val = {
  akses: (i) => GR.akses[i] / 255 * 15, iso: (i) => GR.iso[i] / 255 * 1600, walk: (i) => GR.walk[i] / 255 * 100,
  mix: (i) => GR.mix[i] / 255, panas: (i) => GR.panas[i] / 255, lu: (i) => GR.lu[i],
  bising: (i) => dv(GR.bising[i], 40, 85), svf: (i) => dv(GR.svf[i], 0, 1), fas: (i) => GR.fas[i], rth: (i) => dv(GR.rth[i], 0, 1000), dalam: (i) => GR.dalam[i],
};
const cellOf = (x, z) => { const i = Math.floor((x / MPP + ORI[0]) / 4), j = Math.floor((z / MPP + ORI[1]) / 4); return (i < 0 || j < 0 || i >= GW || j >= GH) ? -1 : j * GW + i; };
const cellXZ = (i) => [((i % GW) * 4 + 2 - ORI[0]) * MPP, (Math.floor(i / GW) * 4 + 2 - ORI[1]) * MPP];
const BND = V.batas; // poligon kawasan inti (meter)
const BC = [avg(BND.map((p) => p[0])), avg(BND.map((p) => p[1]))];
function dalamPoligon(x, z, P = BND) { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { if ((P[i][1] > z) !== (P[j][1] > z) && x < (P[j][0] - P[i][0]) * (z - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0]) c = !c; } return c; }
const ST = D.stat2d, VS = V.stat;

// =============================================================
//  Skor kelayakan (kawasan inti)
// =============================================================
const LIT = {
  tod: { jalurPed: [83, 13, 52], penyeberangan: [41, 8, 33], peneduh: [25, 13, 24], sepeda: [33, 15, 75], mukaBlok: [177, 223, 141], aspekCampuran: [57, 43, 71], aspekRamah: [37.5, 12.5, 25], aspekTransit: [100, 100, 100], jarakMRT: [443, 652, 948] },
};
const SK = {};
SK.akses = Math.round(avg([VS.akses5, VS.akses10, avg(LIT.tod.aspekTransit)]));
SK.walk = Math.round(avg([ST.pedshed['800'].rasio, VS.walk_rata, avg(LIT.tod.aspekRamah)]));
SK.variety = Math.round(avg([VS.mix_rata * 100, avg(LIT.tod.aspekCampuran)]));
SK.termal = Math.round(avg([100 - VS.panas_tinggi, avg(LIT.tod.peneduh) / 75 * 100]));
const W_AHP = { akses: .4932, walk: .32, termal: .106, variety: .0808 };
SK.total = Math.round(SK.akses * W_AHP.akses + SK.walk * W_AHP.walk + SK.termal * W_AHP.termal + SK.variety * W_AHP.variety);
SK.akustik = Math.round(100 - VS.fasad_lewat);
SK.fasilitas = Math.round(VS.fas_lengkap);
SK.rth = Math.round(VS.rth300);
SK.tumbuh = Math.round(100 * VS.blok_sisa / VS.blok_izin);
const kategori = (s) => s >= 75 ? ['Layak', '#1F7A4D'] : s >= 55 ? ['Layak bersyarat', '#B7791F'] : ['Perlu intervensi', '#A33A1A'];

// =============================================================
//  Renderer, kamera, kontrol, pascaproses
// =============================================================
const canvas = $('#gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !LITE, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(LITE ? 1.5 : 2, devicePixelRatio));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.NeutralToneMapping;
const scene = new THREE.Scene();
const LANGIT = { siang: new THREE.Color('#F3F0EA'), malam: new THREE.Color('#1B2133'), senja: new THREE.Color('#F2C9A6') };
scene.background = LANGIT.siang.clone(); scene.fog = new THREE.Fog(scene.background, 2000, 6000);
const camera = new THREE.PerspectiveCamera(16, 1, 5, 14000);
const cc = new CameraControls(camera, canvas);
cc.smoothTime = .55; cc.draggingSmoothTime = .12; cc.dollyToCursor = true; cc.maxPolarAngle = Math.PI * .47; cc.minDistance = 60; cc.maxDistance = 6500;
cc.setBoundary(new THREE.Box3(new THREE.Vector3(EXT[0], -10, EXT[1]), new THREE.Vector3(EXT[2], 400, EXT[3])));
let composer = null, bloom = null;
if (!LITE) {
  const rt = new THREE.WebGLRenderTarget(1, 1, { samples: 4, type: THREE.HalfFloatType });
  composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), .2, .55, .82); composer.addPass(bloom);
  composer.addPass(new OutputPass());
}
function resize() {
  const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  if (composer) composer.setSize(w, h);
  charts.forEach((c) => c.resize());
}
addEventListener('resize', resize);

const hemi = new THREE.HemisphereLight(0xffffff, 0xd9d2c6, .72); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 2.5); sun.castShadow = true;
sun.shadow.mapSize.set(LITE ? 2048 : 4096, LITE ? 2048 : 4096); sun.shadow.bias = -0.0005; sun.shadow.normalBias = .6;
Object.assign(sun.shadow.camera, { left: -1150, right: 1150, top: 1150, bottom: -1150, near: 10, far: 5000 }); sun.shadow.camera.updateProjectionMatrix();
scene.add(sun, sun.target); sun.target.position.set(CX, 0, CZ);

// =============================================================
//  Tanah, lapisan analisis, batas kawasan
// =============================================================
const TEX = {}; const loader = new THREE.TextureLoader();
for (const k of ['dasar', 'peta', 'satelit']) { TEX[k] = loader.load(A[k]); TEX[k].colorSpace = THREE.SRGBColorSpace; TEX[k].anisotropy = 8; }
const groundMat = new THREE.MeshStandardMaterial({ map: TEX.dasar, roughness: 1 });
const ground = new THREE.Mesh(new THREE.PlaneGeometry(EW, EH), groundMat); ground.rotation.x = -Math.PI / 2; ground.position.set(CX, 0, CZ); ground.receiveShadow = true; scene.add(ground);
const far = new THREE.Mesh(new THREE.PlaneGeometry(16000, 16000), new THREE.MeshStandardMaterial({ color: '#E9E6E0', roughness: 1 }));
far.rotation.x = -Math.PI / 2; far.position.set(CX, -.6, CZ); far.receiveShadow = true; scene.add(far);
const ov = document.createElement('canvas'); ov.width = GW; ov.height = GH; const octx = ov.getContext('2d'); const oimg = octx.createImageData(GW, GH);
const ovTex = new THREE.CanvasTexture(ov); ovTex.colorSpace = THREE.SRGBColorSpace;
const ovMat = new THREE.MeshBasicMaterial({ map: ovTex, transparent: true, depthWrite: false, opacity: 0 });
const OVW = EW * (GW * 4 / 1400), OVH = EH * (GH * 4 / 717);
const ovMesh = new THREE.Mesh(new THREE.PlaneGeometry(OVW, OVH), ovMat); ovMesh.rotation.x = -Math.PI / 2; ovMesh.position.set(EXT[0] + OVW / 2, .25, EXT[1] + OVH / 2); ovMesh.renderOrder = 2; scene.add(ovMesh);
const catcher = new THREE.Mesh(new THREE.PlaneGeometry(EW, EH), new THREE.ShadowMaterial({ opacity: .14 })); catcher.rotation.x = -Math.PI / 2; catcher.position.set(CX, .4, CZ); catcher.receiveShadow = true; catcher.renderOrder = 3; scene.add(catcher);
// pita batas kawasan dengan garis putus beranimasi
const U = { uGrow: { value: 0 }, uNight: { value: 0 }, uTime: { value: 0 }, uMix: { value: 1 }, uFocus: { value: 1 } };
const batas = (() => {
  const path = new THREE.CurvePath(); const P = BND.map(([x, z]) => new THREE.Vector3(x, 1, z));
  for (let i = 0; i < P.length; i++) path.add(new THREE.LineCurve3(P[i], P[(i + 1) % P.length]));
  const g = new THREE.TubeGeometry(path, 600, 1.7, 6, true);
  const m = new THREE.MeshBasicMaterial({ color: '#C2441F', transparent: true, toneMapped: false });
  m.onBeforeCompile = (sh) => { sh.uniforms.uTime = U.uTime; sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vU;').replace('#include <uv_vertex>', '#include <uv_vertex>\nvU = uv;'); sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uTime; varying vec2 vU;').replace('#include <dithering_fragment>', '#include <dithering_fragment>\nif (fract(vU.x * 380.0 - uTime * 0.8) > 0.55) discard;'); };
  const mesh = new THREE.Mesh(g, m); mesh.renderOrder = 4; scene.add(mesh); return mesh;
})();

// =============================================================
//  Bangunan
// =============================================================
const B = D.bld, PV = V.pv;
const LU_COL = { 3: '#C99A1E', 4: '#D9573A', 5: '#3E7FD0', 6: '#3F9A5E', 8: '#9A6BB8' };
const LU_NAMA = { 3: 'Hunian', 4: 'Komersial & jasa', 5: 'Pendidikan & publik', 6: 'Ruang hijau', 8: 'Fasilitas lain' };
const B_IN = new Uint8Array(B.length); V.dalam_bld.forEach((i) => B_IN[i] = 1);
let bGeo, bBid;
(function () {
  const pos = [], nor = [], bid = [], dist = [], top = [], inn = [];
  B.forEach((b, i) => {
    const s = new THREE.Shape();
    for (let k = 0; k < b.p.length; k += 2) { const x = b.p[k], y = -b.p[k + 1]; k ? s.lineTo(x, y) : s.moveTo(x, y); }
    const g = new THREE.ExtrudeGeometry(s, { depth: b.h, bevelEnabled: false }); g.rotateX(-Math.PI / 2);
    const ng = g.index ? g.toNonIndexed() : g; ng.computeVertexNormals();
    const P = ng.attributes.position.array, N = ng.attributes.normal.array; const d = Math.hypot(b.c[0] - BC[0], b.c[1] - BC[1]);
    for (let v = 0; v < P.length; v += 3) { pos.push(P[v], P[v + 1], P[v + 2]); nor.push(N[v], N[v + 1], N[v + 2]); bid.push(i); dist.push(d); top.push(b.h); inn.push(B_IN[i]); }
    g.dispose(); if (ng !== g) ng.dispose();
  });
  bGeo = new THREE.BufferGeometry();
  bGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  bGeo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  bGeo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(pos.length), 3));
  bGeo.setAttribute('aPrev', new THREE.Float32BufferAttribute(new Float32Array(pos.length), 3));
  bGeo.setAttribute('aDist', new THREE.Float32BufferAttribute(dist, 1));
  bGeo.setAttribute('aTop', new THREE.Float32BufferAttribute(top, 1));
  bGeo.setAttribute('aIn', new THREE.Float32BufferAttribute(inn, 1));
  bBid = new Int32Array(bid);
})();
const bMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .82 });
bMat.onBeforeCompile = (sh) => {
  Object.assign(sh.uniforms, U);
  sh.vertexShader = sh.vertexShader
    .replace('#include <common>', '#include <common>\nuniform float uGrow; uniform float uMix; uniform float uFocus; attribute float aDist; attribute float aTop; attribute float aIn; attribute vec3 aPrev; varying vec3 vWp; varying vec3 vN; varying float vTop;')
    .replace('#include <color_vertex>', `#include <color_vertex>
      vColor.rgb = mix(aPrev, color, uMix);
      vColor.rgb = mix(vColor.rgb, vec3(0.925, 0.915, 0.9) * (0.9 + 0.1 * step(0.5, normal.y)), (1.0 - aIn) * uFocus * 0.82);`)
    .replace('#include <begin_vertex>', `#include <begin_vertex>
      float gr = clamp(uGrow * 2.3 - aDist / 800.0, 0.0, 1.0); gr = 1.0 - pow(1.0 - gr, 3.0); transformed.y *= max(gr, 0.002);`)
    .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWp = (modelMatrix * vec4(transformed, 1.0)).xyz; vN = normal; vTop = aTop;');
  sh.fragmentShader = sh.fragmentShader
    .replace('#include <common>', '#include <common>\nuniform float uNight; varying vec3 vWp; varying vec3 vN; varying float vTop;\nfloat h21(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }')
    .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      if (uNight > 0.01 && abs(vN.y) < 0.5) {
        float along = abs(vN.x) > 0.5 ? vWp.z : vWp.x;
        vec2 cell = vec2(floor(along / 3.2), floor(vWp.y / 3.6)); vec2 f = vec2(fract(along / 3.2), fract(vWp.y / 3.6));
        float win = step(0.25, f.x) * step(f.x, 0.75) * step(0.32, f.y) * step(f.y, 0.75);
        float lit = step(0.48, h21(cell + floor(vWp.xz / 40.0)));
        totalEmissiveRadiance += vec3(1.0, 0.7, 0.36) * win * lit * step(vWp.y, vTop - 1.0) * uNight * 1.1;
      }`);
};
const bMesh = new THREE.Mesh(bGeo, bMat); bMesh.castShadow = true; bMesh.receiveShadow = true; scene.add(bMesh);

const rampF = (stops) => { const SS = stops.map(([t, h]) => [t, hexRGB(h)]); return (t) => { t = clamp(t); for (let i = 1; i < SS.length; i++) if (t <= SS[i][0]) { const u = (t - SS[i - 1][0]) / (SS[i][0] - SS[i - 1][0]); return SS[i - 1][1].map((v, k) => lerp(v, SS[i][1][k], u)); } return SS[SS.length - 1][1]; }; };
const RAMP = {
  akses: [[0, '#1E4FB8'], [.33, '#5C8BE6'], [.66, '#BBD0F6'], [1, '#F4F1EC']],
  panas: [[0, '#2C9C9A'], [.3, '#BFE3D6'], [.5, '#F7EBC4'], [.72, '#F29A55'], [1, '#B8241C']],
  mix: [[0, '#F4F1EC'], [.4, '#D9CCF2'], [.7, '#A27FE0'], [1, '#5A2FA8']],
  angin: [[0, '#2E6BD9'], [.25, '#3FA8B8'], [.5, '#8CC56F'], [.75, '#F5BE4C'], [1, '#DB4B33']],
  bising: [[0, '#2E7D6B'], [.3, '#A7D49B'], [.55, '#F6E27A'], [.75, '#F29A55'], [1, '#9E1F1A']],
  svf: [[0, '#2B1A4A'], [.45, '#6E4FA0'], [.75, '#C8B6EA'], [1, '#F6F2EA']],
  fas: [[0, '#F4F1EC'], [.5, '#A9DCCB'], [.8, '#3FA092'], [1, '#0F5C52']],
  rth: [[0, '#1D7A47'], [.1, '#3F9A5E'], [.3, '#B9DDA9'], [.5, '#F4E3B8'], [1, '#E58F6B']],
  surya: [[0, '#E9E4DB'], [.4, '#F7D774'], [.75, '#F2A33A'], [1, '#D2561C']],
  sos: [[0, '#FBE9CF'], [.2, '#F6C177'], [.45, '#EE8A4A'], [.65, '#D5482E'], [.85, '#9E2149'], [1, '#5B1A5E']],
};
const F = {}; for (const k in RAMP) F[k] = rampF(RAMP[k]);
const grad = (st) => `linear-gradient(90deg,${st.map(([t, c]) => `${c} ${t * 100}%`).join(',')})`;
let warnaMode = '';
function warnaiBangunan(mode) {
  if (mode === warnaMode) return; warnaMode = mode;
  const C = bGeo.attributes.color.array, Pv = bGeo.attributes.aPrev.array, N = bGeo.attributes.normal.array;
  Pv.set(C); const c = new THREE.Color(), t = new THREE.Color('#F4F1EC'), ak = new THREE.Color('#C2441F');
  let last = -1, r = 0, g = 0, b_ = 0;
  for (let v = 0, n = bBid.length; v < n; v++) {
    const i = bBid[v];
    if (i !== last) {
      last = i; const b = B[i];
      if (mode === 'fungsi') c.setRGB(...hexRGB(LU_COL[b.u] || '#bbbbbb')).lerp(t, .55);
      else if (mode === 'tinggi') { const k = clamp(Math.log(b.h / 3) / Math.log(60)); c.setRGB(lerp(.95, .76, k), lerp(.93, .27, k), lerp(.9, .12, k)); }
      else if (mode === 'surya') c.setRGB(...F.surya(b.a > 30 ? PV[i] / b.a / 130 : 0));
      else if (mode === 'putih') c.set('#F5F3EF');
      else c.set('#E6E1DA');
      if (b.n && (mode === 'fungsi' || mode === 'netral')) c.lerp(ak, .22);
      r = c.r; g = c.g; b_ = c.b;
    }
    const sh = N[v * 3 + 1] > .5 ? 1 : .9; C[v * 3] = r * sh; C[v * 3 + 1] = g * sh; C[v * 3 + 2] = b_ * sh;
  }
  bGeo.attributes.color.needsUpdate = true; bGeo.attributes.aPrev.needsUpdate = true;
  U.uMix.value = 0; anime({ targets: U.uMix, value: 1, duration: reduce ? 1 : 750, easing: 'easeInOutQuad' });
}
// sorotan
const selMat = new THREE.MeshBasicMaterial({ color: '#C2441F', transparent: true, opacity: .32 });
let selObj = null;
function sorot(i) {
  if (selObj) { scene.remove(selObj); selObj.traverse((o) => o.geometry && o.geometry.dispose()); selObj = null; }
  if (i == null) return;
  const b = B[i], s = new THREE.Shape(); for (let k = 0; k < b.p.length; k += 2) { const x = b.p[k], y = -b.p[k + 1]; k ? s.lineTo(x, y) : s.moveTo(x, y); }
  const g = new THREE.ExtrudeGeometry(s, { depth: b.h + .8, bevelEnabled: false }); g.rotateX(-Math.PI / 2);
  selObj = new THREE.Group(); const m = new THREE.Mesh(g, selMat); const l = new THREE.LineSegments(new THREE.EdgesGeometry(g, 30), new THREE.LineBasicMaterial({ color: '#C2441F', toneMapped: false }));
  selObj.add(m, l); selObj.scale.y = .01; scene.add(selObj); anime({ targets: selObj.scale, y: 1, duration: 600, easing: 'easeOutElastic(1, .7)' });
}

// =============================================================
//  Pohon (vegetasi) + skenario pohon peneduh
// =============================================================
const T = D.trees;
const crownGeo = new THREE.IcosahedronGeometry(1, 1), trunkGeo = new THREE.CylinderGeometry(.18, .25, 1, 5);
const crownMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .9, flatShading: true }), trunkMat = new THREE.MeshStandardMaterial({ color: '#8B7262', roughness: 1 });
function buatPohon(list, warna) {
  const cr = new THREE.InstancedMesh(crownGeo, crownMat, list.length), tr = new THREE.InstancedMesh(trunkGeo, trunkMat, list.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), c = new THREE.Color();
  list.forEach(([x, z, r], i) => { const h = r * 1.5; p.set(x, h, z); s.set(r, r * .85, r); m.compose(p, q, s); cr.setMatrixAt(i, m); c.setHSL(warna[0] + Math.random() * .05, warna[1], warna[2] + Math.random() * .1); cr.setColorAt(i, c); p.set(x, h * .45, z); s.set(1, h * .9, 1); m.compose(p, q, s); tr.setMatrixAt(i, m); });
  cr.castShadow = tr.castShadow = true; cr.receiveShadow = true; const g = new THREE.Group(); g.add(cr, tr); scene.add(g); return g;
}
const pohon = buatPohon(T, [.25, .32, .52]);

// =============================================================
//  MRT layang + kereta
// =============================================================
const mrtCurve = new THREE.CatmullRomCurve3([[549, -30], [548, 60], [546, 104], [541, 230], [532, 340], [523, 410], [515, 462], [508, 540], [501, 640], [496, 760]].map(([x, y]) => { const [a, b] = tm(x, y); return new THREE.Vector3(a, 11, b); }));
const MRT_L = mrtCurve.getLength();
(function () {
  const n = 160, deck = new THREE.InstancedMesh(new THREE.BoxGeometry(9.5, 1.8, 1), new THREE.MeshStandardMaterial({ color: '#D3CEC6', roughness: .8 }), n);
  const pil = new THREE.InstancedMesh(new THREE.CylinderGeometry(1.2, 1.4, 10, 8), new THREE.MeshStandardMaterial({ color: '#BDB7AE' }), Math.floor(MRT_L / 30));
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < n; i++) { const a = mrtCurve.getPointAt(i / n), b = mrtCurve.getPointAt((i + 1) / n); q.setFromAxisAngle(up, Math.atan2(b.x - a.x, b.z - a.z)); s.set(1, 1, a.distanceTo(b) + .6); m.compose(a.clone().add(b).multiplyScalar(.5), q, s); deck.setMatrixAt(i, m); }
  for (let i = 0; i < pil.count; i++) { const p = mrtCurve.getPointAt(i / pil.count); m.makeTranslation(p.x, 5, p.z); pil.setMatrixAt(i, m); }
  deck.castShadow = deck.receiveShadow = pil.castShadow = true; scene.add(deck, pil);
  for (const [x, y, len] of [[515, 462, 150], [546, 104, 140]]) {
    const [sx, sz] = tm(x, y); let bt = 0, bd = 1e9; for (let i = 0; i <= 200; i++) { const p = mrtCurve.getPointAt(i / 200); const d = (p.x - sx) ** 2 + (p.z - sz) ** 2; if (d < bd) { bd = d; bt = i / 200; } }
    const t = mrtCurve.getTangentAt(bt), g = new THREE.Group(); g.position.set(sx, 0, sz); g.rotation.y = Math.atan2(t.x, t.z);
    const mat = new THREE.MeshStandardMaterial({ color: '#E8E4DE' });
    const plat = new THREE.Mesh(new THREE.BoxGeometry(24, 2.4, len), mat); plat.position.y = 11.2;
    const roof = new THREE.Mesh(new THREE.BoxGeometry(27, 1.2, len + 6), new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: .35 })); roof.position.y = 20.5;
    plat.castShadow = roof.castShadow = true; g.add(plat, roof);
    for (const cx of [-12, 12]) for (let zz = -len / 2 + 8; zz <= len / 2 - 8; zz += 24) { const col = new THREE.Mesh(new THREE.BoxGeometry(.8, 8, .8), mat); col.position.set(cx, 16, zz); g.add(col); }
    scene.add(g);
  }
})();
const KERETA = [];
{
  const carGeo = new THREE.BoxGeometry(3, 3.6, 19.5); carGeo.translate(0, 1.8, 0);
  const carMat = new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: .35 }), stMat = new THREE.MeshStandardMaterial({ color: '#2F6BD8', emissive: '#2F6BD8', emissiveIntensity: .35 });
  const stGeo = new THREE.BoxGeometry(3.05, .5, 19.6);
  for (let d = 0; d < 2; d++) for (let k = 0; k < 2; k++) { const grp = new THREE.Group(); for (let c = 0; c < 6; c++) { const cg = new THREE.Group(); const car = new THREE.Mesh(carGeo, carMat); car.castShadow = true; const st = new THREE.Mesh(stGeo, stMat); st.position.y = 1.4; cg.add(car, st); grp.add(cg); } scene.add(grp); KERETA.push({ grp, arah: d, fase: k * .5 + d * .23 }); }
}

// =============================================================
//  Label 3D
// =============================================================
const LBL = [], lblRoot = $('#labels');
function label(html, x, y, z, kelas, grup, extra = {}) { const el = document.createElement('div'); el.className = 'lbl ' + kelas; el.innerHTML = html; lblRoot.appendChild(el); const o = { el, p: new THREE.Vector3(x, y, z), grup, ...extra }; LBL.push(o); return o; }
for (const t of D.transit) label(`<i class="pin ${t.jenis === 'MRT' ? 'mrt' : 'tj'}"></i>${t.nama}`, t.m[0], t.jenis === 'MRT' ? 18 : 4, t.m[1], 'transit', 'transit', { hp: t.jenis === 'MRT' });
B.forEach((b, i) => { if (b.n) { const o = label(`<b>${b.n}</b><span>${b.f} lantai · ±${Math.round(b.h)} m</span>`, b.c[0], b.h + 6, b.c[1], 'landmark', 'landmark', { hp: true, bid: i }); o.el.onclick = () => pilihBangunan(i, true); } });
for (const [n, x, y] of [['Taman Literasi', 548, 352], ['M Bloc Space', 548, 228], ['Little Tokyo', 585, 432], ['Taman Sepeda', 715, 578]]) { const [mx, mz] = tm(x, y); label(n, mx, 3, mz, 'tempat', 'tempat'); }
const zonaLbl = label(`Kawasan inti Blok M · ${nf(VS.luas_ha, 0)} ha`, BND[3][0] - 30, 6, BND[3][1] - 20, 'zona', 'zona', { hp: true });
const ring = new THREE.Group(); for (const r of [400, 800]) { const m = new THREE.Mesh(new THREE.RingGeometry(r - 1.6, r + 1.6, 160), new THREE.MeshBasicMaterial({ color: '#1F1F1F', transparent: true, opacity: r === 400 ? .5 : .32, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.y = .6; ring.add(m); } scene.add(ring);
label('<b>400 m</b>', 283, 2, -283, 'ring', 'ring'); label('<b>800 m</b>', 566, 2, -320, 'ring', 'ring');
const vtmp = new THREE.Vector3();
function updateLabels() {
  const w = innerWidth, h = innerHeight, hp = mqHP.matches;
  for (const o of LBL) {
    vtmp.copy(o.p); if (o.grup === 'landmark') vtmp.y *= clamp(U.uGrow.value * 1.2); vtmp.project(camera);
    const vis = !o.sembunyi && (!hp || o.hp) && vtmp.z < 1 && Math.abs(vtmp.x) < 1.05 && Math.abs(vtmp.y) < 1.05;
    o.el.style.display = vis ? '' : 'none';
    if (vis) o.el.style.transform = `translate(${(vtmp.x * .5 + .5) * w}px,${(-vtmp.y * .5 + .5) * h}px)`;
  }
}

// =============================================================
//  Matahari (NOAA) dan siang-malam
// =============================================================
const LAT = D.meta.lat, LON = D.meta.lon;
function posisiMatahari(doy, jam) {
  const g = 2 * Math.PI / 365 * (doy - 1 + (jam - 12) / 24);
  const eqt = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const tst = jam * 60 + eqt + 4 * LON - 420, ha = (tst / 4 - 180) * Math.PI / 180, la = LAT * Math.PI / 180;
  const el = Math.PI / 2 - Math.acos(clamp(Math.sin(la) * Math.sin(decl) + Math.cos(la) * Math.cos(decl) * Math.cos(ha), -1, 1));
  const az = Math.atan2(Math.sin(ha), Math.cos(ha) * Math.sin(la) - Math.tan(decl) * Math.cos(la)) + Math.PI;
  return { el, az, elDeg: el * 180 / Math.PI, azDeg: (az * 180 / Math.PI) % 360 };
}
let SUN = posisiMatahari(80, 16.5);
const suhuUdara = (h) => 25.3 + 7.6 * Math.pow(clamp(Math.sin(Math.PI * (h - 6.2) / 15.6)), 1.25) + (h > 21 ? -.4 * (h - 21) : 0);
const radiasi = (h) => clamp(Math.sin(Math.PI * (h - 6) / 12.4));
function setMatahari() {
  SUN = posisiMatahari(S.doy, S.jam); const el = Math.max(SUN.el, -.3);
  const dir = new THREE.Vector3(Math.cos(el) * Math.sin(SUN.az), Math.sin(el), -Math.cos(el) * Math.cos(SUN.az)).normalize();
  sun.position.copy(dir).multiplyScalar(2500).add(sun.target.position);
  const siang = clamp(SUN.elDeg / 25 + .15), senja = clamp(1 - Math.abs(SUN.elDeg - 4) / 10) * (SUN.elDeg > -6 ? 1 : 0);
  sun.intensity = 2.5 * clamp(SUN.elDeg / 12);
  sun.color.setRGB(1, lerp(.72, 1, clamp(SUN.elDeg / 25)), lerp(.5, .96, clamp(SUN.elDeg / 25)));
  hemi.intensity = lerp(.62, .72, siang); hemi.color.set(siang > .3 ? '#ffffff' : '#a9b8e0'); hemi.groundColor.set(siang > .3 ? '#d9d2c6' : '#3a3550');
  const bg = LANGIT.malam.clone().lerp(LANGIT.siang, siang).lerp(LANGIT.senja, senja * .45);
  scene.background.copy(bg); scene.fog.color.copy(bg); far.material.color.copy(bg).multiplyScalar(.97);
  U.uNight.value = clamp(-SUN.elDeg / 6 + .25);
  if (bloom) bloom.strength = lerp(.12, .85, U.uNight.value);
  const malam = SUN.elDeg < -2; if (document.body.classList.contains('malam') !== malam) { document.body.classList.toggle('malam', malam); tema(); }
  document.querySelector('meta[name=theme-color]').content = '#' + bg.getHexString();
}

// =============================================================
//  Peta tinggi & teduhan jalur
// =============================================================
const HC = 3, HW = Math.ceil(EW / HC), HH = Math.ceil(EH / HC);
const hmap = new Float32Array(HW * HH);
{
  const c = document.createElement('canvas'); c.width = HW; c.height = HH; const x = c.getContext('2d');
  for (const i of B.map((b, i) => i).sort((a, b) => B[a].h - B[b].h)) { const b = B[i]; x.fillStyle = `rgb(${Math.min(255, Math.round(b.h))},0,0)`; x.beginPath(); for (let k = 0; k < b.p.length; k += 2) { const px = (b.p[k] - EXT[0]) / HC, pz = (b.p[k + 1] - EXT[1]) / HC; k ? x.lineTo(px, pz) : x.moveTo(px, pz); } x.fill(); }
  const d = x.getImageData(0, 0, HW, HH).data; for (let i = 0; i < HW * HH; i++) hmap[i] = d[i * 4];
}
function tanamDiPeta(list, map) { for (const [tx, tz, r] of list) { const cx = Math.round((tx - EXT[0]) / HC), cz = Math.round((tz - EXT[1]) / HC), rr = Math.ceil(r / HC); for (let j = -rr; j <= rr; j++) for (let i = -rr; i <= rr; i++) { if (i * i + j * j > rr * rr) continue; const k = (cz + j) * HW + cx + i; if (k >= 0 && k < map.length) map[k] = Math.max(map[k], r * 1.6); } } }
tanamDiPeta(T, hmap);
const JALAN = []; for (let i = 0; i < GW * GH; i++) if (GR.lu[i] === 1 && GR.dalam[i]) JALAN.push(cellXZ(i));
// skenario: pohon peneduh di tepi jalur dalam kawasan inti yang belum teduh
const POHON_BARU = (() => {
  const out = [], ada = (x, z) => { const i = Math.floor((x - EXT[0]) / HC), j = Math.floor((z - EXT[1]) / HC); return hmap[j * HW + i] > 2; };
  for (const [x, z] of JALAN) {
    if (ada(x, z)) continue;
    let dekat = false; for (const [ox, oz] of out) if ((ox - x) ** 2 + (oz - z) ** 2 < 11 * 11) { dekat = true; break; } if (dekat) continue;
    let tepi = false; for (const [dx, dz] of [[6, 0], [-6, 0], [0, 6], [0, -6]]) { const i = cellOf(x + dx, z + dz); if (i >= 0 && GR.lu[i] !== 1) tepi = true; } if (!tepi) continue;
    out.push([x + (Math.random() - .5) * 2, z + (Math.random() - .5) * 2, 3.6 + Math.random()]);
  }
  return out;
})();
const hmapSken = hmap.slice(); tanamDiPeta(POHON_BARU, hmapSken);
const pohonBaru = buatPohon(POHON_BARU, [.3, .45, .45]); pohonBaru.visible = false; pohonBaru.scale.y = .01;
function persenTeduh(doy, jam, map = hmap) {
  const s = posisiMatahari(doy, jam); if (s.elDeg <= 0) return null;
  const tanE = Math.tan(s.el), sx = Math.sin(s.az), sz = -Math.cos(s.az); let t = 0;
  for (const [x, z] of JALAN) {
    for (let d = 3; d < 900; d += 3) { const i = Math.floor((x + sx * d - EXT[0]) / HC), j = Math.floor((z + sz * d - EXT[1]) / HC); if (i < 0 || j < 0 || i >= HW || j >= HH) break; const need = d * tanE + 1.5; if (need > 175) break; if (map[j * HW + i] > need) { t++; break; } }
  }
  return 100 * t / JALAN.length;
}
const teduhCache = {};
function kurvaTeduh(doy, map, key) { const k = doy + key; if (!teduhCache[k]) { teduhCache[k] = []; for (let h = 6; h <= 18; h += .5) teduhCache[k].push([h, persenTeduh(doy, h, map)]); } return teduhCache[k]; }

// =============================================================
//  Angin (medan LBM steady + partikel)
// =============================================================
const WD = D.wind, WNX = WD.nx, WNY = WD.ny, WCS = WD.cs;
const WF = {}; for (const k in WD.dirs) WF[k] = { u: dec8(WD.dirs[k].u), v: dec8(WD.dirs[k].v) };
const WSOL = (() => { const p = dec(WD.solid); const a = new Uint8Array(WNX * WNY); for (let i = 0; i < a.length; i++) a[i] = (p[i >> 3] >> (7 - (i & 7))) & 1; return a; })();
function anginDi(x, z, f) {
  const gx = (x - EXT[0]) / WCS - .5, gz = (z - EXT[1]) / WCS - .5, i = Math.floor(gx), j = Math.floor(gz);
  if (i < 0 || j < 0 || i >= WNX - 1 || j >= WNY - 1) return null; const fx = gx - i, fz = gz - j, k = j * WNX + i, s = WD.scale;
  return [((f.u[k] * (1 - fx) + f.u[k + 1] * fx) * (1 - fz) + (f.u[k + WNX] * (1 - fx) + f.u[k + WNX + 1] * fx) * fz) / s, ((f.v[k] * (1 - fx) + f.v[k + 1] * fx) * (1 - fz) + (f.v[k + WNX] * (1 - fx) + f.v[k + WNX + 1] * fx) * fz) / s, WSOL[k]];
}
const ARAH = { B: 'Barat · monsun barat (Des sampai Mar)', BL: 'Barat laut · peralihan (Okt sampai Nov)', U: 'Utara · angin laut siang', T: 'Timur · monsun timur (Jun sampai Agu)', TG: 'Tenggara · kemarau (Agu sampai Sep)' };
const NP = LITE ? 4000 : 9000, TRAIL = 10;
const pPos = new Float32Array(NP * 2), pAge = new Float32Array(NP), pHist = new Float32Array(NP * TRAIL * 2);
const wGeo = new THREE.BufferGeometry(), wPos = new Float32Array(NP * (TRAIL - 1) * 6), wCol = new Float32Array(NP * (TRAIL - 1) * 8);
wGeo.setAttribute('position', new THREE.BufferAttribute(wPos, 3)); wGeo.setAttribute('color', new THREE.BufferAttribute(wCol, 4));
const wLines = new THREE.LineSegments(wGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, toneMapped: false }));
wLines.frustumCulled = false; wLines.visible = false; wLines.renderOrder = 5; scene.add(wLines);
const hGeo = new THREE.BufferGeometry(), hPos = new Float32Array(NP * 3), hCol = new Float32Array(NP * 3);
hGeo.setAttribute('position', new THREE.BufferAttribute(hPos, 3)); hGeo.setAttribute('color', new THREE.BufferAttribute(hCol, 3));
wLines.add(Object.assign(new THREE.Points(hGeo, new THREE.PointsMaterial({ size: 3.2, vertexColors: true, transparent: true, depthWrite: false, toneMapped: false })), { frustumCulled: false }));
function respawn(i) { let x, z; for (let t = 0; t < 20; t++) { x = BC[0] + (Math.random() - .5) * 1500; z = BC[1] + (Math.random() - .5) * 1000; const w = anginDi(x, z, WF[S.arah]); if (w && !w[2]) break; } pPos[i * 2] = x; pPos[i * 2 + 1] = z; pAge[i] = Math.random() * 120; for (let k = 0; k < TRAIL; k++) { pHist[(i * TRAIL + k) * 2] = x; pHist[(i * TRAIL + k) * 2 + 1] = z; } }
for (let i = 0; i < NP; i++) respawn(i);
function langkahAngin(dt) {
  const f = WF[S.arah], Ur = S.uref * .78, sp = dt * 95; let p = 0, c = 0;
  for (let i = 0; i < NP; i++) {
    let x = pPos[i * 2], z = pPos[i * 2 + 1]; const w = anginDi(x, z, f);
    if (!w || w[2] || (pAge[i] -= dt * 10) < 0) { respawn(i); continue; }
    const ms = Math.hypot(w[0], w[1]) * Ur; x += w[0] * Ur * sp; z += w[1] * Ur * sp; pPos[i * 2] = x; pPos[i * 2 + 1] = z;
    const b = i * TRAIL * 2; pHist.copyWithin(b + 2, b, b + (TRAIL - 1) * 2); pHist[b] = x; pHist[b + 1] = z;
    const col = F.angin(ms / 4), y = 2.2 + (i % 7) * .9;
    hPos[i * 3] = x; hPos[i * 3 + 1] = y; hPos[i * 3 + 2] = z; hCol[i * 3] = col[0]; hCol[i * 3 + 1] = col[1]; hCol[i * 3 + 2] = col[2];
    for (let k = 0; k < TRAIL - 1; k++) {
      wPos[p++] = pHist[b + k * 2]; wPos[p++] = y; wPos[p++] = pHist[b + k * 2 + 1]; wPos[p++] = pHist[b + k * 2 + 2]; wPos[p++] = y; wPos[p++] = pHist[b + k * 2 + 3];
      const a0 = (1 - k / (TRAIL - 1)) * .9, a1 = (1 - (k + 1) / (TRAIL - 1)) * .9;
      wCol[c++] = col[0]; wCol[c++] = col[1]; wCol[c++] = col[2]; wCol[c++] = a0; wCol[c++] = col[0]; wCol[c++] = col[1]; wCol[c++] = col[2]; wCol[c++] = a1;
    }
  }
  wGeo.setDrawRange(0, p / 3); wGeo.attributes.position.needsUpdate = wGeo.attributes.color.needsUpdate = hGeo.attributes.position.needsUpdate = hGeo.attributes.color.needsUpdate = true;
}
const statAnginCache = {};
function statAngin(arah = S.arah) {
  const k = arah + S.uref; if (statAnginCache[k]) return statAnginCache[k];
  const f = WF[arah], Ur = S.uref * .78; let n = 0, st = 0, ny = 0, kc = 0, sum = 0;
  for (const [x, z] of JALAN) { const w = anginDi(x, z, f); if (!w || w[2]) continue; const ms = Math.hypot(w[0], w[1]) * Ur; n++; sum += ms; if (ms < .3) st++; else if (ms < 4) ny++; else kc++; }
  return statAnginCache[k] = { rata: sum / n, stag: 100 * st / n, nyaman: 100 * ny / n, kencang: 100 * kc / n };
}
SK.angin = Math.round(statAngin('B').nyaman);

// =============================================================
//  Heatmap sosial (kolom heksagon)
// =============================================================
const g2 = (h, m, s) => Math.exp(-(((h - m + 36) % 24 - 12) ** 2) / (2 * s * s));
const PROFIL = {
  kuliner: (h) => .03 + .9 * g2(h, 12.5, 1.3) + g2(h, 19.3, 1.9) + .35 * g2(h, 16, 1.5) + .25 * g2(h, 22.5, 1.2),
  belanja: (h) => .02 + .8 * g2(h, 13, 1.8) + g2(h, 17.5, 2.2), akomodasi: (h) => .25 + .3 * g2(h, 8, 2) + .4 * g2(h, 20, 2.5),
  jasa: (h) => .02 + g2(h, 10, 1.8) + .7 * g2(h, 14, 1.6), kesehatan: (h) => .05 + .9 * g2(h, 10, 2) + .7 * g2(h, 18, 2),
  ibadah: (h) => .05 + .5 * g2(h, 4.7, .5) + g2(h, 12, .6) + .6 * g2(h, 15.2, .5) + .9 * g2(h, 18, .5) + .7 * g2(h, 19.2, .5),
  mrt: (h) => .05 * (h >= 5 ? 1 : 0) + .9 * g2(h, 7.6, 1) + .45 * g2(h, 12.5, 2.5) + g2(h, 17.8, 1.2) + .4 * g2(h, 20.5, 1.5),
  hub: (h) => .02 + .5 * g2(h, 12.5, 1.6) + .9 * g2(h, 17.5, 1.8) + g2(h, 20, 2),
};
const PN = {}; for (const k in PROFIL) { let s = 0; for (let h = 0; h < 24; h++) s += PROFIL[k](h); PN[k] = (h) => PROFIL[k](h) / s; }
const KAT = D.poi_cat, BOBOT = { kuliner: 1.6, belanja: 1.2, akomodasi: .45, jasa: .7, kesehatan: .5, ibadah: .6 };
const ANCHOR = [
  { n: 'Stasiun MRT Blok M BCA', xy: [515, 462], v: 17858, p: 'mrt', src: 'PT MRT Jakarta, Des 2025: 553.599 pelanggan/bulan' },
  { n: 'Blok M Hub', xy: [600, 375], v: 25000, p: 'hub', src: 'Katadata 2026: rata-rata 25.000 kunjungan/hari' },
  { n: 'M Bloc Space', xy: [548, 228], v: 6000, p: 'hub', src: 'Latip dkk. 2024' },
  { n: 'Taman Literasi', xy: [548, 352], v: 400, p: 'hub', src: 'Ramadhan dkk. 2025' },
];
const TOTAL_KAWASAN = 80000, sumA = ANCHOR.reduce((s, a) => s + a.v, 0), sumW = D.poi.reduce((s, p) => s + BOBOT[KAT[p[2]]], 0);
const SUMBER = D.poi.map((p) => [p[0], p[1], (TOTAL_KAWASAN - sumA) * BOBOT[KAT[p[2]]] / sumW, KAT[p[2]]]).concat(ANCHOR.map((a) => [...tm(...a.xy), a.v, a.p]));
const totalJam = (h) => SUMBER.reduce((s, [, , v, p]) => s + v * PN[p](h), 0);
const HR = 26, HEX = [];
{ const dx = HR * Math.sqrt(3), dz = HR * 1.5; let row = 0; for (let z = EXT[1] + HR; z < EXT[3]; z += dz, row++) for (let x = EXT[0] + HR + (row % 2 ? dx / 2 : 0); x < EXT[2]; x += dx) HEX.push({ x, z, v: new Float32Array(24) }); }
for (const [x, z, harian, prof] of SUMBER) { const ws = []; let tot = 0; for (const hx of HEX) { const d2 = (hx.x - x) ** 2 + (hx.z - z) ** 2; if (d2 > (HR * 3.2) ** 2) continue; const w = Math.exp(-d2 / (2 * (HR * 1.1) ** 2)); ws.push([hx, w]); tot += w; } for (const [hx, w] of ws) for (let h = 0; h < 24; h++) hx.v[h] += harian * PN[prof](h) * w / tot; }
const HEXA = HEX.filter((h) => h.v.reduce((a, b) => a + b, 0) > 40);
const hexGeo = new THREE.CylinderGeometry(HR * .93, HR * .93, 1, 6); hexGeo.translate(0, .5, 0); hexGeo.rotateY(Math.PI / 6);
const hexMat = new THREE.MeshStandardMaterial({ roughness: .5, transparent: true, opacity: .93 });
hexMat.onBeforeCompile = (sh) => { sh.uniforms.uNight = U.uNight; sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uNight;').replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n#ifdef USE_COLOR\ntotalEmissiveRadiance += vColor.rgb * (0.15 + 0.75 * uNight);\n#endif'); };
const hexMesh = new THREE.InstancedMesh(hexGeo, hexMat, HEXA.length); hexMesh.visible = false; scene.add(hexMesh);
const hexMax = Math.max(...HEXA.map((h) => Math.max(...h.v))), hexNow = new Float32Array(HEXA.length);
let sosGrow = 0;
function updateHex() {
  const h0 = Math.floor(S.jam) % 24, h1 = (h0 + 1) % 24, f = S.jam % 1, m = new THREE.Matrix4(), c = new THREE.Color();
  HEXA.forEach((hx, i) => { const v = lerp(hx.v[h0], hx.v[h1], f); hexNow[i] = v; const t = Math.sqrt(v / hexMax); m.makeScale(1, Math.max(.6, t * 480 * sosGrow), 1); m.setPosition(hx.x, 0, hx.z); hexMesh.setMatrixAt(i, m); c.setRGB(...F.sos(t)); hexMesh.setColorAt(i, c); });
  hexMesh.instanceMatrix.needsUpdate = true; if (hexMesh.instanceColor) hexMesh.instanceColor.needsUpdate = true;
}

// =============================================================
//  Pejalan kaki
// =============================================================
const PATHS = D.paths.map((p) => { const pts = p.p, cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); return { pts, cum, L: cum[cum.length - 1] }; }).filter((p) => p.L > 30);
const NA = LITE ? 450 : 900, agGeo = new THREE.BufferGeometry(), agPos = new Float32Array(NA * 3); agGeo.setAttribute('position', new THREE.BufferAttribute(agPos, 3));
const dotTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, '#fff'); g.addColorStop(.35, 'rgba(255,255,255,.9)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
const agMat = new THREE.PointsMaterial({ size: 5.5, map: dotTex, color: '#C2441F', transparent: true, depthWrite: false, toneMapped: false });
const agents = new THREE.Points(agGeo, agMat); agents.frustumCulled = false; agents.renderOrder = 6; scene.add(agents);
const AG = Array.from({ length: NA }, () => ({ p: PATHS[(Math.random() * PATHS.length) | 0], d: Math.random() * 300, v: 1.1 + Math.random() * .5, back: Math.random() < .4 }));
const tjPuncak = totalJam(19);
function langkahAgen(dt) {
  const aktif = Math.round(NA * clamp(totalJam(Math.floor(S.jam) % 24) / tjPuncak) * .95 + 25); let k = 0;
  AG.forEach((a, i) => {
    if (i >= aktif) { agPos[k++] = 0; agPos[k++] = -50; agPos[k++] = 0; return; }
    a.d += a.v * dt * 22; if (a.d > a.p.L) { a.p = PATHS[(Math.random() * PATHS.length) | 0]; a.d = 0; a.back = Math.random() < (S.jam > 19 ? .6 : .35); }
    const { pts, cum, L } = a.p, d = a.back ? L - a.d : a.d; let j = 1; while (j < cum.length - 1 && cum[j] < d) j++; const u = (d - cum[j - 1]) / (cum[j] - cum[j - 1] || 1);
    agPos[k++] = lerp(pts[j - 1][0], pts[j][0], u); agPos[k++] = 1.6; agPos[k++] = lerp(pts[j - 1][1], pts[j][1], u);
  });
  agGeo.attributes.position.needsUpdate = true;
}

// =============================================================
//  Selubung intensitas (KLB izin) per blok
// =============================================================
const BLOK = V.blok;
const selubung = new THREE.Group(); selubung.visible = false; scene.add(selubung);
const envMat = new THREE.MeshStandardMaterial({ color: '#C2441F', transparent: true, opacity: .2, depthWrite: false, roughness: .4, emissive: '#C2441F', emissiveIntensity: .15 });
const envLine = new THREE.LineBasicMaterial({ color: '#C2441F', transparent: true, opacity: .8, toneMapped: false });
BLOK.forEach((bl, k) => {
  const cx = avg(bl.p.filter((_, i) => i % 2 === 0)), cz = avg(bl.p.filter((_, i) => i % 2 === 1)), sc = Math.sqrt(bl.kdb);
  const s = new THREE.Shape(); for (let i = 0; i < bl.p.length; i += 2) { const x = cx + (bl.p[i] - cx) * sc, y = -(cz + (bl.p[i + 1] - cz) * sc); i ? s.lineTo(x, y) : s.moveTo(x, y); }
  const g = new THREE.ExtrudeGeometry(s, { depth: bl.h, bevelEnabled: false }); g.rotateX(-Math.PI / 2);
  const grp = new THREE.Group(); grp.add(new THREE.Mesh(g, envMat), new THREE.LineSegments(new THREE.EdgesGeometry(g, 25), envLine)); grp.userData = { k, cx, cz }; grp.scale.y = .001; selubung.add(grp);
});
function setPemanfaatan(pct) {
  S.klbPakai = pct;
  selubung.children.forEach((g) => anime({ targets: g.scale, y: Math.max(.001, pct / 100), duration: 700, easing: 'easeOutCubic' }));
}

// =============================================================
//  Lapisan tanah per lensa
// =============================================================
let isoR = 0, isoT0 = 0;
function gambarOverlay() {
  const d = oimg.data, n = GW * GH, L = LENSA[S.lapis].overlay === 'variety' ? S.varMode : LENSA[S.lapis].overlay, rad = radiasi(S.jam), Ur = S.uref * .78, f = WF[S.arah];
  for (let i = 0; i < n; i++) {
    let c = null, a = 0; const lu = GR.lu[i];
    switch (L) {
      case 'akses': { const m = val.akses(i); c = F.akses(Math.floor(m / 2.5) * 2.5 / 15 + .04); a = .72; break; }
      case 'walk': { const iso = val.iso(i); if (iso <= isoR) { c = iso <= 400 ? [.13, .5, .34] : [.49, .77, .61]; a = .68; if (isoR - iso < 10) { c = [.05, .31, .19]; a = 1; } } else { c = [.6, .58, .55]; a = .22; } break; }
      case 'lu': if (LU_COL[lu]) { c = hexRGB(LU_COL[lu]); a = .55; } break;
      case 'mix': c = F.mix(val.mix(i)); a = .75; break;
      case 'termal': { const h = val.panas(i); c = F.panas(h * (.25 + .75 * rad) + (1 - rad) * .12); a = .72; break; }
      case 'angin': { const [x, z] = cellXZ(i); const w = anginDi(x, z, f); if (w && !w[2]) { c = F.angin(Math.hypot(w[0], w[1]) * Ur / 4); a = .5; } break; }
      case 'bising': { const v = val.bising(i); if (v === v) { c = F.bising((v - 45) / 35); a = .78; } break; }
      case 'svf': { const v = val.svf(i); if (v === v) { c = F.svf(v); a = .78; } break; }
      case 'fas': c = F.fas(val.fas(i) / 8); a = .72; break;
      case 'rth': { const v = val.rth(i); if (v === v) { c = F.rth(v / 600); a = .72; } if (lu === 6) { c = [.12, .48, .28]; a = .85; } break; }
    }
    const j = i * 4;
    if (c) { const fade = S.fokus && !GR.dalam[i] ? .35 : 1; d[j] = c[0] * 255; d[j + 1] = c[1] * 255; d[j + 2] = c[2] * 255; d[j + 3] = a * 255 * fade; } else d[j + 3] = 0;
  }
  octx.putImageData(oimg, 0, 0); ovTex.needsUpdate = true;
}
function nilaiProbe(i) {
  const L = S.lapis, lu = GR.lu[i], fungsi = LU_NAMA[lu] || 'Jalan';
  const zona = GR.dalam[i] ? 'kawasan inti' : 'luar kawasan inti';
  const head = `<span class="tg">${fungsi} · ${zona}</span><br>`;
  switch (L) {
    case 'akses': return head + `<b>${nf(val.akses(i), 1)} menit</b> jalan ke transit`;
    case 'walk': return head + `<b>${nf(val.iso(i), 0)} m</b> jalan dari MRT Blok M · skor ${nf(val.walk(i), 0)}`;
    case 'variety': return head + `Indeks campuran <b>${nf(val.mix(i), 2)}</b>`;
    case 'termal': { const h = val.panas(i); return head + `Indeks panas <b>${nf(h * 100, 0)}/100</b> · rasa ≈${nf(suhuUdara(S.jam) + radiasi(S.jam) * (h * 9 - 1.5), 1)} °C`; }
    case 'angin': { const [x, z] = cellXZ(i); const w = anginDi(x, z, WF[S.arah]); return head + (w && !w[2] ? `<b>${nf(Math.hypot(w[0], w[1]) * S.uref * .78, 2)} m/s</b> di level pejalan` : 'Di dalam bangunan'); }
    case 'bising': { const v = val.bising(i); return head + (v === v ? `<b>≈${nf(v, 0)} dB(A)</b> siang · baku ${lu === 3 ? 55 : 70}` : 'Di dalam bangunan'); }
    case 'svf': { const v = val.svf(i); return head + (v === v ? `SVF <b>${nf(v, 2)}</b> (${v < .5 ? 'ngarai jalan' : v < .75 ? 'cukup terbuka' : 'terbuka'})` : 'Di dalam bangunan'); }
    case 'fasilitas': return head + `<b>${val.fas(i)} dari ${VS.n_kat}</b> jenis fasilitas ≤10 menit`;
    case 'rth': { const v = val.rth(i); return head + `<b>${nf(v, 0)} m</b> jalan ke ruang hijau ${v <= 300 ? '✓' : '(> 300 m)'}`; }
    default: return head + `${nf(val.akses(i), 1)} mnt ke transit · bising ≈${nf(val.bising(i) || 0, 0)} dB`;
  }
}

// =============================================================
//  Konfigurasi lensa
// =============================================================
const IK = {
  ringkasan: '<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>',
  akses: '<rect x="6" y="3" width="12" height="14" rx="3"/><path d="M6 11h12M9 21l1.5-4M15 21l-1.5-4"/><circle cx="9" cy="14" r=".6"/><circle cx="15" cy="14" r=".6"/>',
  walk: '<circle cx="13" cy="4" r="1.6"/><path d="M10 21l2-6-3-3 1.5-5 3.5 3 3 1M8 10l2-3"/>',
  variety: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  termal: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/>',
  angin: '<path d="M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h8"/>',
  sosial: '<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.4"/><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6M15 14.5c3 0 6 2 6 5"/>',
  bising: '<path d="M4 9v6h4l5 4V5L8 9zM16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>',
  svf: '<path d="M3 20V10l4-2v12M10 20V5l4-2v17M17 20v-8l4-2v10M2 20h20"/>',
  fasilitas: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  rth: '<path d="M12 22v-6M7 16h10l-5-13z"/>',
  surya: '<path d="M3 18l3-10h12l3 10zM5 13h14M10 8l-1 10M14 8l1 10M12 2v3"/>',
  intensitas: '<path d="M4 21V9l5-3v15M9 21V3l6 3v15M15 21v-9l5 2v7M2 21h20"/>',
};
const LENSA = {
  ringkasan: { nama: 'Ringkasan', sub: 'skor kelayakan', warna: '#C2441F', grup: 'utama', bangunan: 'fungsi', overlay: null, agen: true, skor: () => SK.total },
  akses: { nama: 'Aksesibilitas', sub: 'menit ke transit', warna: '#2F6BD8', grup: 'utama', bangunan: 'netral', overlay: 'akses', agen: true, skor: () => SK.akses },
  walk: { nama: 'Walkability', sub: 'pedshed 400/800 m', warna: '#2E9A6A', grup: 'utama', bangunan: 'netral', overlay: 'walk', agen: true, skor: () => SK.walk },
  variety: { nama: 'Variety function', sub: 'campuran guna lahan', warna: '#7C4DCC', grup: 'utama', bangunan: 'fungsi', overlay: 'variety', agen: false, skor: () => SK.variety },
  termal: { nama: 'Termal & bayangan', sub: 'matahari aktual', warna: '#E4572E', grup: 'utama', bangunan: 'putih', overlay: 'termal', agen: false, skor: () => SK.termal },
  angin: { nama: 'Angin', sub: 'CFD Lattice-Boltzmann', warna: '#2E8FB8', grup: 'iklim', bangunan: 'putih', overlay: 'angin', agen: false, skor: () => SK.angin },
  bising: { nama: 'Kebisingan', sub: 'estimasi lalu lintas', warna: '#B23A48', grup: 'iklim', bangunan: 'netral', overlay: 'bising', agen: false, skor: () => SK.akustik },
  svf: { nama: 'Keterbukaan langit', sub: 'sky view factor', warna: '#6E4FA0', grup: 'iklim', bangunan: 'putih', overlay: 'svf', agen: false, skor: () => Math.round(VS.svf_rata * 100) },
  sosial: { nama: 'Heatmap sosial', sub: 'kunjungan per jam', warna: '#9E2149', grup: 'kota', bangunan: 'netral', overlay: null, agen: true, skor: () => '80k' },
  fasilitas: { nama: 'Kota 10 menit', sub: 'kelengkapan fasilitas', warna: '#13806E', grup: 'kota', bangunan: 'netral', overlay: 'fas', agen: true, skor: () => SK.fasilitas },
  rth: { nama: 'Ruang hijau 300 m', sub: 'akses taman', warna: '#3F9A5E', grup: 'kota', bangunan: 'netral', overlay: 'rth', agen: false, skor: () => SK.rth },
  surya: { nama: 'PLTS atap', sub: 'potensi energi surya', warna: '#E0941F', grup: 'kembang', bangunan: 'surya', overlay: null, agen: false, skor: () => nf(VS.pv_mwh / 1000, 1) + 'G' },
  intensitas: { nama: 'Potensi pengembangan', sub: 'selubung KLB izin', warna: '#C2441F', grup: 'kembang', bangunan: 'tinggi', overlay: null, agen: false, skor: () => SK.tumbuh + '%' },
};
const GRUP = { utama: 'Parameter utama', iklim: 'Iklim mikro & lingkungan', kota: 'Kehidupan kota', kembang: 'Pengembangan & energi' };

// =============================================================
//  ECharts
// =============================================================
const charts = [];
function tema() { charts.forEach((c) => { const o = c.getOption && c.__opt; if (o) c.setOption(gayaChart(o), true); }); }
function warnaTeks() { return document.body.classList.contains('malam') ? '#D8D2C8' : '#46423D'; }
function gayaChart(opt) {
  const t = warnaTeks(), g = document.body.classList.contains('malam') ? 'rgba(255,255,255,.08)' : '#EEEAE4';
  const ax = (a) => a && [].concat(a).map((x) => ({ axisLine: { lineStyle: { color: g } }, axisTick: { show: false }, splitLine: { lineStyle: { color: g } }, axisLabel: { color: t, fontFamily: 'Nunito', fontWeight: 700, fontSize: 10.5 }, nameTextStyle: { color: t, fontFamily: 'Nunito', fontWeight: 800, fontSize: 10.5 }, ...x }));
  return { animationDuration: 900, animationEasing: 'cubicOut', textStyle: { fontFamily: 'Nunito' }, tooltip: { trigger: 'axis', backgroundColor: '#1F1F1F', borderWidth: 0, textStyle: { color: '#fff', fontFamily: 'Nunito', fontWeight: 700, fontSize: 12 }, ...(opt.tooltip || {}) }, ...opt, xAxis: ax(opt.xAxis), yAxis: ax(opt.yAxis), grid: { left: 8, right: 14, top: 22, bottom: 6, containLabel: true, ...(opt.grid || {}) } };
}
function buatChart(el, opt, onClick) {
  const c = echarts.init(el, null, { renderer: 'canvas' }); c.__opt = opt; c.setOption(gayaChart(opt)); if (onClick) c.on('click', onClick); charts.push(c); return c;
}
function bersihChart() { while (charts.length) charts.pop().dispose(); }

// =============================================================
//  Panel per lensa
// =============================================================
const kpi = (n, lbl, suf = '', d = 0, st = '') => `<div class="kpi ${st}"><b><span data-n="${typeof n === 'number' ? n : ''}" data-d="${d}">${typeof n === 'number' ? '0' : n}</span><small>${suf}</small></b><span>${lbl}</span></div>`;
const chartBox = (id, judul, ket = '') => `<div class="chart-box"><h3>${judul}<span>${ket}</span></h3><div class="chart" id="${id}"></div></div>`;
const temuan = (list) => `<ul class="temuan">${list.map(([t, s]) => `<li><i class="${t === 'r' ? 'rk' : ''}">${t === 'r' ? '→' : '!'}</i><span>${s}</span></li>`).join('')}</ul>`;
const head = (id, judul, lede) => `<span class="eyebrow"><i></i>${LENSA[id].nama} · kawasan inti</span><h2>${judul}</h2><p class="lede">${lede}</p>`;
const LU_C = ['#C99A1E', '#D9573A', '#3E7FD0', '#3F9A5E', '#9A6BB8'];
const PANEL = {
  ringkasan() {
    const [k, w] = kategori(SK.total);
    return { html: `${head('ringkasan', `Skor ${SK.total}: ${k.toLowerCase()}`, `Kawasan inti Blok M (${nf(VS.luas_ha, 0)} ha, ${VS.n_bangunan} bangunan) unggul di <b>akses transit</b> dan <b>kelengkapan fasilitas</b>. Pengalaman berjalan dan <b>kenyamanan termal</b> masih menahan kelayakan.`)}
      <div class="kpi-grid">${kpi(SK.total, 'skor kelayakan (bobot AHP 4 parameter)', '/100')}${kpi(VS.gfa_eks / 1000, 'ribu m² luas lantai eksisting (estimasi)')}${kpi(80000, 'pengunjung kawasan per hari')}${kpi(VS.klb_eks, 'KLB rata-rata eksisting kawasan', '', 2)}</div>
      ${chartBox('c1', 'Profil kelayakan kawasan inti', '0 sampai 100')}
      ${temuan([['!', '<b>Termal</b> paling lemah: hanya 13 sampai 25% jalur berpeneduh (standar 75%).'], ['!', '<b>Akustik</b>: ' + nf(VS.fasad_lewat, 0) + '% fasad bangunan melewati baku mutu kebisingan.'], ['r', '<b>Ruang tumbuh</b> ' + nf(VS.blok_sisa / 1000, 0) + ' ribu m² sesuai KLB izin: peluang hunian vertikal TOD.'], ['r', 'Prioritas AHP: koneksi transit ke bangunan, jalur sepeda, peneduh jalur.']])}
      <p class="sumber">Skor 4 parameter utama memakai bobot AHP (Gifarry dkk., 2022). Sumbu lain adalah indikator pendukung. Klik sumbu di grafik untuk membuka lensanya.</p>`,
      charts: () => buatChart($('#c1'), { tooltip: { trigger: 'item' }, radar: { radius: '66%', center: ['50%', '54%'], indicator: [['Aksesibilitas', SK.akses], ['Walkability', SK.walk], ['Variety', SK.variety], ['Termal', SK.termal], ['Angin', SK.angin], ['Akustik', SK.akustik], ['Fasilitas', SK.fasilitas], ['Ruang hijau', SK.rth], ['Ruang tumbuh', SK.tumbuh]].map(([n]) => ({ name: n, max: 100 })), axisName: { color: warnaTeks(), fontFamily: 'Nunito', fontWeight: 800, fontSize: 10.5 }, splitArea: { areaStyle: { color: ['rgba(194,68,31,.02)', 'rgba(194,68,31,.05)'] } }, splitLine: { lineStyle: { color: '#E6E1DA' } }, axisLine: { lineStyle: { color: '#E6E1DA' } }, triggerEvent: true },
        series: [{ type: 'radar', symbolSize: 6, lineStyle: { width: 2, color: '#C2441F' }, itemStyle: { color: '#C2441F' }, areaStyle: { color: 'rgba(194,68,31,.18)' }, data: [{ name: 'Kawasan inti', value: [SK.akses, SK.walk, SK.variety, SK.termal, SK.angin, SK.akustik, SK.fasilitas, SK.rth, SK.tumbuh] }] }] },
        (e) => { const map = { Aksesibilitas: 'akses', Walkability: 'walk', Variety: 'variety', Termal: 'termal', Angin: 'angin', Akustik: 'bising', Fasilitas: 'fasilitas', 'Ruang hijau': 'rth', 'Ruang tumbuh': 'intensitas' }; const n = e.name || (e.targetType === 'axisName' && e.name); if (map[n]) location.hash = map[n]; }),
    };
  },
  akses() {
    return { html: `${head('akses', 'Simpul transit terpadat Jakarta Selatan', `<b>${nf(VS.akses5, 0)}%</b> kawasan inti cukup ≤5 menit jalan kaki ke MRT, terminal, atau halte TransJakarta; ${nf(VS.akses10, 0)}% ≤10 menit.`)}
      <div class="kpi-grid">${kpi(VS.akses_rata, 'rata-rata menit jalan ke transit', ' mnt', 1)}${kpi(VS.akses5, 'area ≤5 menit', '%', 0, 'status-ok')}${kpi(553599, 'pelanggan MRT Blok M BCA, Des 2025')}${kpi(2, 'peringkat stasiun MRT terpadat')}</div>
      ${chartBox('c1', 'Sebaran waktu jalan ke transit', 'porsi area, menit')}
      ${temuan([['!', 'Moda harian Jakarta masih didominasi motor (68,3%); angkutan umum 18,45%.'], ['r', 'Skybridge Terminal sampai Stasiun MRT (revitalisasi 2025) memangkas jalan memutar di sisi timur.']])}
      <p class="sumber">Jarak jaringan jalan (Dijkstra), 80 m/menit. Ridership: PT MRT Jakarta via Media Asuransi (2026); moda: DPRD DKI dalam Manurung (2025).</p>`,
      charts: () => { const h = VS.akses_hist, t = h.reduce((a, b) => a + b, 0); return buatChart($('#c1'), { xAxis: { type: 'category', data: h.map((_, i) => String(i + 1)), name: 'menit' }, yAxis: { type: 'value', axisLabel: { formatter: '{value}%' } }, series: [{ type: 'bar', data: h.map((v, i) => ({ value: +(100 * v / t).toFixed(1), itemStyle: { color: i < 5 ? '#2F6BD8' : i < 10 ? '#8FB0EE' : '#D5DDF0', borderRadius: [4, 4, 0, 0] } })), barCategoryGap: '18%', markLine: { symbol: 'none', label: { formatter: '{b}', color: warnaTeks(), fontWeight: 800 }, lineStyle: { color: '#1F1F1F', type: 'dashed' }, data: [{ xAxis: '5', name: '5 mnt' }, { xAxis: '10', name: '10 mnt' }] } }] }); },
    };
  },
  walk() {
    const p4 = ST.pedshed['400'], p8 = ST.pedshed['800'], t = LIT.tod;
    return { html: `${head('walk', 'Jaringan rapat, jalurnya belum ramah', `Dari MRT Blok M, jaringan jalan menjangkau <b>${nf(p4.rasio, 0)}%</b> lingkaran 400 m dan <b>${nf(p8.rasio, 0)}%</b> lingkaran 800 m (pedshed ratio).`)}
      <div class="kpi-grid">${kpi(p4.rasio, 'pedshed 400 m (±5 menit)', '%', 1)}${kpi(p8.rasio, 'pedshed 800 m (±10 menit)', '%', 1)}${kpi(p8.simpang_per_km2, 'simpang per km²')}${kpi(VS.walk_rata, 'skor walkability kawasan inti', '', 1)}</div>
      ${chartBox('c1', 'Audit kualitas jalur (rata-rata 3 blok TOD)', 'garis = standar')}
      ${temuan([['!', 'Penyeberangan layak hanya 8 sampai 41% (standar 90%).'], ['!', 'Pengunjung Taman Literasi lewat jalan raya karena tidak tahu ada jembatan penghubung ke MRT.'], ['r', 'Wayfinding dan public easement untuk muka blok 141 sampai 223 m (standar ≤130 m).']])}
      <p class="sumber">Gifarry dkk. (2022); Varlencia &amp; Asharhani (2025). Pedshed acuan: &gt;50% cukup, &gt;70% baik.</p>`,
      charts: () => { const it = [['Jalur pedestrian', avg(t.jalurPed), 80], ['Penyeberangan', avg(t.penyeberangan), 90], ['Peneduh', avg(t.peneduh), 75], ['Jalur sepeda', avg(t.sepeda), 100], ['Pedshed 800 m', p8.rasio, 70]]; return buatChart($('#c1'), { grid: { left: 4 }, xAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%' } }, yAxis: { type: 'category', data: it.map((x) => x[0]), inverse: true }, series: [{ type: 'bar', data: it.map(([, v, s]) => ({ value: +v.toFixed(1), itemStyle: { color: v >= s ? '#2E9A6A' : '#B9B5AF', borderRadius: [0, 4, 4, 0] } })), barWidth: 12, label: { show: true, position: 'right', formatter: '{c}%', fontWeight: 800, color: warnaTeks() } }, { type: 'scatter', data: it.map((x) => x[2]), symbol: 'rect', symbolSize: [3, 20], itemStyle: { color: '#1F1F1F' }, tooltip: { show: false } }] }); },
    };
  },
  variety() {
    const lu = VS.lu;
    return { html: `${head('variety', 'Komersial mendominasi inti kawasan', `<b>${nf(lu['Komersial & jasa'], 0)}%</b> lahan kawasan inti komersial; hunian hanya ${nf(lu['Hunian'], 0)}%. Indeks campuran rata-rata <b>${nf(VS.mix_rata, 2)}</b>.`)}
      <div class="seg" id="seg-var"><button data-v="lu" class="${S.varMode === 'lu' ? 'on' : ''}">Guna lahan</button><button data-v="mix" class="${S.varMode === 'mix' ? 'on' : ''}">Indeks campuran</button></div>
      ${chartBox('c1', 'Komposisi guna lahan kawasan inti')}
      ${temuan([['!', 'Keragaman hunian:nonhunian Blok 2 hanya 5% (standar 15 sampai 85%).'], ['r', 'Hunian vertikal TOD (Pergub 103/2021, subzona R.7 sekitar MRT) menghidupkan kawasan di luar jam komersial.']])}
      <p class="sumber">Landuse OpenStreetMap; entropi Shannon 150 m. Audit: Gifarry dkk. (2022).</p>`,
      charts: () => buatChart($('#c1'), { tooltip: { trigger: 'item', formatter: '{b}: {c}%' }, series: [{ type: 'pie', radius: ['48%', '76%'], center: ['50%', '52%'], padAngle: 2, itemStyle: { borderRadius: 6 }, label: { color: warnaTeks(), fontWeight: 800, fontSize: 11, formatter: '{b}\n{c}%' }, data: Object.entries(lu).map(([k, v], i) => ({ name: k, value: v, itemStyle: { color: LU_C[i] } })) }] }),
      after: () => $$('#seg-var button').forEach((b) => b.onclick = () => { S.varMode = b.dataset.v; $$('#seg-var button').forEach((x) => x.classList.toggle('on', x === b)); gambarOverlay(); renderLegenda(); }),
    };
  },
  termal() {
    const now = persenTeduh(S.doy, S.jam), sk = S.pohonSkenario ? persenTeduh(S.doy, S.jam, hmapSken) : null;
    return { html: `${head('termal', 'Jalur pejalan masih terpanggang', `Matahari dihitung untuk lintang Blok M. Pukul <b>${fmtJam(S.jam)}</b>, ${now == null ? 'matahari sudah terbenam' : `<b>${nf(now, 0)}%</b> jalur pejalan kawasan inti ternaungi bangunan atau pohon`}.`)}
      <div class="kpi-grid">${kpi(SUN.elDeg > 0 ? SUN.elDeg : 0, 'elevasi matahari', '°')}${kpi(suhuUdara(S.jam), 'suhu udara tipikal (asumsi)', ' °C', 1)}${kpi(VS.panas_tinggi, 'area indeks panas tinggi', '%', 0, 'status-no')}${kpi(25, 'jalur berpeneduh terbaik (standar 75%)', '%', 0, 'status-no')}</div>
      ${chartBox('c1', 'Jalur ternaungi sepanjang hari', 'klik grafik untuk pindah jam')}
      <div class="skenario"><h4>🌳 Skenario: pohon peneduh</h4><p>Tanam ${POHON_BARU.length} pohon di tepi jalur kawasan inti yang belum teduh, lalu hitung ulang bayangan.</p>
        <label class="toggle">Aktifkan skenario<span class="sw"><input type="checkbox" id="sk-pohon" ${S.pohonSkenario ? 'checked' : ''}><span></span></span></label>
        ${sk != null ? `<span class="delta">▲ ${nf(sk - now, 0)} poin teduhan pukul ${fmtJam(S.jam)}</span>` : ''}</div>
      <p class="sumber">Ray-marching dari ${JALAN.length} titik jalan ke arah matahari terhadap peta tinggi bangunan dan tajuk pohon (citra satelit). Indeks panas: estimasi, lihat Metodologi.</p>`,
      charts: () => { const a = kurvaTeduh(S.doy, hmap, 'e'), s = S.pohonSkenario ? kurvaTeduh(S.doy, hmapSken, 's') : null;
        return buatChart($('#c1'), { legend: s ? { top: 0, right: 0, textStyle: { color: warnaTeks(), fontWeight: 700, fontSize: 10.5 } } : undefined, grid: { top: s ? 30 : 22 }, xAxis: { type: 'value', min: 6, max: 18, interval: 2, axisLabel: { formatter: (v) => String(v).padStart(2, '0') + ':00' } }, yAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%' } },
          tooltip: { valueFormatter: (v) => v == null ? 'malam' : nf(v, 0) + '%' },
          series: [{ name: 'Eksisting', type: 'line', smooth: true, showSymbol: false, data: a, lineStyle: { width: 2.5, color: '#E4572E' }, areaStyle: { color: 'rgba(228,87,46,.12)' }, markLine: { symbol: 'none', silent: true, label: { show: false }, lineStyle: { color: '#1F1F1F', type: 'dashed' }, data: [{ xAxis: clamp(S.jam, 6, 18) }] } },
            ...(s ? [{ name: 'Dengan pohon', type: 'line', smooth: true, showSymbol: false, data: s, lineStyle: { width: 2.5, color: '#2E9A6A' } }] : [])] },
          null).getZr().on('click', function (e) { const c = charts[charts.length - 1]; const p = c.convertFromPixel({ seriesIndex: 0 }, [e.offsetX, e.offsetY]); if (p) { berhenti(); animJam(clamp(p[0], 6, 18)); } }); },
      after: () => { const el = $('#sk-pohon'); if (el) el.onchange = () => setSkenarioPohon(el.checked); },
    };
  },
  angin() {
    const a = statAngin();
    return { html: `${head('angin', 'Angin melemah di antara blok padat', `Medan aliran 2D <b>Lattice-Boltzmann</b> (D2Q9, sel 6 m). Arah: <b>${ARAH[S.arah]}</b>.`)}
      <label style="display:block;margin-top:10px;font:800 12px Nunito">Arah angin <select id="arah" style="width:100%;margin-top:4px">${Object.entries(ARAH).map(([k, v]) => `<option value="${k}" ${k === S.arah ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
      <label style="display:block;margin-top:8px;font:800 12px Nunito">Angin referensi 10 m: <span id="uref-v">${nf(S.uref, 1)} m/s</span><input type="range" class="rentang" id="uref" min="0.8" max="5" step="0.1" value="${S.uref}"></label>
      <div class="kpi-grid">${kpi(a.rata, 'rata-rata di jalur kawasan inti', ' m/s', 2)}${kpi(a.stag, 'jalur udara stagnan (<0,3 m/s)', '%', 0, 'status-no')}${kpi(a.nyaman, 'jalur angin nyaman', '%', 0, 'status-ok')}${kpi(a.kencang, 'jalur berangin kencang', '%')}</div>
      ${chartBox('c1', 'Kenyamanan angin per arah musim', 'porsi jalur')}
      <p class="sumber">Pola monsun Jakarta: barat Okt sampai Mar, timur Apr sampai Sep (BMKG; BRIN 2013 sampai 2022). Model 2D untuk penyaringan awal, bukan pengganti CFD 3D.</p>`,
      charts: () => { const ks = Object.keys(ARAH), d = ks.map((k) => statAngin(k)); const ser = [['Stagnan', 'stag', '#2E6BD9'], ['Nyaman', 'nyaman', '#8CC56F'], ['Kencang', 'kencang', '#DB4B33']].map(([n, f, c]) => ({ name: n, type: 'bar', stack: 'a', data: d.map((x) => +x[f].toFixed(1)), itemStyle: { color: c }, barWidth: 20 }));
        return buatChart($('#c1'), { legend: { top: 0, right: 0, textStyle: { color: warnaTeks(), fontWeight: 700, fontSize: 10.5 } }, grid: { top: 30 }, xAxis: { type: 'category', data: ['Barat', 'Barat laut', 'Utara', 'Timur', 'Tenggara'] }, yAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%' } }, series: ser }, (e) => { const k = ks[e.dataIndex]; if (k) { S.arah = k; gambarOverlay(); renderPanel(); } }); },
      after: () => { $('#arah').onchange = (e) => { S.arah = e.target.value; gambarOverlay(); renderPanel(); }; $('#uref').oninput = (e) => { S.uref = +e.target.value; $('#uref-v').textContent = nf(S.uref, 1) + ' m/s'; gambarOverlay(); clearTimeout(window.__u); window.__u = setTimeout(renderPanel, 250); }; },
    };
  },
  bising() {
    return { html: `${head('bising', 'Arteri mengepung inti kawasan', `Rata-rata <b>${nf(VS.bising_rata, 0)} dB(A)</b> di ruang luar kawasan inti; <b>${nf(VS.bising_70, 0)}%</b> area melewati 70 dB(A), baku mutu kawasan perdagangan &amp; jasa.`)}
      <div class="kpi-grid">${kpi(VS.bising_rata, 'rata-rata ruang luar', ' dB(A)')}${kpi(VS.bising_70, 'area > 70 dB(A)', '%', 0, 'status-no')}${kpi(VS.fasad_lewat, 'fasad bangunan melewati baku mutu', '%', 0, 'status-no')}${kpi(70, 'baku mutu perdagangan & jasa', ' dB')}</div>
      ${chartBox('c1', 'Sebaran tingkat kebisingan', 'porsi area')}
      ${temuan([['!', 'Fasad yang menghadap Jl. Panglima Polim, Sultan Iskandarsyah, dan Melawai Raya paling terpapar.'], ['r', 'Lorong dalam blok (seperti Gang Viral Pasaraya) 10 sampai 20 dB lebih tenang: potensi ruang nongkrong.']])}
      <p class="sumber">Estimasi indikatif: sumber garis arteri 76, kolektor 70, lokal 60, MRT 66 dB(A) pada 7,5 m; atenuasi jarak geodesik dan difraksi Maekawa. Baku mutu: KepMenLH 48/1996 dan KepGub DKI 551/2001. Validasi dengan pengukuran sound level meter.</p>`,
      charts: () => { const h = VS.bising_hist, t = h.reduce((a, b) => a + b, 0); return buatChart($('#c1'), { xAxis: { type: 'category', data: h.map((_, i) => (40 + i * 5) + '-' + (45 + i * 5)), name: 'dB(A)', axisLabel: { interval: 0, rotate: 35 } }, yAxis: { type: 'value', axisLabel: { formatter: '{value}%' } }, series: [{ type: 'bar', barCategoryGap: '12%', data: h.map((v, i) => ({ value: +(100 * v / t).toFixed(1), itemStyle: { color: `rgb(${F.bising((40 + i * 5 + 2.5 - 45) / 35).map((x) => x * 255).join(',')})`, borderRadius: [4, 4, 0, 0] } })), markLine: { symbol: 'none', label: { formatter: '{b}', fontWeight: 800, color: warnaTeks() }, lineStyle: { color: '#1F1F1F', type: 'dashed' }, data: [{ xAxis: '55-60', name: '55' }, { xAxis: '70-75', name: '70' }] } }] }); },
    };
  },
  svf() {
    return { html: `${head('svf', 'Langit masih terbuka di jalur kawasan', `Rata-rata <b>sky view factor ${nf(VS.svf_rata, 2)}</b> di jalur pejalan: jalan Blok M didominasi bangunan rendah, sehingga panas siang mudah masuk tetapi juga cepat lepas malam hari.`)}
      <div class="kpi-grid">${kpi(VS.svf_rata, 'SVF rata-rata jalur (0 tertutup, 1 terbuka)', '', 2)}${kpi(VS.svf_rendah, 'jalur ngarai (SVF < 0,5)', '%', 1)}</div>
      ${chartBox('c1', 'Sebaran SVF di jalur pejalan')}
      ${temuan([['!', 'SVF tinggi + vegetasi minim = radiasi matahari langsung ke pejalan pada siang hari.'], ['r', 'Kanopi pohon dan selasar (arcade) menurunkan paparan tanpa menahan pelepasan panas malam.']])}
      <p class="sumber">Dihitung dari peta tinggi bangunan (24 azimut, radius 220 m) pada ketinggian 1,5 m.</p>`,
      charts: () => { const h = VS.svf_hist, t = h.reduce((a, b) => a + b, 0); return buatChart($('#c1'), { xAxis: { type: 'category', data: h.map((_, i) => nf(i / 10 + .05, 2)), name: 'SVF' }, yAxis: { type: 'value', axisLabel: { formatter: '{value}%' } }, series: [{ type: 'bar', barCategoryGap: '12%', data: h.map((v, i) => ({ value: +(100 * v / t).toFixed(1), itemStyle: { color: `rgb(${F.svf(i / 10 + .05).map((x) => x * 255).join(',')})`, borderRadius: [4, 4, 0, 0] } })) }] }); },
    };
  },
  sosial() {
    const tj = totalJam(Math.floor(S.jam) % 24); let top = 0; HEXA.forEach((_, i) => { if (hexNow[i] > hexNow[top]) top = i; });
    return { html: `${head('sosial', 'Puncak keramaian menjelang malam', `Kolom = estimasi kunjungan per jam per heksagon (radius ${HR} m) dari ${D.poi.length} POI OpenStreetMap dikali profil jam buka, dipatok ke data terukur.`)}
      <div class="kpi-grid">${kpi(Math.round(tj / 100) * 100, 'estimasi kunjungan pukul ' + fmtJam(S.jam))}${kpi(Math.round((hexNow[top] || 0) / 10) * 10, 'kunjungan/jam di heksagon terpadat')}${kpi(80000, 'total kalibrasi per hari')}${kpi(145855, 'rekor Blok M Hub, malam tahun baru 2026')}</div>
      ${chartBox('c1', 'Ritme kunjungan kawasan', 'klik untuk pindah jam')}
      <p class="sumber">${ANCHOR.map((a) => `${a.n}: ${a.src}`).join(' · ')} · Total ±80.000/hari: Dirut PT MRT Jakarta (investortrust.id, 2026). Profil jam = model, bukan data ponsel.</p>`,
      charts: () => buatChart($('#c1'), { xAxis: { type: 'category', data: Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0')) }, yAxis: { type: 'value', axisLabel: { formatter: (v) => nf(v / 1000, 0) + 'k' } }, tooltip: { valueFormatter: (v) => nf(v, 0) + ' kunjungan' },
        series: [{ type: 'bar', data: Array.from({ length: 24 }, (_, h) => ({ value: Math.round(totalJam(h)), itemStyle: { color: Math.floor(S.jam) % 24 === h ? '#9E2149' : `rgb(${F.sos(Math.sqrt(totalJam(h) / totalJam(19.3))).map((x) => x * 255).join(',')})`, borderRadius: [4, 4, 0, 0] } })), barCategoryGap: '14%' }] }, (e) => { berhenti(); animJam(e.dataIndex + .5); }),
    };
  },
  fasilitas() {
    const fk = VS.fas_kat, f5 = VS.fas5, ks = Object.keys(fk);
    return { html: `${head('fasilitas', 'Hampir semua kebutuhan dalam 10 menit', `<b>${nf(VS.fas_lengkap, 0)}%</b> kawasan inti menjangkau minimal ${VS.n_kat - 1} dari ${VS.n_kat} jenis fasilitas dalam 10 menit (800 m) jalan kaki.`)}
      <div class="kpi-grid">${kpi(VS.fas_rata, 'rata-rata jenis fasilitas terjangkau', ' / ' + VS.n_kat, 1)}${kpi(VS.fas_lengkap, 'area hampir lengkap', '%', 0, 'status-ok')}</div>
      ${chartBox('c1', 'Jangkauan per jenis fasilitas', '5 vs 10 menit')}
      ${temuan([['!', 'Fasilitas kesehatan paling jarang: ' + nf(f5['kesehatan'], 0) + '% area terjangkau dalam 5 menit.'], ['r', 'Konsep kota 10 menit sudah terpenuhi; fokus pada kualitas rute, bukan menambah fasilitas.']])}
      <p class="sumber">Jarak jaringan jalan ke POI OpenStreetMap, transit, dan taman ≥0,15 ha.</p>`,
      charts: () => buatChart($('#c1'), { legend: { top: 0, right: 0, textStyle: { color: warnaTeks(), fontWeight: 700, fontSize: 10.5 } }, grid: { top: 30, left: 4 }, xAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%' } }, yAxis: { type: 'category', data: ks.map((k) => k[0].toUpperCase() + k.slice(1)), inverse: true },
        series: [{ name: '≤5 menit', type: 'bar', data: ks.map((k) => f5[k]), itemStyle: { color: '#13806E', borderRadius: [0, 4, 4, 0] }, barWidth: 7 }, { name: '≤10 menit', type: 'bar', data: ks.map((k) => fk[k]), itemStyle: { color: '#A9DCCB', borderRadius: [0, 4, 4, 0] }, barWidth: 7 }] }),
    };
  },
  rth() {
    return { html: `${head('rth', 'Taman dekat, tapi kecil', `<b>${nf(VS.rth300, 0)}%</b> bangunan kawasan inti berada ≤300 m jalan kaki dari ruang hijau (acuan WHO). Ruang hijau hanya <b>${nf(VS.lu['Ruang hijau'], 1)}%</b> lahan.`)}
      <div class="kpi-grid">${kpi(VS.rth300, 'bangunan ≤300 m dari taman', '%', 0, 'status-ok')}${kpi(VS.lu['Ruang hijau'], 'porsi ruang hijau kawasan inti', '%', 1, 'status-no')}${kpi(5.2, 'RTH Jakarta 2023 (target 30%)', '%', 1)}${kpi(400, 'pengunjung Taman Literasi per hari')}</div>
      ${chartBox('c1', 'Jarak jalan kaki ke ruang hijau', 'porsi area')}
      ${temuan([['r', 'Perluas hijau di atap Terminal dan Mal Blok M (21.263 m²) terhubung dengan Taman Literasi.']])}
      <p class="sumber">Ramadhan, Nugroho &amp; Agumsari (2025); WHO Urban Green Spaces (2016): akses 300 m.</p>`,
      charts: () => { const h = VS.rth_hist, t = h.reduce((a, b) => a + b, 0); return buatChart($('#c1'), { xAxis: { type: 'category', data: h.map((_, i) => i === 9 ? '>900' : (i * 100) + ''), name: 'm' }, yAxis: { type: 'value', axisLabel: { formatter: '{value}%' } }, series: [{ type: 'bar', barCategoryGap: '12%', data: h.map((v, i) => ({ value: +(100 * v / t).toFixed(1), itemStyle: { color: i < 3 ? '#3F9A5E' : '#E5B88F', borderRadius: [4, 4, 0, 0] } })), markLine: { symbol: 'none', label: { formatter: '300 m', fontWeight: 800, color: warnaTeks() }, lineStyle: { color: '#1F1F1F', type: 'dashed' }, data: [{ xAxis: '300' }] } }] }); },
    };
  },
  surya() {
    const top = V.dalam_bld.map((i) => [i, PV[i]]).sort((a, b) => b[1] - a[1]).slice(0, 8);
    return { html: `${head('surya', 'Atap kawasan bisa jadi pembangkit', `Atap ${VS.n_bangunan} bangunan kawasan inti berpotensi <b>±${nf(VS.pv_kwp / 1000, 1)} MWp</b> PLTS, menghasilkan <b>±${nf(VS.pv_mwh / 1000, 1)} GWh/tahun</b> setelah dikurangi bayangan bangunan sekitar.`)}
      <div class="kpi-grid">${kpi(VS.pv_mwh / 1000, 'GWh per tahun (estimasi)', '', 1, 'status-ok')}${kpi(VS.pv_kwp / 1000, 'MWp kapasitas terpasang', '', 1)}${kpi(VS.tapak / 1000, 'ribu m² atap kawasan inti')}${kpi(1250, 'kWh/kWp/tahun (yield Jakarta)')}</div>
      ${chartBox('c1', 'Atap paling produktif', 'MWh/tahun, klik untuk terbang')}
      ${temuan([['r', 'Mal dan pusat belanja (Blok M Square, Plaza Blok M, Pasaraya) menyumbang porsi terbesar: kandidat PLTS atap skala ratusan kWp.']])}
      <p class="sumber">50% atap terpakai, 0,2 kWp/m², yield 1.250 kWh/kWp (studi PLTS atap Jakarta, EREM 2024: 1.161 sampai 1.258); bayangan dihitung dari 55 posisi matahari sepanjang tahun.</p>`,
      charts: () => buatChart($('#c1'), { grid: { left: 4 }, xAxis: { type: 'value', axisLabel: { formatter: (v) => nf(v / 1000, 0) } }, yAxis: { type: 'category', inverse: true, data: top.map(([i]) => B[i].n || ('Bangunan #' + (i + 1))) }, tooltip: { valueFormatter: (v) => nf(v / 1000, 0) + ' MWh/tahun' },
        series: [{ type: 'bar', data: top.map(([, v]) => v), barWidth: 12, itemStyle: { color: '#E0941F', borderRadius: [0, 4, 4, 0] } }] }, (e) => pilihBangunan(top[e.dataIndex][0], true)),
    };
  },
  intensitas() {
    const bl = BLOK.map((b, k) => ({ ...b, k })).sort((a, b) => b.sisa - a.sisa).slice(0, 10);
    return { html: `${head('intensitas', 'Ruang tumbuh sesuai aturan', `Pada ${VS.n_blok} blok kawasan inti, KLB izin memberi <b>${nf(VS.blok_izin / 1000, 0)} ribu m²</b> luas lantai; terbangun ±${nf(VS.blok_gfa / 1000, 0)} ribu m². Sisa <b>${nf(VS.blok_sisa / 1000, 0)} ribu m²</b>.`)}
      <div class="kpi-grid">${kpi(VS.blok_sisa / 1000, 'ribu m² sisa hak membangun', '', 0, 'status-ok')}${kpi(VS.klb_eks, 'KLB eksisting rata-rata', '', 2)}</div>
      <div class="skenario"><h4>🏗 Skenario: pemanfaatan KLB izin</h4><p>Geser untuk menumbuhkan selubung bangunan maksimum (KDB × tinggi) per blok.</p>
        <input type="range" class="rentang" id="sk-klb" min="0" max="100" step="5" value="${S.klbPakai || 100}"><div class="toggle" style="margin-top:2px"><span id="sk-klb-v">${S.klbPakai || 100}% selubung</span><span id="sk-klb-m"></span></div></div>
      ${chartBox('c1', 'Blok dengan sisa hak membangun terbesar', 'ribu m², klik untuk terbang')}
      <p class="sumber">KLB izin diasumsikan 6,65 (KDB 55) untuk blok komersial, mengikuti ketentuan zona K tapak Little Tokyo dalam RDTR (dikutip Ramadhan dkk., 2025), dan 1,2 (KDB 50) untuk hunian (Pergub DKI 103/2021). Pasaraya Grande tercatat KLB 5,5. Cek ulang ke RDTR per persil sebelum dipakai.</p>`,
      charts: () => buatChart($('#c1'), { legend: { top: 0, right: 0, textStyle: { color: warnaTeks(), fontWeight: 700, fontSize: 10.5 } }, grid: { top: 30, left: 4 }, xAxis: { type: 'value', axisLabel: { formatter: (v) => nf(v / 1000, 0) } }, yAxis: { type: 'category', inverse: true, data: bl.map((b) => 'Blok ' + (b.k + 1) + (b.zona[0] === 'R' ? ' (R)' : '')) }, tooltip: { valueFormatter: (v) => nf(v, 0) + ' m²' },
        series: [{ name: 'Terbangun', type: 'bar', stack: 'a', data: bl.map((b) => b.gfa), itemStyle: { color: '#8A847C' }, barWidth: 12 }, { name: 'Sisa hak', type: 'bar', stack: 'a', data: bl.map((b) => b.sisa), itemStyle: { color: '#C2441F', borderRadius: [0, 4, 4, 0] } }] }, (e) => { const b = bl[e.dataIndex], g = selubung.children[b.k].userData; terbangKe(g.cx, g.cz, 420); }),
      after: () => { const r = $('#sk-klb'); const upd = () => { $('#sk-klb-v').textContent = r.value + '% selubung'; $('#sk-klb-m').textContent = '+' + nf(VS.blok_sisa * r.value / 100 / 1000, 0) + 'k m²'; }; r.oninput = () => { setPemanfaatan(+r.value); upd(); }; upd(); },
    };
  },
};

let panelAktif = null;
function wadahPanel() { return mqHP.matches ? $('#panel-hp') : $('#panel-isi'); }
function renderPanel() {
  bersihChart(); const el = wadahPanel(); (mqHP.matches ? $('#panel-isi') : $('#panel-hp')).innerHTML = '';
  const P = PANEL[S.lapis](); el.innerHTML = P.html; panelAktif = P;
  el.scrollTop = 0;
  requestAnimationFrame(() => { if (P.charts) P.charts(); if (P.after) P.after(); hitungAngka(el); });
  if (!reduce) anime({ targets: el.children, opacity: [0, 1], translateY: [12, 0], delay: anime.stagger(45), duration: 520, easing: 'easeOutCubic' });
  setTimeout(() => [...el.children].forEach((c) => { c.style.opacity = ''; c.style.transform = ''; }), 1400);
}
function hitungAngka(root) {
  $$('[data-n]', root).forEach((s) => { if (!s.dataset.n) return; const tgt = +s.dataset.n, d = +s.dataset.d, o = { v: 0 }; anime({ targets: o, v: tgt, duration: reduce ? 1 : 1100, easing: 'easeOutExpo', update: () => s.textContent = nf(o.v, d) }); setTimeout(() => s.textContent = nf(tgt, d), 1400); });
}
let renderTimer = 0;
function renderPanelLembut() { clearTimeout(renderTimer); renderTimer = setTimeout(renderPanel, 300); }

function renderLegenda() {
  const L = S.lapis, mode = LENSA[L].overlay === 'variety' ? S.varMode : (LENSA[L].overlay || L); let h = '';
  const sk = (st, kiri, kanan, tengah = '') => `<div class="sk" style="background:${grad(st)}"></div><div class="tk"><span>${kiri}</span>${tengah ? `<span>${tengah}</span>` : ''}<span>${kanan}</span></div>`;
  const li = (c, t) => `<div class="li"><i style="background:${c}"></i>${t}</div>`;
  switch (mode) {
    case 'akses': h = '<b>Menit jalan ke transit</b>' + sk(RAMP.akses, '0', '15+', '7,5'); break;
    case 'walk': h = '<b>Jangkauan dari MRT Blok M</b>' + li('#21804F', '≤400 m via jaringan') + li('#7DC49B', '400 sampai 800 m') + li('#9A948C', 'belum terjangkau'); break;
    case 'lu': case 'ringkasan': h = '<b>Fungsi bangunan</b>' + Object.entries(LU_NAMA).map(([k, n]) => li(LU_COL[k], n)).join(''); break;
    case 'mix': h = '<b>Indeks campuran</b>' + sk(RAMP.mix, '1 fungsi', 'merata'); break;
    case 'termal': h = '<b>Indeks panas permukaan</b>' + sk(RAMP.panas, 'sejuk', 'panas') + li('#555', 'bayangan aktual'); break;
    case 'angin': h = '<b>Angin pejalan (m/s)</b>' + sk(RAMP.angin, '0', '4+', '2'); break;
    case 'bising': h = '<b>Kebisingan siang dB(A)</b>' + sk(RAMP.bising, '45', '80', '62'); break;
    case 'svf': h = '<b>Sky view factor</b>' + sk(RAMP.svf, '0 tertutup', '1 terbuka'); break;
    case 'fas': h = '<b>Jenis fasilitas ≤10 menit</b>' + sk(RAMP.fas, '0', '8', '4'); break;
    case 'rth': h = '<b>Jarak ke ruang hijau</b>' + sk(RAMP.rth, '0 m', '600+ m', '300'); break;
    case 'sosial': h = '<b>Kunjungan per jam</b>' + sk(RAMP.sos, 'sepi', nf(Math.round(hexMax / 10) * 10) + '+'); break;
    case 'surya': h = '<b>Hasil PLTS per m² atap</b>' + sk(RAMP.surya, '0', '130 kWh/m²/th'); break;
    case 'intensitas': h = '<b>Tinggi bangunan & selubung</b>' + sk([[0, '#F2EDE6'], [1, '#C2451F']], '3 m', '170 m') + li('rgba(194,68,31,.35)', 'selubung KLB izin'); break;
  }
  $('#legenda').innerHTML = h; $('#legenda-hp').innerHTML = mqHP.matches ? `<div class="kartu" style="padding:9px 12px;box-shadow:0 0 0 1px var(--garis) inset;background:var(--kartu-solid)">${h}</div>` : '';
}

// =============================================================
//  Ganti lensa
// =============================================================
function setLapis(id, kamera = true) {
  if (!LENSA[id]) id = 'ringkasan';
  const L = LENSA[id], lama = S.lapis; S.lapis = id;
  document.documentElement.style.setProperty('--c', L.warna);
  $$('.lensa').forEach((b) => b.classList.toggle('on', b.dataset.l === id));
  const chip = $(`#chips .lensa[data-l="${id}"]`); if (chip) chip.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  warnaiBangunan(L.bangunan);
  if (L.overlay) { if (id === 'walk') { isoR = 0; isoT0 = performance.now(); } gambarOverlay(); anime({ targets: ovMat, opacity: [0, 1], duration: 650, easing: 'easeOutQuad' }); }
  else anime({ targets: ovMat, opacity: 0, duration: 400, easing: 'easeOutQuad' });
  catcher.material.opacity = L.overlay ? .3 : .14;
  wLines.visible = id === 'angin'; hexMesh.visible = id === 'sosial'; sosGrow = 0; if (id === 'sosial') updateHex();
  selubung.visible = id === 'intensitas'; if (id === 'intensitas') setPemanfaatan(S.klbPakai || 100);
  agents.visible = L.agen && S.orang !== false; agMat.color.set(id === 'sosial' ? '#ffffff' : L.warna);
  bMat.transparent = id === 'sosial'; bMat.opacity = id === 'sosial' ? .32 : 1; bMat.needsUpdate = true;
  ring.visible = ['walk', 'akses', 'ringkasan'].includes(id);
  pohonBaru.visible = id === 'termal' && S.pohonSkenario;
  for (const o of LBL) o.sembunyi = (o.grup === 'transit' && !['ringkasan', 'akses', 'walk', 'sosial', 'fasilitas'].includes(id)) || (o.grup === 'ring' && !ring.visible) || (o.grup === 'zona' && !S.fokus) || (S.label === false);
  renderPanel(); renderLegenda();
  if (kamera && !cerita.aktif) { if (id === 'termal' && !S.main) animJam(13.5); if (id === 'sosial' && !S.main && (S.jam < 16 || S.jam > 21.5)) animJam(19.5); }
  if (lama !== id && mqHP.matches && sheet.state === 'peek') {} // biarkan pengguna yang membuka
}
function setSkenarioPohon(on) {
  S.pohonSkenario = on; pohonBaru.visible = on && S.lapis === 'termal';
  anime({ targets: pohonBaru.scale, y: on ? [0.01, 1] : 0.01, duration: on ? 1100 : 300, easing: on ? 'easeOutElastic(1,.6)' : 'easeInQuad' });
  renderPanel();
}

// =============================================================
//  Kamera & tampilan
// =============================================================
const VIEWS = {
  iso: { nama: 'Isometrik', fov: 16, off: [1500, 1280, 1500] },
  persp: { nama: 'Perspektif', fov: 42, off: [560, 380, 640] },
  burung: { nama: 'Mata burung', fov: 34, off: [-620, 360, 520] },
  atas: { nama: 'Atas', fov: 30, off: [0, 1500, 1] },
  jalan: { nama: 'Jalan', fov: 55, pos: [120, 34, 175], tgt: [420, 20, 30] },
};
function setView(nama, transisi = true) {
  const v = VIEWS[nama]; S.view = nama; $$('[data-view]').forEach((b) => b.classList.toggle('on', b.dataset.view === nama));
  const portrait = innerWidth / innerHeight < 1, k = portrait ? 2.1 : 1;
  const tgt = v.tgt || [BC[0], 0, BC[1]], pos = v.pos || [tgt[0] + v.off[0] * k, v.off[1] * k, tgt[2] + v.off[2] * k];
  anime({ targets: camera, fov: v.fov, duration: transisi && !reduce ? 1400 : 1, easing: 'easeInOutCubic', update: () => camera.updateProjectionMatrix() });
  cc.setLookAt(...pos, ...tgt, transisi && !reduce);
}
function terbangKe(x, z, jarak = 360) {
  const az = cc.azimuthAngle; cc.setLookAt(x + Math.sin(az) * jarak * .8, jarak * .7, z + Math.cos(az) * jarak * .8, x, 0, z, true);
  if (camera.fov < 30) anime({ targets: camera, fov: 38, duration: 1200, easing: 'easeInOutCubic', update: () => camera.updateProjectionMatrix() });
}

// =============================================================
//  Interaksi: probe & pilih bangunan
// =============================================================
const ray = new THREE.Raycaster(), mouse = new THREE.Vector2(), planeY = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hitP = new THREE.Vector3();
let downXY = null, probeT = 0;
function setRay(e) { mouse.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(mouse, camera); }
canvas.addEventListener('pointerdown', (e) => { downXY = [e.clientX, e.clientY]; cerita.stop(); });
canvas.addEventListener('pointerup', (e) => { if (!downXY || Math.hypot(e.clientX - downXY[0], e.clientY - downXY[1]) > 6) return; klik(e); });
canvas.addEventListener('pointermove', (e) => { if (e.pointerType !== 'mouse' || e.buttons) { $('#probe').classList.remove('on'); return; } const now = performance.now(); if (now - probeT < 40) return; probeT = now; probe(e); });
canvas.addEventListener('pointerleave', () => $('#probe').classList.remove('on'));
function probe(e, tap = false) {
  setRay(e); const hb = ray.intersectObject(bMesh, false)[0]; const pr = $('#probe');
  if (hb) { const b = B[bBid[hb.faceIndex * 3]]; pr.innerHTML = `<b>${b.n || LU_NAMA[b.u]}</b><br><span class="tg">${b.f} lantai · ±${Math.round(b.h)} m${S.lapis === 'surya' ? ' · ' + nf(PV[bBid[hb.faceIndex * 3]] / 1000, 0) + ' MWh/th' : ''}</span>`; }
  else { if (!ray.ray.intersectPlane(planeY, hitP)) return pr.classList.remove('on'); const i = cellOf(hitP.x, hitP.z); if (i < 0) return pr.classList.remove('on'); pr.innerHTML = nilaiProbe(i); }
  pr.style.left = Math.min(innerWidth - 250, e.clientX) + 'px'; pr.style.top = e.clientY + 'px'; pr.classList.add('on');
  if (tap) { clearTimeout(probe.t); probe.t = setTimeout(() => pr.classList.remove('on'), 2600); }
}
function klik(e) {
  setRay(e); const hb = ray.intersectObject(bMesh, false)[0];
  if (hb) pilihBangunan(bBid[hb.faceIndex * 3]); else { tutupInfo(); if (e.pointerType !== 'mouse') probe(e, true); }
}
function tutupInfo() { $('#info').hidden = true; sorot(null); }
function pilihBangunan(i, terbang = false) {
  const b = B[i]; sorot(i); if (terbang) terbangKe(b.c[0], b.c[1], Math.max(260, b.h * 4));
  const gi = cellOf(b.c[0], b.c[1]); let bis = NaN;
  for (let r = 1; r < 6 && bis !== bis; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) { const k = gi + dj * GW + di; const v = val.bising(k); if (v === v && (bis !== bis || v > bis)) bis = v; }
  const inti = B_IN[i];
  $('#info').hidden = false;
  $('#info').innerHTML = `<button class="x" aria-label="Tutup">✕</button><span class="pill" style="background:${LU_COL[b.u]}22;color:${LU_COL[b.u]}">${LU_NAMA[b.u]}${inti ? ' · kawasan inti' : ''}</span>
    <h3>${b.n || 'Bangunan #' + (i + 1)}</h3><p class="lede" style="font-size:12px">${b.n ? 'Tinggi: ' + b.s : 'Tinggi: estimasi tipologi'}</p>
    <div class="kpi-grid">${kpi(b.f, 'lantai')}${kpi(Math.round(b.h), 'tinggi', ' m')}${kpi(b.a, 'luas tapak', ' m²')}${kpi(Math.round(b.a * b.f * .85), 'est. luas lantai', ' m²')}${kpi(Math.round(PV[i] / 1000), 'PLTS atap', ' MWh/th')}${kpi(bis === bis ? Math.round(bis) : '-', 'bising fasad', ' dB(A)')}</div>
    <p class="sumber">±${nf(val.akses(gi), 1)} menit jalan ke transit · indeks panas ${nf(val.panas(gi) * 100, 0)}/100</p>`;
  $('#info .x').onclick = tutupInfo; hitungAngka($('#info'));
}

// =============================================================
//  Waktu
// =============================================================
function setJam(h) {
  S.jam = h; $('#slider').value = h; $('#jam').textContent = fmtJam(h); setMatahari();
  $('#jam-info').textContent = SUN.elDeg > 0 ? `Matahari ${nf(SUN.elDeg, 0)}° · ${nf(suhuUdara(h), 1)} °C` : 'Malam · lampu kota menyala';
  if (S.lapis === 'termal') { gambarOverlay(); renderPanelLembut(); }
  if (S.lapis === 'sosial') { updateHex(); renderPanelLembut(); }
}
function animJam(tgt) { const o = { h: S.jam }; anime({ targets: o, h: tgt, duration: reduce ? 1 : 1500, easing: 'easeInOutCubic', update: () => setJam(o.h) }); }
function berhenti() { S.main = false; $('#main').classList.remove('on'); $('#ikon-main').innerHTML = '<path d="M6 4l14 8-14 8z"/>'; }
function gambarRitme() {
  let d = '', mx = 0; const vals = []; for (let h = 5; h <= 24; h += .25) { const v = totalJam(Math.floor(h) % 24); vals.push(v); mx = Math.max(mx, v); }
  vals.forEach((v, i) => d += (i ? 'L' : 'M') + (i / (vals.length - 1) * 300).toFixed(1) + ' ' + (34 - v / mx * 30).toFixed(1));
  let ss = ''; for (let h = 5; h <= 24; h += .5) { const e = posisiMatahari(S.doy, h).elDeg; if (e > 0) ss += `<rect x="${((h - 5) / 19 * 300).toFixed(1)}" y="0" width="${(.5 / 19 * 300).toFixed(1)}" height="36" fill="#F6C177" opacity="${(.06 + e / 90 * .2).toFixed(2)}"/>`; }
  $('#ritme').innerHTML = ss + `<path d="${d}L300 36L0 36Z" fill="var(--c)" opacity=".16"/><path d="${d}" fill="none" stroke="var(--c)" stroke-width="1.4" vector-effect="non-scaling-stroke"/>`;
}

// =============================================================
//  Tur cerita
// =============================================================
const CERITA = [
  { l: 'ringkasan', v: 'iso', j: 16.5, t: 'Kawasan inti Blok M', p: `Area 29 ha yang diapit Jl. Bulungan, Palatehan, Sultan Iskandarsyah, dan Melawai Raya. Skor kelayakan ${SK.total}/100: layak dengan syarat.` },
  { l: 'akses', v: 'persp', j: 8, t: 'Simpul transit terpadat', p: `Stasiun MRT Blok M BCA melayani 553.599 pelanggan pada Desember 2025. ${nf(VS.akses5, 0)}% kawasan inti cukup 5 menit jalan kaki ke transit.` },
  { l: 'walk', v: 'atas', j: 9, t: 'Jangkauan jalan kaki', p: `Hijau menyebar dari MRT mengikuti jaringan jalan: ${nf(ST.pedshed['400'].rasio, 0)}% lingkaran 400 m benar-benar terjangkau. Selisihnya adalah jalan memutar.` },
  { l: 'termal', v: 'burung', j: 13.5, t: 'Siang yang terik', p: 'Bayangan dihitung dari posisi matahari aktual. Hanya sebagian kecil jalur yang ternaungi saat tengah hari; skenario pohon peneduh ada di panel.' },
  { l: 'angin', v: 'persp', j: 15, t: 'Angin terhalang blok padat', p: 'Partikel mengikuti simulasi Lattice-Boltzmann. Udara melambat di dalam blok Melawai dan mengalir deras di koridor arteri.' },
  { l: 'bising', v: 'burung', j: 17, t: 'Arteri yang bising', p: `${nf(VS.fasad_lewat, 0)}% fasad bangunan kawasan inti melewati baku mutu kebisingan. Lorong dalam blok jauh lebih tenang.` },
  { l: 'sosial', v: 'burung', j: 19.5, t: 'Blok M hidup di malam hari', p: 'Kolom menunjukkan perkiraan kunjungan per jam, dipatok ke 80.000 pengunjung/hari. Puncaknya menjelang pukul 19.00 sampai 20.00.' },
  { l: 'intensitas', v: 'iso', j: 16, t: 'Ruang untuk tumbuh', p: `Selubung merah adalah luas lantai yang masih diizinkan KLB: sekitar ${nf(VS.blok_sisa / 1000, 0)} ribu m². Peluang untuk hunian vertikal TOD.` },
];
const cerita = {
  aktif: false, i: 0, t: 0,
  mulai() { this.aktif = true; this.i = 0; $('#b-tur').classList.add('on'); this.tampil(); },
  stop() { if (!this.aktif) return; this.aktif = false; clearTimeout(this.t); $('#cerita').hidden = true; $('#b-tur').classList.remove('on'); },
  tampil() {
    const s = CERITA[this.i], dur = 8000; clearTimeout(this.t);
    location.hash = s.l; setLapis(s.l, false); setView(s.v); berhenti(); animJam(s.j);
    const el = $('#cerita'); el.hidden = false; el.style.setProperty('--d', dur + 'ms');
    el.innerHTML = `<span class="langkah">Tur cerita · ${this.i + 1} dari ${CERITA.length}</span><h3>${s.t}</h3><p>${s.p}</p>
      <div class="nav"><div class="titik">${CERITA.map((_, k) => `<i class="${k < this.i ? 'lewat' : k === this.i ? 'on' : ''}"></i>`).join('')}</div>
      <button class="btn" id="c-prev" type="button" ${this.i ? '' : 'disabled'}>‹</button><button class="btn primer" id="c-next" type="button">${this.i === CERITA.length - 1 ? 'Selesai' : 'Lanjut ›'}</button><button class="btn" id="c-x" type="button" aria-label="Tutup tur">✕</button></div>`;
    $('#c-prev').onclick = () => { this.i = Math.max(0, this.i - 1); this.tampil(); };
    $('#c-next').onclick = () => this.lanjut(); $('#c-x').onclick = () => this.stop();
    this.t = setTimeout(() => this.lanjut(), dur);
  },
  lanjut() { if (this.i >= CERITA.length - 1) { this.stop(); setLapis('ringkasan'); location.hash = 'ringkasan'; setView('iso'); return; } this.i++; this.tampil(); },
};

// =============================================================
//  Lembar bawah (HP)
// =============================================================
const sheet = {
  el: $('#sheet'), state: 'peek',
  set(s) { this.state = s; this.el.classList.remove('half', 'full'); if (s !== 'peek') this.el.classList.add(s); setTimeout(() => charts.forEach((c) => c.resize()), 560); },
  init() {
    let y0 = 0, t0 = 0, base = 0, drag = false; const g = $('#pegangan'), el = this.el;
    const H = () => el.getBoundingClientRect().height;
    const pos = () => ({ peek: H() - 178, half: H() * .46, full: 0 }[this.state]);
    const start = (e) => { drag = true; y0 = e.clientY; t0 = performance.now(); base = pos(); el.classList.add('seret'); g.setPointerCapture(e.pointerId); };
    const move = (e) => { if (!drag) return; const y = clamp(base + e.clientY - y0, 0, H() - 120); el.style.transform = `translateY(${y}px)`; };
    const end = (e) => { if (!drag) return; drag = false; el.classList.remove('seret'); el.style.transform = ''; const dy = e.clientY - y0, v = dy / (performance.now() - t0); const y = base + dy; const order = ['full', 'half', 'peek'];
      let s; if (Math.abs(v) > .5) s = v < 0 ? (this.state === 'peek' ? 'half' : 'full') : (this.state === 'full' ? 'half' : 'peek'); else { const c = { full: 0, half: H() * .46, peek: H() - 178 }; s = order.reduce((a, b) => Math.abs(c[b] - y) < Math.abs(c[a] - y) ? b : a); }
      if (Math.abs(dy) < 6) s = this.state === 'peek' ? 'half' : 'peek'; this.set(s); };
    g.addEventListener('pointerdown', start); g.addEventListener('pointermove', move); g.addEventListener('pointerup', end); g.addEventListener('pointercancel', end);
  },
};

// =============================================================
//  UI: lensa, menu, dok, overlay
// =============================================================
function tombolLensa(id) { const L = LENSA[id]; return `<button class="lensa" data-l="${id}" style="--k:${L.warna}" type="button"><i><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${IK[id]}</svg></i><span>${L.nama}<small>${L.sub}</small></span><b>${L.skor()}</b></button>`; }
function bangunUI() {
  let h = ''; for (const g in GRUP) { h += `<h4>${GRUP[g]}</h4>`; for (const id in LENSA) if (LENSA[id].grup === g) h += tombolLensa(id); }
  $('#rel').innerHTML = h;
  $('#chips').innerHTML = Object.keys(LENSA).map(tombolLensa).join('');
  $$('.lensa').forEach((b) => b.onclick = () => { cerita.stop(); location.hash = b.dataset.l; if (mqHP.matches && sheet.state === 'peek') sheet.set('half'); });
  const vh = Object.entries(VIEWS).map(([k, v]) => `<button class="tb" data-view="${k}" type="button">${v.nama}</button>`).join('');
  $('#grup-view').innerHTML = vh; $('#menu-view').innerHTML = vh;
  $$('[data-view]').forEach((b) => b.onclick = () => { cerita.stop(); setView(b.dataset.view); if (mqHP.matches) tutupMenu(); });
  $$('[data-dasar]').forEach((b) => b.onclick = () => { $$('[data-dasar]').forEach((x) => x.classList.toggle('on', x === b)); groundMat.map = TEX[b.dataset.dasar]; groundMat.needsUpdate = true; });
  $$('[data-opsi]').forEach((b) => b.onclick = () => {
    const k = b.dataset.opsi, on = !b.classList.contains('on'); b.classList.toggle('on', on);
    if (k === 'fokus') { S.fokus = on; anime({ targets: U.uFocus, value: on ? 1 : 0, duration: 600, easing: 'easeInOutQuad' }); if (LENSA[S.lapis].overlay) gambarOverlay(); batas.visible = on; zonaLbl.sembunyi = !on; }
    if (k === 'orang') { S.orang = on; agents.visible = on && LENSA[S.lapis].agen; }
    if (k === 'pohon') pohon.visible = on;
    if (k === 'label') { S.label = on; lblRoot.style.display = on ? '' : 'none'; }
  });
  $('#b-menu').onclick = (e) => { e.stopPropagation(); const m = $('#menu'); m.hidden = !m.hidden; $('#b-menu').setAttribute('aria-expanded', !m.hidden); };
  document.addEventListener('click', (e) => { if (!e.target.closest('#menu') && !e.target.closest('#b-menu')) tutupMenu(); });
  $('#b-tur').onclick = () => { tutupMenu(); cerita.aktif ? cerita.stop() : cerita.mulai(); };
  $('#b-metode').onclick = () => { tutupMenu(); $('#modal').hidden = false; };
  $('#b-bantuan').onclick = () => { tutupMenu(); $('#onboard').hidden = false; };
  $('#b-lokasi').onclick = () => { tutupMenu(); $('#lokasi').hidden = false; };
  $$('.overlay').forEach((o) => o.addEventListener('click', (e) => { if (e.target === o || e.target.classList.contains('tutup')) o.hidden = true; }));
  $('#ob-sendiri').onclick = () => { $('#onboard').hidden = true; simpan('bm3d-ob', 1); };
  $('#ob-tur').onclick = () => { $('#onboard').hidden = true; simpan('bm3d-ob', 1); cerita.mulai(); };
  const LOK = [['MRT Blok M BCA', ...tm(515, 462)], ['Blok M Square', ...tm(712, 452)], ['Plaza Blok M', ...tm(452, 425)], ['Taman Literasi & Terminal', ...tm(560, 370)], ['M Bloc Space', ...tm(548, 228)], ['Little Tokyo', ...tm(585, 432)], ['Pasaraya & Menara Sentraya', ...tm(900, 470)], ['Taman Sepeda', ...tm(715, 578)]];
  $('#daftar-lokasi').innerHTML = LOK.map(([n], i) => `<button class="btn" data-lok="${i}" type="button" style="justify-content:flex-start;height:44px">${n}</button>`).join('');
  $$('[data-lok]').forEach((b) => b.onclick = () => { const [, x, z] = LOK[+b.dataset.lok]; $('#lokasi').hidden = true; cerita.stop(); terbangKe(x, z, 320); });
  $('#slider').oninput = (e) => { berhenti(); setJam(+e.target.value); };
  $('#tanggal').onchange = (e) => { S.doy = +e.target.value; setJam(S.jam); gambarRitme(); if (S.lapis === 'termal') renderPanel(); };
  $$('[data-sp]').forEach((b) => b.onclick = () => { S.kecepatan = +b.dataset.sp; $$('[data-sp]').forEach((x) => x.classList.toggle('on', x === b)); });
  $('#main').onclick = () => { S.main = !S.main; $('#main').classList.toggle('on', S.main); $('#ikon-main').innerHTML = S.main ? '<path d="M6 4h4v16H6zM14 4h4v16h-4z"/>' : '<path d="M6 4l14 8-14 8z"/>'; };
  $('#kompas').onclick = () => cc.rotateAzimuthTo(0, true);
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { $$('.overlay').forEach((o) => o.hidden = true); tutupInfo(); cerita.stop(); }
    if (e.target.matches('input,select,textarea')) return;
    const ids = Object.keys(LENSA); if (/^[1-9]$/.test(e.key)) location.hash = ids[+e.key - 1];
    if (e.key === ' ') { e.preventDefault(); $('#main').click(); }
  });
  $('#isi-metode').innerHTML = METODE;
  sheet.init();
  const pasangDok = () => { if (mqHP.matches) $('#slot-dok').appendChild($('#dok')); else document.body.appendChild($('#dok')); renderPanel(); renderLegenda(); };
  mqHP.addEventListener('change', pasangDok); pasangDok();
}
function tutupMenu() { $('#menu').hidden = true; $('#b-menu').setAttribute('aria-expanded', 'false'); }
function simpan(k, v) { try { localStorage.setItem(k, v); } catch (e) { } }
function baca(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }

const METODE = `
<p>Semua analisis berfokus pada <b>kawasan inti Blok M</b> (${nf(VS.luas_ha, 1)} ha) yang dibatasi Jl. Bulungan, Jl. Palatehan (termasuk M Bloc), Jl. Sultan Iskandarsyah, dan Jl. Melawai Raya. Bangunan di luar batas tetap tampil sebagai konteks.</p>
<h3>Geometri</h3><p>${B.length} tapak bangunan dari peta OpenStreetMap di folder proyek. Tinggi lima landmark dari sumber publik (Menara Sentraya 41 lantai, Plaza Blok M 7 lantai, Blok M Square, Menara ASEAN 16 lantai); lainnya estimasi tipologi yang dikalibrasi ke KLB/KDB audit TOD (Gifarry dkk., 2022). Pohon dari indeks kehijauan citra satelit.</p>
<h3>Skor kelayakan</h3><p>Empat parameter utama dihitung untuk kawasan inti dan digabung dengan bobot AHP pemangku kepentingan TOD Blok M (Gifarry dkk., 2022): angkutan umum 0,493, pejalan kaki 0,320, kenyamanan 0,106, intensitas 0,081. Kategori: ≥75 layak, 55 sampai 74 layak bersyarat, &lt;55 perlu intervensi. Dashboard 2D memakai radius 800 m dari MRT, sehingga angkanya sedikit berbeda.</p>
<h3>Iklim mikro</h3><ul><li><b>Termal</b>: posisi matahari NOAA; teduhan jalur dihitung dengan ray-marching terhadap peta tinggi; indeks panas adalah estimasi dari vegetasi dan permukaan kedap, bukan pengukuran suhu.</li><li><b>Angin</b>: CFD 2D Lattice-Boltzmann D2Q9, sel 6 m, 5 arah monsun (BMKG; BRIN). Penyaringan awal, bukan CFD 3D.</li><li><b>Kebisingan</b>: estimasi indikatif dari kelas jalan OSM (arteri 76, kolektor 70, lokal 60, MRT 66 dB(A) pada 7,5 m), atenuasi jarak geodesik dan difraksi Maekawa. Baku mutu KepMenLH 48/1996 dan KepGub DKI 551/2001. Perlu validasi pengukuran.</li><li><b>Sky view factor</b>: 24 azimut, radius 220 m, tinggi 1,5 m.</li></ul>
<h3>Kehidupan kota</h3><ul><li><b>Kota 10 menit</b>: jarak jaringan ke 8 jenis fasilitas (6 kategori POI OSM, transit, taman ≥0,15 ha).</li><li><b>Ruang hijau 300 m</b>: acuan WHO Urban Green Spaces (2016).</li><li><b>Heatmap sosial</b>: model terkalibrasi, bukan data ponsel. POI × profil jam, dipatok ke data PT MRT Jakarta, Katadata, dan jurnal; total ±80.000 pengunjung/hari.</li></ul>
<h3>Pengembangan & energi</h3><ul><li><b>PLTS atap</b>: 50% atap, 0,2 kWp/m², yield 1.250 kWh/kWp (EREM 2024, Jakarta), dikurangi bayangan dari 55 posisi matahari setahun.</li><li><b>Potensi pengembangan</b>: blok dari jaringan jalan; KLB izin diasumsikan 6,65/KDB 55 untuk komersial (zona K, RDTR via Ramadhan dkk., 2025) dan 1,2/KDB 50 untuk hunian (Pergub DKI 103/2021). Cek ulang per persil.</li></ul>
<h3>Sumber utama</h3><ol><li>Gifarry, Dwi Ari, Firdausiyah (2022). Penerapan Kawasan Berorientasi Transit di Kawasan Transit Blok M. Jurnal Tata Kota dan Daerah 14(2).</li><li>Pergub DKI Jakarta No. 103 Tahun 2021 tentang Penataan Ruang Kawasan Kebayoran Baru.</li><li>Ramadhan, Nugroho, Agumsari (2025). Optimalisasi RTH di Kawasan Blok M. JDLBI 2(1).</li><li>Latip dkk. (2024); Gavriel &amp; Surya (2022); Rahmah &amp; Kurniawan (2022); Varlencia &amp; Asharhani (2025); Manurung (2025).</li><li>PT MRT Jakarta via Media Asuransi, investortrust.id, Metro TV (2025 sampai 2026); Katadata (2026).</li><li>KepMenLH 48/1996; KepGub DKI 551/2001; WHO (2016); EREM 80(4) 2024 (PLTS atap Jakarta).</li><li>Peta © kontributor OpenStreetMap (ODbL); citra Google Earth. Perangkat: three.js, camera-controls, Apache ECharts, anime.js.</li></ol>`;

// =============================================================
//  Loop
// =============================================================
const clock = new THREE.Clock(); let t0 = performance.now(), simMenit = 0;
const azTmp = new THREE.Vector3();
function loop() {
  const dt = Math.min(.05, clock.getDelta()), el = (performance.now() - t0) / 1000;
  U.uGrow.value = reduce ? 1 : clamp(el / 3); U.uTime.value = el;
  if (S.main) { let h = S.jam + dt * .9 * S.kecepatan; if (h > 24) h = 5; setJam(h); }
  cc.update(dt);
  const cd = cc.distance; scene.fog.near = cd * 1.2; scene.fog.far = cd * 3.4;
  $('#utara').style.transform = `rotate(${cc.azimuthAngle * 180 / Math.PI}deg)`;
  if (S.lapis === 'walk' && isoR < 800) { isoR = 800 * (1 - Math.pow(1 - clamp((performance.now() - isoT0) / 2800), 3)); gambarOverlay(); }
  if (S.lapis === 'sosial' && sosGrow < 1) { sosGrow = Math.min(1, sosGrow + dt * .8); updateHex(); }
  if (wLines.visible) langkahAngin(dt);
  if (agents.visible) langkahAgen(dt);
  simMenit += dt * 1.4 * S.kecepatan;
  for (const k of KERETA) { const u = (simMenit / 5 + k.fase) % 1, pos = k.arah ? 1 - u : u, dir = k.arah ? -1 : 1, off = k.arah ? 2.2 : -2.2;
    k.grp.children.forEach((car, ci) => { const tt = clamp(pos - dir * ci * 20.6 / MRT_L), p = mrtCurve.getPointAt(tt), tg = mrtCurve.getTangentAt(tt); car.position.set(p.x + off * tg.z, 11.9, p.z - off * tg.x); car.rotation.y = Math.atan2(tg.x, tg.z); car.visible = tt > .002 && tt < .998; }); }
  if (composer) composer.render(); else renderer.render(scene, camera);
  updateLabels();
  requestAnimationFrame(loop);
}

// =============================================================
//  Mulai
// =============================================================
resize(); bangunUI();
camera.position.set(BC[0] + 2600, 2300, BC[1] + 2600); cc.setLookAt(BC[0] + 2600, 2300, BC[1] + 2600, BC[0], 0, BC[1], false);
setMatahari(); gambarRitme();
setLapis(location.hash.slice(1) || 'ringkasan', false);
setJam(S.jam);
addEventListener('hashchange', () => setLapis(location.hash.slice(1)));
setTimeout(() => setView('iso'), 200);
requestAnimationFrame(() => $('#memuat').classList.add('hilang'));
if (!baca('bm3d-ob') && !/notour/.test(location.search)) setTimeout(() => { $('#onboard').hidden = false; }, 2600);
loop();
window.__bm = { S, setLapis, setView, setJam, cc, camera, cerita, sheet, pilihBangunan, setSkenarioPohon, renderer };
