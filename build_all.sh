#!/bin/bash

# ==============================================================================
# BACKEND PROCESS (Expected: SILENT)
# ==============================================================================
echo "⚙️  Processing backend..."

# Masuk ke folder backend
cd backend || { echo "❌ Folder backend tidak ditemukan"; exit 1; }

# Jalankan go fmt, vet, dan build secara senyap (output dialihkan ke /dev/null)
# Perintah tetap akan memunculkan eror jika kode Anda ada yang salah/rusak.
go fmt ./... > /dev/null 2>&1
go vet ./... > /dev/null 2>&1
go build ./... > /dev/null 2>&1

# Cek apakah proses backend sukses
if [ $? -eq 0 ]; then
    # Tetap senyap, tidak memunculkan teks sukses sesuai permintaan (SILENT)
    :
else
    echo "❌ Backend build failed!"
    exit 1
fi


# ==============================================================================
# FRONTEND PROCESS (Expected: Build succeeded)
# ==============================================================================
echo "📦 Processing frontend..."

# Keluar dari backend lalu masuk ke folder frontend
cd ../frontend || { echo "❌ Folder frontend tidak ditemukan"; exit 1; }

# Jalankan npm run build (output disembunyikan agar rapi)
npm run build > /dev/null 2>&1

# Cek apakah proses frontend sukses
if [ $? -eq 0 ]; then
    echo "✅ Build succeeded"
else
    echo "❌ Frontend build failed!"
    exit 1
fi
