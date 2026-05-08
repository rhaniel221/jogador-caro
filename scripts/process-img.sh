#!/bin/bash
# usage: process-img.sh <b64_json_path> <out_dir> <name> <size> [nobg=1]
#   ex: process-img.sh .playwright-mcp/foo.b64.json frontend/public/elos mestre 256 1
set -e
B64="$1"
OUTDIR="$2"
NAME="$3"
SIZE="$4"
NOBG="${5:-1}"

mkdir -p "$OUTDIR"
RAW="$OUTDIR/$NAME.raw.png"
FINAL="$OUTDIR/$NAME.png"
TMP="/tmp/jc-imgs"
mkdir -p "$TMP"

node -e "
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('$B64','utf8'));
fs.writeFileSync('$RAW', Buffer.from(data.b64, 'base64'));
"

if [ "$NOBG" = "1" ]; then
  python3 -c "
from rembg import remove
from PIL import Image
img = Image.open('$RAW')
out = remove(img)
out.save('$TMP/$NAME.nobg.png')
" 2>/dev/null

  if [ -f "$TMP/$NAME.nobg.png" ]; then
    sips -Z "$SIZE" -s format png "$TMP/$NAME.nobg.png" --out "$FINAL" >/dev/null 2>&1
    rm -f "$TMP/$NAME.nobg.png"
    echo "OK $FINAL ($SIZE) [bg removed]"
    exit 0
  fi
fi

sips -Z "$SIZE" -s format png "$RAW" --out "$FINAL" >/dev/null 2>&1
echo "OK $FINAL ($SIZE) [raw bg]"
