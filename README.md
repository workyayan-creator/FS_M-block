# Feasibility Study Kawasan TOD Blok M

Dashboard analisis kawasan Blok M, Jakarta Selatan, dalam dua bentuk:

| Halaman | Isi |
|---|---|
| `index.html` | **Peta 3D interaktif** (Three.js): 2.009 bangunan, pohon, MRT layang, siklus matahari dan bayangan, simulasi angin, heatmap sosial |
| `2d/index.html` | **Dashboard 2D**: skor kelayakan, aksesibilitas, walkability, variety function, heat map termal |

## Menjalankan

Cukup buka `index.html` di browser (klik dua kali). Tidak perlu server atau build, karena data dan gambar sudah dibundel ke `data3d.js` dan `aset.js`.

## GitHub Pages

1. Unggah seluruh isi folder ini ke repo baru (lewat GitHub Desktop, `git push`, atau tombol *Add file → Upload files*).
2. Buka **Settings → Pages**, pilih **Deploy from a branch**, branch `main`, folder `/ (root)`.
3. Setelah 1 sampai 2 menit, peta 3D ada di `https://<username>.github.io/<nama-repo>/` dan dashboard 2D di `.../2d/`.

Tautan langsung ke lensa tertentu memakai hash, misalnya `#angin`, `#sosial`, `#termal`, `#walk`.

## Struktur

```
index.html, app.js        Peta 3D (app.js = hasil bundel dari src/)
data3d.js, aset.js        Data analisis 3D dan tekstur peta (base64)
2d/                       Dashboard 2D beserta gambar peta
src/app.js                Kode sumber peta 3D
src/vendor/               Three.js r170 dan OrbitControls (lisensi MIT)
scripts/                  Skrip Python pengolah data
package.json              Perintah build (esbuild)
```

## Mengubah kode atau data

Peta 3D (setelah mengedit `src/app.js`):

```sh
npm install
npm run build
```

Data dihasilkan oleh skrip Python. Skrip mengharapkan data mentah di folder `../Map` (struktur folder proyek 6 FS BLOK M) dan menulis ke `build/`:

```sh
pip install numpy scipy scikit-image pillow
python scripts/analisis_spasial.py   # build/data.json   (grid aksesibilitas, walkability, guna lahan, termal)
python scripts/build2d.py            # 2d/index.html
python scripts/prep3d.py             # build/data3d.json (bangunan, pohon, POI, medan angin LBM)
python scripts/bundle_data3d.py      # data3d.js, aset.js
```

Catatan: beberapa langkah pratinjau gambar di skrip memakai berkas antara (misalnya `build/ge1400.jpg`, citra satelit yang diperkecil ke lebar 1400 px). Sesuaikan jalurnya bila struktur folder berbeda.

## Metodologi singkat

- **Bangunan**: tapak dari peta OpenStreetMap. Tinggi lima landmark dari sumber publik; bangunan lain diestimasi menurut tipologi dan dikalibrasi ke rasio KLB/KDB audit TOD (Gifarry dkk., 2022).
- **Aksesibilitas dan walkability**: jarak jaringan jalan (Dijkstra), pedshed ratio 400 m dan 800 m dari MRT Blok M.
- **Variety function**: entropi Shannon guna lahan OSM.
- **Termal**: indeks panas permukaan (estimasi dari vegetasi satelit dan permukaan kedap) serta posisi matahari NOAA dengan bayangan aktual.
- **Angin**: CFD 2D Lattice-Boltzmann D2Q9 (sel 6 m), arah mengikuti pola monsun Jakarta. Untuk penyaringan awal, bukan pengganti CFD 3D.
- **Heatmap sosial**: model terkalibrasi, bukan data ponsel. POI OSM dikali profil jam buka, dipatok ke data terukur PT MRT Jakarta, Blok M Hub, dan jurnal.

Rincian dan daftar sumber ada di tombol **Metodologi** pada masing-masing halaman.

## Atribusi data

- Peta dasar dan tapak bangunan © kontributor [OpenStreetMap](https://www.openstreetmap.org/copyright), lisensi ODbL.
- Citra satelit: Google Earth. Periksa ketentuan Google sebelum mempublikasikan repo secara terbuka.
- Three.js © three.js authors, lisensi MIT.
- Angka pengunjung dan ridership: PT MRT Jakarta (via Media Asuransi, investortrust.id, Metro TV), Katadata, serta jurnal yang dirujuk di halaman Metodologi.
