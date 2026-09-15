#!/bin/bash

# Mendapatkan jalur direktori utama proyek (root sekolah-platform)
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE}")/.." && pwd)"

echo "================================================="
echo "🚀 MEMULAI SERVER PENGEMBANGAN (DEVELOPMENT) "
echo "================================================="

# 1. Jalankan Backend (Golang) di latar belakang
echo "👉 Menjalankan Golang Backend Server..."
# Sesuaikan alamat menuju ke folder backend Anda
cd "$PROJECT_DIR/backend" || { echo "❌ Folder backend tidak ditemukan di $PROJECT_DIR/backend"; exit 1; }
go run ./cmd/server &
BACKEND_PID=$! 

# Beri jeda 2 detik agar backend siap
sleep 2

echo -e "\n-------------------------------------------------"

# 2. Jalankan Frontend (Quasar) di layar utama
echo "👉 Menjalankan Quasar Frontend..."
# Sesuaikan alamat menuju ke folder apps/siakad-tu Anda
cd "$PROJECT_DIR/frontend" || { echo "❌ Folder frontend tidak ditemukan di $PROJECT_DIR/apps/siakad-tu"; exit 1; }

# Fungsi otomatis untuk mematikan backend jika Anda menekan CTRL+C
trap "echo -e '\n🛑 Menghentikan semua server...'; kill $BACKEND_PID; exit" INT

# Jalankan Quasar dev server
npx quasar dev
