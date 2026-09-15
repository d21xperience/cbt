#!/bin/bash

# ==============================================================================
# BACKEND PROCESS (Expected: SILENT)
# ==============================================================================
# Masuk ke folder backend
cd backend || { echo "❌ Folder backend tidak ditemukan"; exit 1; }

# Jalankan fmt, vet, dan build secara senyap.
# Trik '> /dev/null 2>&1' digunakan untuk menyembunyikan semua teks output.
go fmt ./... > /dev/null 2>&1
go vet ./... > /dev/null 2>&1
go build ./... > /dev/null 2>&1

# Cek apakah proses backend berhasil
if [ $? -ne 0 ]; then
    echo "❌ Backend build failed!"
    exit 1
fi
# Jika sukses, bagian backend ini tidak akan memunculkan teks apa pun (SILENT)


# ==============================================================================
# FRONTEND PROCESS (Expected: Build succeeded)
# ==============================================================================
# Pindah dari folder backend ke folder frontend
cd ../frontend || { echo "❌ Folder frontend tidak ditemukan"; exit 1; }

# Jalankan npm run build (output disembunyikan agar terminal tetap bersih)
npm run build > /dev/null 2>&1

# Cek apakah proses frontend berhasil
if [ $? -eq 0 ]; then
    echo "✅ Build succeeded"
else
    echo "❌ Frontend build failed!"
    exit 1
fi
