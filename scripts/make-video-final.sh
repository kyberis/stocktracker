#!/bin/bash
set -e

cd "$(dirname "$0")/.."
OUT_DIR="promo-screenshots"
VIDEO="promo-video.mp4"

# Full sequence with durations: "filename:duration"
SLIDES=(
  "00-title.png:4.5"
  "s01-auth.png:2.0"
  "01-login.png:3.0"
  "02-login-filled.png:3.0"
  "20-signup.png:3.0"
  "s02-dashboard.png:2.0"
  "03-dashboard-top.png:3.5"
  "07-dashboard-light.png:3.0"
  "s03-holdings.png:2.0"
  "06-portfolio-bottom.png:3.0"
  "08-add-stock.png:3.0"
  "09-import-portfolio.png:3.0"
  "10-reset-portfolio.png:3.0"
  "s04-analysis.png:2.0"
  "14-stock-detail.png:3.5"
  "16-intelligence.png:3.0"
  "s05-macro.png:2.0"
  "17-economic-indicators.png:3.5"
  "s06-settings.png:2.0"
  "12-profile.png:3.0"
  "13-admin.png:3.0"
  "11-settings.png:3.0"
  "99-outro.png:4.5"
)

FADE=0.6
COUNT=${#SLIDES[@]}

echo "Building ${COUNT}-slide promotional video..."

# Step 1: Create individual video clips
CLIPS=()
DURS=()
for i in "${!SLIDES[@]}"; do
  IFS=':' read -r img dur <<< "${SLIDES[$i]}"
  clip="${OUT_DIR}/clip_$(printf '%02d' $i).mp4"
  CLIPS+=("$clip")
  DURS+=("$dur")
  ffmpeg -y -loop 1 -i "${OUT_DIR}/${img}" -t "$dur" \
    -vf "scale=1440:900:force_original_aspect_ratio=decrease,pad=1440:900:(ow-iw)/2:(oh-ih)/2:color=0f172a" \
    -c:v libx264 -preset fast -tune stillimage -pix_fmt yuv420p -r 30 \
    "$clip" 2>/dev/null
  echo "  ✓ clip $i (${dur}s): ${img}"
done

# Step 2: Build xfade filter chain
INPUTS=""
FILTER=""
LAST=""
CUMUL_OFFSET=0

for i in "${!CLIPS[@]}"; do
  INPUTS="$INPUTS -i ${CLIPS[$i]}"
  if [ $i -eq 0 ]; then
    LAST="[0:v]"
    CUMUL_OFFSET=$(echo "${DURS[0]} - $FADE" | bc)
  else
    NEXT_TAG="[xf$i]"
    FILTER="${FILTER}${LAST}[$i:v]xfade=transition=fade:duration=${FADE}:offset=${CUMUL_OFFSET}${NEXT_TAG};"
    LAST="$NEXT_TAG"
    CUMUL_OFFSET=$(echo "$CUMUL_OFFSET + ${DURS[$i]} - $FADE" | bc)
  fi
done

FILTER="${FILTER%;}"

echo ""
echo "Compositing ${COUNT} clips with fade transitions..."

eval ffmpeg -y $INPUTS -filter_complex "\"$FILTER\"" -map "\"${LAST}\"" \
  -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p \
  "$VIDEO" 2>/dev/null

# Cleanup temp clips
for clip in "${CLIPS[@]}"; do
  rm -f "$clip"
done

TOTAL=$(echo "$CUMUL_OFFSET + $FADE" | bc)

echo ""
echo "✓ Promotional video created: $VIDEO"
echo "  Duration: ~${TOTAL}s"
echo "  Resolution: 1440x900"
echo "  Slides: $COUNT"
ls -lh "$VIDEO"
