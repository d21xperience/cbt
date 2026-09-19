#!/bin/bash

# Mendapatkan jalur direktori utama proyek (root sekolah-platform)
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE}")/.." && pwd)/cbt"
 # Beri jeda 2 detik agar backend siap
sleep 2

echo -e "\n-------------------------------------------------"

# 2. Jalankan Frontend (Quasar) di layar utama
echo "👉 Menjalankan Quasar Frontend..."
# Sesuaikan alamat menuju ke folder frontend Anda
cd "$PROJECT_DIR/frontend" || { echo "❌ Folder frontend tidak ditemukan di $PROJECT_DIR/frontend"; exit 1; }

# Fungsi otomatis untuk mematikan backend jika Anda menekan CTRL+C
trap "echo -e '\n🛑 Menghentikan semua server...'; kill $BACKEND_PID; exit" INT

# Jalankan Quasar dev server
npx quasar dev
