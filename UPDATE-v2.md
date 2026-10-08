# Memperbarui dari v1

Versi v2 menambahkan animasi dan menyembunyikan scrollbar. Login kini menggunakan GitHub App OAuth dengan pemeriksaan akun Rafa55603 di server. Mode token manual v1 dihapus.

1. Cadangkan `data/content.json` dan gambar milikmu.
2. Ganti file berikut dari paket baru, dengan susunan folder yang sama:
   - `index.html`
   - `admin/index.html`
   - `assets/css/admin.css`
   - `assets/css/motion.css` (baru)
   - `assets/js/site.js`
   - `assets/js/motion.js` (baru)
   - `assets/js/github.js`
   - `assets/js/admin.js`
   - `assets/js/setup-helper.js` (baru)
   - `PANDUAN-SETUP.html`, `README.md`, dan `UPDATE-v2.md`
3. Pertahankan konten di `data/content.json`, gambar, dan pengaturan repo yang sudah benar. Tidak perlu menggantinya dengan contoh.
4. Siapkan folder backend `cloudflare-worker` melalui panduan setup. Folder itu dipasang di Cloudflare, bukan sebagai backend GitHub Pages.
5. Tambahkan `"adminApiUrl": "https://WORKER-MILIKMU.workers.dev"` ke config.json. Jangan menambahkan client secret atau token ke file ini.
6. Commit dan tunggu Pages selesai. Buka admin, pilih Masuk dengan GitHub, lalu pilih Rafa55603.

Cara upload website tidak berubah. Penyiapan backend hanya dilakukan sekali untuk mengaktifkan login OAuth; animasi dan halaman publik bisa berjalan terlebih dahulu.
