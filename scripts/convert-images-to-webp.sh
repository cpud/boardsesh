#!/usr/bin/env bash
set -euo pipefail

# Convert board background PNGs to WebP format for smaller file sizes.
# Requires: cwebp (install via `brew install webp` or `apt install webp`)
#
# Keeps original PNGs alongside WebP files.
# Run this after adding new board images: `bun run convert-images`

if ! command -v cwebp &> /dev/null; then
  echo "Error: cwebp not found. Install with: brew install webp"
  exit 1
fi

IMAGES_DIR="packages/web/public/images"
CONVERTED=0
SKIPPED=0

find "$IMAGES_DIR" -name "*.png" -type f | while read -r png_file; do
  webp_file="${png_file%.png}.webp"

  # Skip if WebP already exists and is newer than the PNG
  if [ -f "$webp_file" ] && [ "$webp_file" -nt "$png_file" ]; then
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  echo "Converting: $png_file"
  cwebp -q 90 -alpha_q 100 "$png_file" -o "$webp_file" -quiet
  CONVERTED=$((CONVERTED + 1))
done

echo "Done. Converted: $CONVERTED, Skipped (already up-to-date): $SKIPPED"
