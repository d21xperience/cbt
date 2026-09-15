#!/bin/bash
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# 1. Masuk ke folder backend
cd ..
cd backend || { echo "Gagal masuk ke folder backend"; exit 1; }

# 2. Nama file database (sesuaikan dengan cfg.DbSource Anda)
DB_NAME="cbt.db"

echo "=== Memulai Migrasi Database SQLite ==="

# 3. Looping untuk menjalankan semua file .up.sql secara berurutan
for file in migrations/*_*.up.sql; do
    # Memastikan file benar-benar ada
    [ -e "$file" ] || { echo "Tidak ditemukan file migrasi (.up.sql)."; break; }
    
    echo "Menjalankan: $file ..."
    
    # Menjalankan perintah sqlite3
    sqlite3 "$DB_NAME" < "$file"
    
    # Mengecek apakah perintah sqlite3 berhasil atau eror
    if [ $? -eq 0 ]; then
        echo "✅ Sukses: $file"
    else
        echo "❌ Gagal saat menjalankan: $file"
        exit 1
    fi
done

echo "=== Semua migrasi berhasil dijalankan! ==="
