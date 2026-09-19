#!/bin/bash
# Mendapatkan jalur direktori utama proyek (root sekolah-platform)
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE}")/.." && pwd)/cbt"

# Sesuaikan alamat menuju ke folder backend Anda
cd "$PROJECT_DIR/backend" || { echo "❌ Folder backend tidak ditemukan di $PROJECT_DIR/backend"; exit 1; }

# Jalankan fmt, vet, dan build secara senyap (SILENT)
go fmt ./... > /dev/null 2>&1
go vet ./... > /dev/null 2>&1
go build ./... > /dev/null 2>&1

# Cek status keberhasilan
if [ $? -eq 0 ]; then
    echo "✅ Backend build succeeded (SILENT mode)"
else
    echo "❌ Backend build failed!"
    exit 1
fi


echo "================================================="
echo "🚀 MEMULAI SERVER PENGEMBANGAN (DEVELOPMENT) "
echo "================================================="
# Jalankan Backend (Golang) di latar belakang
echo "👉 Menjalankan Golang Backend Server..."

go run ./cmd/server &
BACKEND_PID=$! 

