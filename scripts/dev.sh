#!/bin/sh
# 一鍵開發環境：啟動 Firebase 模擬器(Firestore/Auth/Storage + UI)後執行 Vite，
# Vite 結束時模擬器一併關閉，並將資料匯出保留至下次啟動。
set -e

# firebase-tools 模擬器需要 JDK 21+；若系統 java 過舊，優先用 Homebrew 的 openjdk@21
for JDK in /usr/local/opt/openjdk@21/bin /opt/homebrew/opt/openjdk@21/bin; do
  if [ -d "$JDK" ]; then
    export PATH="$JDK:$PATH"
    break
  fi
done

SEED_DIR=./.emulator-seed-data
IMPORT_FLAG=""
if [ -d "$SEED_DIR" ]; then
  IMPORT_FLAG="--import=$SEED_DIR"
fi

exec npx firebase-tools emulators:exec \
  --project demo-kinohastea \
  $IMPORT_FLAG \
  --export-on-exit="$SEED_DIR" \
  --ui \
  "vite"
