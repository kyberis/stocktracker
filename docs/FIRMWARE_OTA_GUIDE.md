# Firmware OTA Deployment & Rollback Guide

This document covers the complete lifecycle of firmware updates for the LILYGO T4-S3 device: how builds work, how updates reach customer devices, how rollback protects against bad releases, and how to operate the system day-to-day.

---

## Architecture Overview

```
┌─────────────┐     ┌──────────────────┐     ┌───────────────────┐
│  Developer   │────▶│  GitHub Actions   │────▶│  GitHub Releases  │
│  (tag push)  │     │  (build + upload) │     │  (firmware .bin)  │
└─────────────┘     └──────────────────┘     └────────┬──────────┘
                                                       │
                                                       │ download URL
                                                       ▼
┌─────────────┐     ┌──────────────────┐     ┌───────────────────┐
│  T4-S3      │────▶│  trefolio.com    │────▶│  GET /api/device/ │
│  Device     │     │  (Next.js API)   │     │  firmware?v=X&    │
│             │◀────│                  │◀────│  board=t4s3       │
└─────────────┘     └──────────────────┘     └───────────────────┘
      │
      │ if update available:
      │ 1. Download .bin from GitHub Releases
      │ 2. Write to alternate OTA partition
      │ 3. Reboot
      │ 4. Validate → mark valid or rollback
      ▼
```

## How the Device Checks for Updates

The device checks for firmware updates at two points:

1. **On every boot** — immediately after WiFi connects, before showing the dashboard
2. **Every 6 hours** — periodically in the main loop

The check flow:

```
Device → GET /api/device/firmware?v=1.0.0&board=t4s3
         Authorization: Bearer <passkey>

Server → Compares device version against LATEST_FIRMWARE
       → Returns { available: true, version, url, sha256, size }
       → Or { available: false }
```

### Key files

| File | Purpose |
|------|---------|
| `lilygo-t4s3/src/ota_updater.cpp` | Device-side OTA download, verification, and reboot |
| `lilygo-t4s3/src/ota_updater.h` | Public API: `ota_check_and_update()`, `ota_mark_valid()` |
| `lilygo-t4s3/src/config.h` | `FW_VERSION` compile-time constant |
| `lilygo-t4s3/src/api_client.cpp` | `api_check_firmware_update()` — HTTP call to server |
| `lilygo-t4s3/src/stocks.h` | `FirmwareInfo` struct |
| `src/app/api/device/firmware/route.ts` | Server endpoint returning latest firmware metadata |

---

## ESP32 Partition Layout

The device uses `default_16MB.csv` with dual OTA slots:

| Partition | Type | Size | Purpose |
|-----------|------|------|---------|
| `nvs` | data | 20 KB | Non-volatile storage (WiFi creds, token, settings) |
| `otadata` | data | 8 KB | Tracks which OTA slot is active |
| `app0` | app | ~6.25 MB | OTA slot 0 (primary) |
| `app1` | app | ~6.25 MB | OTA slot 1 (secondary) |
| `spiffs` | data | ~3.4 MB | Template JSON files, static assets |

The firmware alternates between `app0` and `app1`. When an update is applied, it writes to the **inactive** slot, then reboots into it. The previous working firmware remains in the other slot as a fallback.

---

## Rollback Protection

The ESP32's built-in rollback mechanism prevents bricked devices:

### How it works

1. After OTA writes the new firmware and reboots, the new partition is in **`ESP_OTA_IMG_PENDING_VERIFY`** state
2. The firmware must explicitly call **`ota_mark_valid()`** to confirm it works
3. `ota_mark_valid()` is only called **after the first successful portfolio API fetch** — meaning WiFi, TLS, authentication, and data parsing all work
4. If the device crashes or fails to mark valid after 3 consecutive boots, the bootloader **automatically rolls back** to the previous partition

### Timeline of a successful update

```
Boot 1 (new firmware):
  → WiFi connects ✓
  → API fetch succeeds ✓
  → ota_mark_valid() called → firmware confirmed
  → Device continues normally

All subsequent boots use the new firmware.
```

### Timeline of a failed update

```
Boot 1 (new firmware):
  → Crash or API fetch fails
  → Device reboots (watchdog or panic)

Boot 2 (new firmware, attempt 2):
  → Same failure → reboot

Boot 3 (new firmware, attempt 3):
  → Same failure → reboot

Boot 4:
  → Bootloader detects 3 failures
  → Automatically boots PREVIOUS firmware
  → Device recovers with old working version
```

### Manual rollback

If a firmware is marked valid but has a subtle bug (doesn't crash, but behaves wrong):

1. Update the `FIRMWARE_LATEST_*` env vars on the server to point to the **previous** version
2. All devices will "update" back to the previous version on their next check (within 6 hours, or on next reboot)

---

## Release Process

### Prerequisites

- PlatformIO CLI installed (`pip install platformio`)
- GitHub CLI installed (`gh`)
- Write access to the repository

### Step 1: Bump the firmware version

Edit `lilygo-t4s3/src/config.h`:

```cpp
constexpr const char *FW_VERSION = "1.1.0";  // was "1.0.0"
```

### Step 2: Build the firmware

```bash
cd lilygo-t4s3
pio run -e lilygo-t4-s3
```

The binary is at `.pio/build/lilygo-t4-s3/firmware.bin`.

### Step 3: Create a release (automated)

Tag and push — GitHub Actions will build, compute checksums, and create a release:

```bash
git add -A
git commit -m "firmware: bump to v1.1.0"
git tag fw-v1.1.0
git push origin main --tags
```

The CI workflow (`.github/workflows/firmware-release.yml`) will:
1. Build the firmware in a reproducible environment
2. Compute the SHA-256 checksum
3. Create a GitHub Release with the `.bin` attached
4. Print the URL, SHA-256, and size for you to update the server config

### Step 4: Update the server config

Set the environment variables on Vercel (or your hosting):

```bash
FIRMWARE_LATEST_VERSION=1.1.0
FIRMWARE_LATEST_URL=https://github.com/<org>/stocktracker/releases/download/fw-v1.1.0/firmware-t4s3-1.1.0.bin
FIRMWARE_LATEST_SHA256=<sha256 from CI output>
FIRMWARE_LATEST_SIZE=<size in bytes>
FIRMWARE_LATEST_NOTES=Bug fixes and performance improvements
```

Or use the helper script:

```bash
./scripts/firmware-release.sh 1.1.0 .pio/build/lilygo-t4-s3/firmware.bin
```

### Step 5: Verify rollout

Monitor the `X-Firmware-Version` header in server logs. Devices will pick up the update within:
- **Immediately** if rebooted
- **Up to 6 hours** if running continuously

---

## Staged Rollouts

Rollouts are controlled by the `FIRMWARE_ROLLOUT_PERCENT` env var (0-100, default 100).

### How it works

The server hashes `"fw-rollout:" + userId` with SHA-256, takes the first 2 bytes as a number mod 100, and compares against the percentage. This is deterministic -- the same user always gets the same result, so devices don't flip between "update available" and "no update".

### Recommended rollout process

| Step | `FIRMWARE_ROLLOUT_PERCENT` | Duration | Action |
|------|---------------------------|----------|--------|
| 1 | `10` | 24-48 hours | Monitor error rate in Prometheus/Grafana |
| 2 | `25` | 24 hours | Check `trefolio_device_errors_total` by version |
| 3 | `50` | 12 hours | Confirm no regression |
| 4 | `100` | Permanent | Full rollout |

### Pausing a rollout

Set `FIRMWARE_ROLLOUT_PERCENT=0` to stop the rollout. Devices that already updated stay on the new version (OTA doesn't downgrade automatically unless you change `FIRMWARE_LATEST_VERSION` to a previous version).

---

## Monitoring

### Prometheus metrics

All metrics are exposed at `GET /api/metrics` and can be scraped by Prometheus or Grafana Cloud.

| Metric | Labels | Description |
|--------|--------|-------------|
| `trefolio_device_firmware_checks_total` | `current_version`, `board` | Firmware check requests per device version |
| `trefolio_device_api_calls_total` | `fw_version`, `route`, `status` | API calls from devices, labeled by firmware version |
| `trefolio_device_errors_total` | `fw_version`, `error_type` | Errors reported by devices via heartbeat |
| `trefolio_device_heartbeats_total` | `fw_version`, `status` | Heartbeat pings from devices |

### Key PromQL queries

**Firmware version distribution** (which versions are active):
```promql
sum by (current_version) (rate(trefolio_device_firmware_checks_total[1h]))
```

**Error rate per firmware version** (is the new version causing more errors?):
```promql
sum by (fw_version) (rate(trefolio_device_errors_total[1h]))
```

**Compare error rates between versions** (side-by-side):
```promql
sum by (fw_version, error_type) (increase(trefolio_device_errors_total[24h]))
```

**API success rate per firmware version**:
```promql
sum by (fw_version) (rate(trefolio_device_api_calls_total{status="attempt"}[1h]))
```

### Device heartbeat endpoint

Devices can report health to `POST /api/device/heartbeat`:

```json
{
  "status": "ok",
  "errors": [
    { "type": "wifi_disconnect", "message": "Connection lost after 2h" },
    { "type": "api_timeout", "message": "Portfolio fetch timed out" }
  ],
  "uptimeSeconds": 86400
}
```

Error types are freeform strings defined by the firmware. Common ones:
- `wifi_disconnect` -- WiFi connection dropped
- `api_timeout` -- HTTP request timed out
- `api_error` -- Non-200 API response
- `ota_failed` -- OTA update download or verification failed
- `tls_error` -- TLS handshake failure

---

## Troubleshooting

### Device is not updating

| Symptom | Cause | Fix |
|---------|-------|-----|
| Device stays on old version | Firmware URL is empty or env vars not set | Check `FIRMWARE_LATEST_URL` env var |
| Device checks but gets `{ available: false }` | Version comparison thinks device is up-to-date | Verify `FW_VERSION` in device vs `FIRMWARE_LATEST_VERSION` on server |
| Download starts but fails | Binary URL unreachable or TLS issue | Ensure URL is HTTPS and cert chain is valid |
| Update applies but device rolls back | New firmware crashes or can't reach API | Check serial logs; the new firmware likely has a bug |
| OTA returns "Not enough space" | Binary too large for partition | Optimize firmware size; current limit is ~6.25 MB |

### Forcing an update check

The device checks on boot. To force an immediate check:
- Power-cycle the device, or
- Wait for the 6-hour periodic check

### Reading device logs

Connect via USB and open serial monitor at 115200 baud:

```bash
cd lilygo-t4s3
pio device monitor
```

OTA-related logs are prefixed with `[OTA]`:

```
[OTA] Update available: 1.1.0 (1433669 bytes)
[OTA] Update to 1.1.0 successful. Rebooting...
```

Or on failure:

```
[OTA] No update available or check failed.
[OTA] Firmware download HTTP 404
[OTA] Not enough space: 7000000 bytes needed
```

---

## Security Considerations

- Firmware binaries are downloaded over **HTTPS with TLS certificate verification** (ISRG Root X1 pinned)
- The device authenticates with its **Bearer token** before receiving firmware metadata
- The server never exposes firmware URLs to unauthenticated requests
- SHA-256 checksum verification is available in the `FirmwareInfo` struct (to be enforced in a future update for integrity checking after download)
- NVS stores the firmware version string; the actual binary integrity is managed by the ESP32 bootloader's partition verification
