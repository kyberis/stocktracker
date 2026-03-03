#!/bin/bash
set -e

cd "$(dirname "$0")/.."
OUT_DIR="promo-screenshots"
VIDEO="promo-video.mp4"

IMAGES=(
  "01-login.png"
  "02-login-filled.png"
  "03-dashboard-top.png"
  "07-dashboard-light.png"
  "06-portfolio-bottom.png"
  "08-add-stock.png"
  "09-import-portfolio.png"
  "10-reset-portfolio.png"
  "14-stock-detail.png"
  "16-intelligence.png"
  "17-economic-indicators.png"
  "12-profile.png"
  "13-admin.png"
  "11-settings.png"
  "20-signup.png"
  "18-dashboard-full.png"
)

DURATION=3.5
FADE=0.8

echo "Building ${#IMAGES[@]}-slide promotional video..."

# Step 1: Create individual video clips from each image
CLIPS=()
for i in "${!IMAGES[@]}"; do
  img="${OUT_DIR}/${IMAGES[$i]}"
  clip="${OUT_DIR}/clip_$(printf '%02d' $i).mp4"
  CLIPS+=("$clip")
  ffmpeg -y -loop 1 -i "$img" -t $DURATION \
    -vf "scale=1440:900:force_original_aspect_ratio=decrease,pad=1440:900:(ow-iw)/2:(oh-ih)/2:color=0f172a" \
    -c:v libx264 -preset fast -tune stillimage -pix_fmt yuv420p -r 30 \
    "$clip" 2>/dev/null
  echo "  ✓ clip $i: ${IMAGES[$i]}"
done

# Step 2: Build xfade filter chain
# For N clips with crossfades: each clip is DURATION seconds,
# overlapping by FADE seconds at junctions.
INPUTS=""
FILTER=""
LAST=""
OFFSET=0

for i in "${!CLIPS[@]}"; do
  INPUTS="$INPUTS -i ${CLIPS[$i]}"
  if [ $i -eq 0 ]; then
    LAST="[0:v]"
  else
    OFFSET=$(echo "$DURATION * $i - $FADE * $i" | bc)
    NEXT_TAG="[xf$i]"
    FILTER="${FILTER}${LAST}[$i:v]xfade=transition=fade:duration=${FADE}:offset=${OFFSET}${NEXT_TAG};"
    LAST="$NEXT_TAG"
  fi
done

# Remove trailing semicolon
FILTER="${FILTER%;}"

echo ""
echo "Compositing ${#CLIPS[@]} clips with crossfade transitions..."

eval ffmpeg -y $INPUTS -filter_complex "\"$FILTER\"" -map "\"${LAST}\"" \
  -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p \
  "$VIDEO" 2>/dev/null

# Cleanup temp clips
for clip in "${CLIPS[@]}"; do
  rm -f "$clip"
done

echo ""
echo "✓ Video created: $VIDEO"
echo "  Duration: ~$(echo "${#IMAGES[@]} * $DURATION - (${#IMAGES[@]} - 1) * $FADE" | bc)s"
echo "  Resolution: 1440x900"
ls -lh "$VIDEO"
