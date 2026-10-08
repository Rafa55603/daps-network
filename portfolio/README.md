# Daps Network v2

Portofolio Rafalea Daffa Abhista. Frontend HTML, CSS, dan JavaScript murni, tanpa proses build.

**Mulai dari PANDUAN-SETUP.html**. Jika sudah memakai v1, baca UPDATE-v2.md agar konten pribadi tidak tertimpa.

## Fitur

- Latar gelap dan dot-matrix dengan partikel jaringan, scan line, glitch ringan, reveal saat scroll, serta glow/tilt pada kartu.
- Scrollbar tersembunyi; scroll mouse, keyboard, dan sentuhan tetap berfungsi. Efek menghormati prefers-reduced-motion, berhenti saat tab/hero tidak terlihat, dan dibersihkan saat berganti halaman.
- Proyek, blog, detail konten, profil, kontak, pencarian, dan filter.
- Editor admin untuk profil/proyek/artikel, pratinjau Markdown, ekspor/impor JSON.
- Login melalui GitHub App. Cloudflare Worker memverifikasi ID admin Rafa55603 (72209248) dan kepemilikan repo di setiap permintaan konten.
- Tidak ada kolom personal access token lagi. GitHub client secret dan token tetap di server. Browser hanya memegang sesi sementara di memori.

## Isi paket

Upload isi folder `portfolio` ke root repo GitHub Pages. Deploy folder `cloudflare-worker` sebagai backend terpisah. Backend memerlukan binding D1 bernama DB, GitHub App, serta variabel/secret yang dijelaskan di panduan. Repo contoh: Rafa55603/daps-network, branch main.

Website publik bisa berjalan sebelum backend dipasang. Login akan menjelaskan bahwa setup belum selesai jika adminApiUrl kosong. Mengubah config.json tidak dapat memberikan hak admin; otorisasi dilakukan Worker.

## Batas dan status

- Deployment Cloudflare dan GitHub App belum dilakukan pada akun pengguna. Login dan publish live harus diuji setelah setup selesai.
- Pengujian backend memakai respons GitHub dan D1 simulasi; tidak ada klaim login nyata sudah berhasil.
- Proyek/artikel awal adalah contoh; email dan tautan sosial belum diberikan.
- Gambar diunggah lewat GitHub ke assets/, lalu URL/path diisi di editor.
- Konten publik tersimpan di data/content.json. Editor lokal pada localhost tidak bisa menerbitkan ke server.
- GitHub Pages memakai hash routes; SEO/social preview individual artikel memerlukan prerender tambahan.
- Untuk localhost: `python -m http.server 4173 --bind 127.0.0.1` dari folder portfolio. Jangan membuka index.html melalui file://.

Font Doto disertakan lokal dengan SIL Open Font License di assets/fonts/OFL-Doto.txt. Layout terinspirasi cifertech.net; identitas, kode, dan isi portofolio disiapkan untuk Daps Network.
