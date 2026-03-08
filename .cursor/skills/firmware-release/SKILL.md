---
name: firmware-release
description: Builds, releases, and rolls back LILYGO T4-S3 firmware versions using PlatformIO, GitHub Releases, and Vercel env vars. Use when releasing firmware, deploying a device update, bumping FW_VERSION, creating a firmware tag, or rolling back a bad firmware release.
---

# Firmware Release

## Scope

Execute the complete firmware release or rollback for the LILYGO T4-S3 device. Every step uses exact file paths and commands from the repository -- do not improvise or substitute alternatives.

For background on the OTA architecture, partition layout, and device-side behavior, see [docs/FIRMWARE_OTA_GUIDE.md](docs/FIRMWARE_OTA_GUIDE.md).

## Release Workflow

Copy this checklist and track progress:

```
Firmware Release:
- [ ] Step 1: Pre-release checks
- [ ] Step 2: Bump FW_VERSION
- [ ] Step 3: Build both targets
- [ ] Step 4: Local test (simulator)
- [ ] Step 5: Commit and release
- [ ] Step 6: Set Vercel env vars
- [ ] Step 7: Verify rollout
```

### Step 1: Pre-release checks

Run these commands and confirm all pass:

```bash
cd lilygo-t4s3
pio run -e lilygo-t4-s3
pio run -e simulator
```

Read the current version:

```bash
grep 'FW_VERSION' lilygo-t4s3/src/config.h
```

This prints: `constexpr const char *FW_VERSION = "X.Y.Z";`

Ask the user what the new version number should be. Use semver:
- **Major** (`X+1.0.0`): breaking changes to device behavior or API contract
- **Minor** (`X.Y+1.0`): new features, new UI screens, new API endpoints consumed
- **Patch** (`X.Y.Z+1`): bug fixes, layout tweaks, performance improvements

GATE: Do not proceed if either build fails. Fix the error first.

### Step 2: Bump FW_VERSION

Edit exactly this line in `lilygo-t4s3/src/config.h` (line 18):

```cpp
constexpr const char *FW_VERSION = "X.Y.Z";
```

Replace `X.Y.Z` with the new version. Do not change any other line in the file.

### Step 3: Build both targets

```bash
cd lilygo-t4s3
pio run -e lilygo-t4-s3
pio run -e simulator
```

GATE: Both must exit 0. If either fails, the version bump may have introduced a problem -- investigate and fix before continuing.

### Step 4: Local test (simulator)

Run the simulator to verify the dashboard loads:

```bash
./lilygo-t4s3/.pio/build/simulator/program
```

This requires a graphical environment (macOS or Linux with display). Verify:
- Token entry screen appears
- After entering a valid passkey, the dashboard loads with portfolio data
- The LIVE indicator pulses green

If the user skips this step, note it was skipped and proceed.

### Step 5: Commit and release

Two options. Ask the user which they prefer:

**Option A: Automated (recommended)** -- uses the helper script:

```bash
git add lilygo-t4s3/src/config.h
git commit -m "firmware: bump to vX.Y.Z"
./scripts/firmware-release.sh --gh-release
```

The script will:
1. Build the device firmware
2. Compute SHA-256 checksum and file size
3. Create git tag `fw-vX.Y.Z`
4. Push the tag to origin
5. Create a GitHub Release with `firmware-t4s3-X.Y.Z.bin` attached
6. Print the download URL, SHA-256, and size

Capture these three values from the output -- they are needed for Step 6.

**Option B: CI-driven** -- push the tag manually and let GitHub Actions build:

```bash
git add lilygo-t4s3/src/config.h
git commit -m "firmware: bump to vX.Y.Z"
git tag fw-vX.Y.Z
git push origin main --tags
```

The workflow at `.github/workflows/firmware-release.yml` triggers on `fw-v*` tags. It:
1. Verifies `FW_VERSION` in `config.h` matches the tag
2. Builds with `pio run -e lilygo-t4-s3`
3. Creates a GitHub Release with the binary
4. Prints SHA-256, size, and env var values in the GitHub Actions summary

Retrieve the values from the GitHub Actions run summary or the release page.

GATE: Confirm the GitHub Release exists and has a `.bin` file attached before proceeding.

### Step 6: Set Vercel environment variables

Set exactly these 5 environment variables on Vercel. Values come from Step 5 output -- do not guess or fabricate any value.

| Variable | Source |
|----------|--------|
| `FIRMWARE_LATEST_VERSION` | The version string (e.g. `1.1.0`) |
| `FIRMWARE_LATEST_URL` | GitHub Release download URL for the `.bin` file |
| `FIRMWARE_LATEST_SHA256` | SHA-256 hex digest from build output |
| `FIRMWARE_LATEST_SIZE` | File size in bytes from build output |
| `FIRMWARE_LATEST_NOTES` | User-provided release notes (ask the user) |

The server endpoint at `src/app/api/device/firmware/route.ts` reads these env vars via `process.env.FIRMWARE_LATEST_*`. If `FIRMWARE_LATEST_VERSION` or `FIRMWARE_LATEST_URL` is empty, the endpoint returns `{ available: false }` and no devices will update.

Tell the user to set these in the Vercel dashboard (Settings > Environment Variables) or via CLI:

```bash
vercel env add FIRMWARE_LATEST_VERSION production
vercel env add FIRMWARE_LATEST_URL production
vercel env add FIRMWARE_LATEST_SHA256 production
vercel env add FIRMWARE_LATEST_SIZE production
vercel env add FIRMWARE_LATEST_NOTES production
```

After setting, trigger a redeploy for the env vars to take effect.

### Step 7: Verify rollout

Test that the server returns the correct firmware metadata:

```bash
curl -s -H "Authorization: Bearer <test-passkey>" \
  "https://trefolio.com/api/device/firmware?v=0.0.0&board=t4s3" | jq .
```

Expected response:

```json
{
  "available": true,
  "version": "X.Y.Z",
  "url": "https://github.com/.../firmware-t4s3-X.Y.Z.bin",
  "sha256": "...",
  "size": 1433669,
  "releaseNotes": "..."
}
```

If `available` is `false`, the env vars are not set or the version comparison failed.

Devices check for updates on boot and every 6 hours. All devices will adopt the new version within that window.

---

## Staged Rollout

By default, 100% of devices receive the update. To do a gradual rollout, set:

```
FIRMWARE_ROLLOUT_PERCENT=10
```

This uses a deterministic hash of the user's ID, so the same device always gets a consistent answer (no flip-flopping). Recommended progression:

1. Set `FIRMWARE_ROLLOUT_PERCENT=10` -- 10% of devices get the update
2. Monitor `trefolio_device_errors_total{fw_version="X.Y.Z"}` in Grafana/Prometheus for 24-48 hours
3. If error rate is acceptable, increase to `25`, then `50`, then `100`
4. If errors spike, set back to `0` and investigate

The rollout percentage is read from `process.env.FIRMWARE_ROLLOUT_PERCENT` in `src/app/api/device/firmware/route.ts`.

---

## Monitoring

### Prometheus metrics (scrape `/api/metrics`)

| Metric | Labels | What it tells you |
|--------|--------|-------------------|
| `trefolio_device_firmware_checks_total` | `current_version`, `board` | How many devices are on each firmware version |
| `trefolio_device_api_calls_total` | `fw_version`, `route`, `status` | API call volume per firmware version |
| `trefolio_device_errors_total` | `fw_version`, `error_type` | Errors reported by devices per firmware version |
| `trefolio_device_heartbeats_total` | `fw_version`, `status` | Heartbeat pings per firmware version |

### Key queries for Grafana

Version distribution (how many devices on each version):

```promql
sum by (current_version) (rate(trefolio_device_firmware_checks_total[1h]))
```

Error rate per firmware version:

```promql
sum by (fw_version) (rate(trefolio_device_errors_total[1h]))
```

Compare error rates between old and new firmware:

```promql
sum by (fw_version, error_type) (increase(trefolio_device_errors_total[24h]))
```

### Heartbeat endpoint

Devices can POST to `POST /api/device/heartbeat` with:

```json
{
  "status": "ok",
  "errors": [
    { "type": "wifi_disconnect", "message": "..." },
    { "type": "api_timeout", "message": "..." }
  ],
  "uptimeSeconds": 86400
}
```

This increments `trefolio_device_heartbeats_total` and `trefolio_device_errors_total` counters per firmware version.

---

## Rollback Workflow

### Server-side rollback (subtle bugs, wrong behavior)

If the new firmware works but has a bug that doesn't crash the device:

1. Find the previous version's release on GitHub Releases
2. Update the 5 `FIRMWARE_LATEST_*` env vars on Vercel to point to the previous version's values
3. Redeploy

Devices will "downgrade" to the previous version on their next check (within 6 hours or on reboot).

### Disable OTA entirely

To stop all updates immediately, clear the env vars:

```bash
vercel env rm FIRMWARE_LATEST_VERSION production
vercel env rm FIRMWARE_LATEST_URL production
```

With these empty, the endpoint returns `{ available: false }` and no device will attempt an update.

### Automatic rollback (crashes)

If the new firmware crashes before calling `ota_mark_valid()`:

- The ESP32 bootloader tracks consecutive failed boots
- After 3 failed boots, it automatically reverts to the previous OTA partition
- No server-side action needed -- the device recovers on its own
- `ota_mark_valid()` is called in `main.cpp` only after a successful portfolio API fetch

---

## Critical Rules

- NEVER fabricate a SHA-256 hash, file size, or download URL. These must come from actual build output.
- NEVER edit `src/app/api/device/firmware/route.ts` to hardcode firmware values. All values come from `FIRMWARE_LATEST_*` environment variables.
- NEVER push a `fw-v*` tag if `FW_VERSION` in `config.h` does not match. The CI workflow will reject it.
- NEVER skip the dual-target build verification (both `lilygo-t4-s3` and `simulator` must compile).
- ALWAYS ask the user for the new version number and release notes. Do not assume.

## Key Files

| File | Role |
|------|------|
| `lilygo-t4s3/src/config.h` | `FW_VERSION` constant (line 18) |
| `lilygo-t4s3/src/ota_updater.cpp` | Device-side OTA download and rollback logic |
| `lilygo-t4s3/src/api_client.cpp` | `api_check_firmware_update()` calls the server |
| `lilygo-t4s3/src/stocks.h` | `FirmwareInfo` struct definition |
| `src/app/api/device/firmware/route.ts` | Server endpoint, reads `FIRMWARE_LATEST_*` env vars, rollout % gating |
| `src/app/api/device/heartbeat/route.ts` | Device error reporting and health check endpoint |
| `src/lib/metrics.ts` | Prometheus counters for device firmware, errors, heartbeats |
| `scripts/firmware-release.sh` | Local build + tag + GitHub Release helper |
| `.github/workflows/firmware-release.yml` | CI: builds on `fw-v*` tag, creates GitHub Release |
| `docs/FIRMWARE_OTA_GUIDE.md` | Full OTA architecture and troubleshooting reference |

## Coordination

- If the firmware release includes user-visible features, invoke the `release-manager` skill to add web release notes.
- If firmware code changes are needed before release, invoke the `engineer-device` skill.
- If the release changes data sent to the server or consumes new API fields, involve `engineer-integrations`.
