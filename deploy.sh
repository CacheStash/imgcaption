#!/bin/bash

# --- KONFIGURASI ---

# 1. Ambil Nama Folder Project (Otomatis)
PROJECT_NAME=$(basename "$PWD")

# 2. Tentukan Folder Tujuan
# Folder induk bernama "backups" ada satu level di atas
BACKUP_ROOT="../backups"
# Folder spesifik untuk project ini di dalam folder induk
TARGET_DIR="$BACKUP_ROOT/$PROJECT_NAME"

# 3. Jumlah history yang disimpan
MAX_BACKUPS=5

# 4. Nama File
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_FILENAME="${PROJECT_NAME}_${TIMESTAMP}.tar.gz"
FULL_PATH="$TARGET_DIR/$BACKUP_FILENAME"

# --- ACTION ---

echo "📂 Project: $PROJECT_NAME"
echo "📂 Lokasi Backup: $TARGET_DIR"
echo ""

# KONFIRMASI BACKUP
read -p "❓ Buat backup ke folder '$TARGET_DIR'? (y/n) " -n 1 -r
echo    # Pindah baris
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    # 1. Buat struktur folder
    mkdir -p "$TARGET_DIR"

    echo "📦 Sedang mengompres..."

    # 2. Compress (Backup Fisik)
    # Exclude folder berat
    tar --exclude='node_modules' --exclude='.git' --exclude='.next' --exclude='dist' --exclude='.vscode' -czf "$FULL_PATH" .

    # 3. ROTASI (Hapus backup lama)
    cd "$TARGET_DIR"
    ls -t *.tar.gz 2>/dev/null | tail -n +$((MAX_BACKUPS + 1)) | xargs -I {} rm -- "{}" 2>/dev/null
    cd - > /dev/null

    echo "✅ Backup tersimpan rapi di folder $PROJECT_NAME!"
else
    echo "⏩ Backup dilewati oleh user."
fi

echo ""

# 4. Git Push (Selalu dijalankan)
echo "🚀 Mengirim ke GitHub/Vercel..."
git add .
COMMIT_MSG="${1:-update $TIMESTAMP}"
git commit -m "$COMMIT_MSG"
git push origin main

echo "🎉 Selesai!"