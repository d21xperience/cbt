#!/bin/bash

# 1. Menambahkan semua perubahan berkas
echo "📦 Menambahkan perubahan..."
git add .

# Mendapatkan daftar file yang berubah untuk generate komen otomatis
CHANGES=$(git status --porcelain | awk '{print $2}' | paste -sd, -)

# Jika tidak ada perubahan, batalkan proses
if [ -z "$CHANGES" ]; then
    echo "✨ Tidak ada perubahan yang terdeteksi. Git bersih!"
    exit 0
fi

# 2. Generate komen otomatis berdasarkan waktu dan file yang dimodifikasi
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
COMMIT_MSG="Auto-commit pada $TIMESTAMP. Berkas berubah: $CHANGES"

# Memotong komentar jika terlalu panjang agar rapi
if [ ${#COMMIT_MSG} -gt 150 ]; then
    COMMIT_MSG="Auto-commit pada $TIMESTAMP. Banyak berkas diperbarui."
fi

echo "📝 Membuat commit: \"$COMMIT_MSG\""
git commit -m "$COMMIT_MSG"

# 3. Melakukan push ke GitHub
echo "🚀 Mengunggah ke GitHub (origin main)..."
git push origin main

echo "✅ Selesai! Semua perubahan berhasil di-push."
