# Studi Kelayakan Kawasan TOD Blok M

Peta 3D interaktif dan dashboard untuk studi kelayakan **kawasan inti Blok M** (±29 ha, Jakarta Selatan). Bisa dibuka di desktop, tablet, dan HP.

| Halaman | Isi |
|---|---|
| `index.html` | **Peta 3D v2**: 12 lensa analisis, tur cerita, skenario interaktif, siklus siang-malam |
| `2d/index.html` | **Dashboard 2D**: skor 4 parameter utama dalam radius 800 m dari MRT |

## Fitur peta 3D

- **12 lensa** dalam 4 kelompok:
  - Parameter utama: aksesibilitas, walkability (pedshed 400/800 m), variety function, termal dan bayangan
  - Iklim mikro: angin (CFD Lattice-Boltzmann 2D), kebisingan lalu lintas, keterbukaan langit (sky view factor)
  - Kehidupan kota: heatmap sosial, kota 10 menit, akses ruang hijau 300 m
  - Pengembangan dan energi: potensi PLTS atap, potensi pengembangan (selubung KLB izin)
- **Skenario**: tanam pohon peneduh dan hitung ulang teduhan jalur; tumbuhkan selubung KLB izin per blok
- **Tur cerita** 8 langkah dengan kamera otomatis, **panduan awal** untuk pengguna baru
- **Lima sudut pandang** (isometrik, perspektif, mata burung, atas, jalan), terbang ke lokasi, kompas
- **Siklus 24 jam**: posisi matahari NOAA, bayangan aktual, lampu kota di malam hari, MRT berjalan
- **Responsif**: di HP panel analisis menjadi lembar bawah yang bisa digeser; mode ringan otomatis

## Menjalankan

Klik dua kali `index.html`. Tidak perlu server, karena data dan gambar sudah dibundel (`data3d.js`, `data_v2.js`, `aset.js`). Font memakai Google Fonts bila ada internet.

Tambahkan `?lite` di URL untuk memaksa mode ringan (bayangan lebih kecil, tanpa efek bloom) pada perangkat lemah.

## GitHub Pages

1. Unggah seluruh isi folder ini ke repo (pastikan `index.html` berada di root).
2. **Settings → Pages → Deploy from a branch**, branch `main`, folder `/ (root)`.
3. Buka `https://<username>.github.io/<nama-repo>/`. Tautan langsung ke lensa memakai hash, misalnya `#angin`, `#bising`, `#intensitas`.

## Struktur

```
index.html, app.js            Peta 3D (app.js = bundel dari src/)
data3d.js, data_v2.js, aset.js Data analisis dan tekstur peta
2d/                           Dashboard 2D
src/app.js, src/index.html    Kode sumber peta 3D
src/vendor/                   three.js r170, camera-controls, anime.js, postprocessing three.js
scripts/                      Skrip Python pengolah data
```

## Mengubah kode

```sh
npm install      # memasang esbuild dan Apache ECharts
npm run build    # menghasilkan app.js dari src/app.js
cp src/index.html index.html
```

## Mengolah ulang data

Skrip mengharapkan data mentah di `../Map` (struktur folder proyek 6 FS BLOK M) dan menulis ke `build/`:

```sh
pip install numpy scipy scikit-image pillow
python scripts/analisis_spasial.py   # grid aksesibilitas, walkability, guna lahan, termal
python scripts/build2d.py            # dashboard 2D
python scripts/prep3d.py             # bangunan, pohon, POI, medan angin LBM
python scripts/analisis_v2.py        # kawasan inti: kebisingan, SVF, fasilitas, RTH, PLTS, KLB
python scripts/bundle_data3d.py      # data3d.js, data_v2.js, aset.js
```

## Metodologi singkat

- **Skor kelayakan**: 4 parameter utama untuk kawasan inti, digabung dengan bobot AHP (Gifarry dkk., 2022).
- **Bangunan**: tapak OSM; tinggi 5 landmark dari sumber publik, lainnya estimasi tipologi yang dikalibrasi ke KLB/KDB audit TOD.
- **Kebisingan**: estimasi indikatif dari kelas jalan OSM dengan atenuasi jarak dan difraksi; baku mutu KepMenLH 48/1996 dan KepGub DKI 551/2001.
- **PLTS atap**: yield 1.250 kWh/kWp (studi PLTS atap Jakarta, EREM 2024), dikurangi bayangan sepanjang tahun.
- **Potensi pengembangan**: KLB izin diasumsikan 6,65 untuk blok komersial dan 1,2 untuk hunian; cek ulang ke RDTR per persil.
- **Heatmap sosial**: model terkalibrasi (POI × profil jam), bukan data ponsel.

Rincian lengkap ada di menu **Metodologi & sumber** pada peta.

## Atribusi dan lisensi pihak ketiga

- Peta dasar dan tapak bangunan © kontributor [OpenStreetMap](https://www.openstreetmap.org/copyright), ODbL.
- Citra satelit: Google Earth. Periksa ketentuan Google sebelum repo dibuat publik.
- [three.js](https://threejs.org) (MIT), [camera-controls](https://github.com/yomotsu/camera-controls) (MIT), [Apache ECharts](https://echarts.apache.org) (Apache-2.0), [anime.js](https://animejs.com) (MIT).
- Data pengunjung dan ridership: PT MRT Jakarta, Katadata, dan jurnal yang dirujuk di menu Metodologi.
