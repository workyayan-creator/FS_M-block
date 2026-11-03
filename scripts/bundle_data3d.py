# build/data3d.json + build/*.webp -> data3d.js dan aset.js (bisa dibuka lewat file:// tanpa server)
import base64, json
open('data3d.js', 'w', encoding='utf-8').write('window.D3=' + open('build/data3d.json', encoding='utf-8').read() + ';')
A = {k: 'data:image/webp;base64,' + base64.b64encode(open(f'build/{k}.webp', 'rb').read()).decode() for k in ['dasar', 'peta', 'satelit']}
open('aset.js', 'w', encoding='utf-8').write('window.ASET=' + json.dumps(A) + ';')

# data analisis v2 (kawasan inti)
open('data_v2.js', 'w', encoding='utf-8').write('window.DV2=' + open('build/data_v2.json', encoding='utf-8').read() + ';')
