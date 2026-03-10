---
name: architect-hardware
description: Evaluates and selects hardware platforms, display technologies, SoCs, connectivity options, and power strategies for trefolio devices. Use when researching new boards, comparing display types (AMOLED, e-ink, LCD), designing a new device variant, evaluating SoCs/modules, planning battery or power budgets, or making build-vs-buy decisions for hardware components.
---

# Hardware Architect

## Scope

Own hardware architecture decisions for the trefolio device family. Evaluate platforms, select components, compare display technologies, plan power budgets, and define hardware specs that `engineer-device` implements.

## Current Device: trefolio Leaf

| Attribute | Value |
|---|---|
| **SoC** | ESP32-S3 @ 240 MHz, 16 MB QIO flash, OPI PSRAM |
| **Board** | LILYGO T4-S3 |
| **Display** | 2.41" AMOLED, 600x450, capacitive touch |
| **Connectivity** | WiFi 802.11 b/g/n |
| **Power** | USB-C (desk device, no battery) |
| **Firmware** | PlatformIO + Arduino + LVGL 8.4 |
| **Source** | `lilygo-t4s3/` directory |
| **Docs** | `docs/DEVICE_MANUFACTURING_GUIDE.md`, `docs/FIRMWARE_OTA_GUIDE.md` |

## Display Technology Matrix

When evaluating displays for new devices, compare along these axes:

| Factor | AMOLED | E-Ink (EPD) | LCD (IPS) |
|---|---|---|---|
| **Power (active)** | High (~100-200 mW) | Near-zero (draw only on refresh) | Medium (~50-150 mW) |
| **Power (static)** | Medium (pixels still lit) | Zero (bistable, holds image) | Medium (backlight on) |
| **Refresh rate** | 60+ Hz, smooth animations | 0.5–3 Hz (full), partial faster | 30–60 Hz |
| **Readability (sun)** | Poor (reflective glare) | Excellent (reflective, paper-like) | Moderate (backlight helps) |
| **Readability (dark)** | Excellent (self-emissive) | Needs front-light accessory | Good (backlight) |
| **Color** | Full RGB, vibrant | B&W, 3-color, or 7-color (limited) | Full RGB |
| **Battery life** | Hours (always-on) | Weeks/months | Days |
| **Best for** | Real-time dashboards, rich UI | Ambient displays, status boards | Cost-effective general purpose |
| **LVGL support** | Full (frame buffer) | Partial (full-refresh or partial update modes) | Full (frame buffer) |

### E-Ink Considerations for trefolio

E-ink is ideal for a "set and forget" desk widget that shows portfolio value, day change, and top movers — refreshing every 15–60 minutes. Key tradeoffs:

- No smooth animations or scrolling — design static card layouts
- Partial refresh avoids full-screen flash but may ghost over time
- Color e-ink (Waveshare 7-color) has 15–30 second refresh — impractical for interactive use
- B&W or 3-color (black/white/red) is practical for financial data (red = loss, black = gain)
- Consider Waveshare, Good Display, or LILYGO T5 series boards

## SoC / Module Comparison

| SoC | WiFi | BLE | Flash | PSRAM | Price | Arduino | Notes |
|---|---|---|---|---|---|---|---|
| **ESP32-S3** | Yes | 5.0 | 16 MB | 8 MB OPI | ~$3 | Yes | Current choice. Best ESP32 for LVGL |
| **ESP32-C3** | Yes | 5.0 | 4 MB | None | ~$1.50 | Yes | Ultra-low-cost, RISC-V, no PSRAM — limited for rich UI |
| **ESP32-C6** | Yes | 5.0 | 4 MB | None | ~$2 | Yes | Adds Thread/Zigbee, good for IoT hub |
| **nRF52840** | No | 5.0 | 1 MB | 256 KB | ~$4 | Partial | BLE-only, ultra-low-power, good with e-ink |
| **RP2040** | No* | No | 2 MB ext | 264 KB | ~$1 | Yes | No wireless (needs add-on), Raspberry Pi ecosystem |
| **STM32U5** | No | No | Up to 4 MB | Up to 2.5 MB | ~$5 | No | Ultra-low-power Cortex-M33, industrial grade |

*RP2040-W (Pico W) adds WiFi via CYW43439.

### Recommended SoCs by Device Type

| Device Type | Recommended SoC | Why |
|---|---|---|
| AMOLED desk display (Leaf) | ESP32-S3 | PSRAM for LVGL, WiFi, proven |
| E-ink ambient display | ESP32-S3 or nRF52840 | S3 if WiFi needed; nRF if BLE-phone-relay and battery life is priority |
| Low-cost badge/widget | ESP32-C3 | Cheapest WiFi option, simple UI |
| Hub / multi-protocol | ESP32-C6 | Thread + WiFi + BLE |

## Board Vendors

| Vendor | Ecosystem | Boards | Strengths |
|---|---|---|---|
| **LILYGO** | ESP32 | T4-S3, T5 (e-ink), T-Display | Wide display variety, good docs, affordable |
| **Waveshare** | Multi | E-ink modules, RP2040, ESP32 | Best e-ink selection, well-documented drivers |
| **Adafruit** | Multi | Feather, QT Py, MagTag (e-ink) | Excellent libraries, premium quality, US-based |
| **M5Stack** | ESP32 | Core, StickC, Atom, Paper | Modular, pre-enclosed, quick prototyping |
| **Seeed Studio** | Multi | XIAO series, Wio Terminal | Tiny form factor, good for wearables |

## Power Budget Template

When designing a battery-powered device, fill this template:

```
Power Budget: [Device Name]
─────────────────────────────────────
Component         Active (mA)  Sleep (µA)
SoC (WiFi TX)     ~180         ~10
SoC (BLE)         ~40          ~5
Display (on)      ~[varies]    ~0 (e-ink) / ~[varies] (LCD/AMOLED)
Sensors            ~[varies]    ~[varies]
Voltage regulator  ~[varies]    ~20
─────────────────────────────────────
Total active:      ~[sum] mA
Total sleep:       ~[sum] µA

Battery: [capacity] mAh
Active cycles: [N] per day × [T] seconds each
Sleep time: 24h − active time

Estimated battery life: [calculate]
```

## New Device Evaluation Checklist

When proposing a new trefolio device:

```
Hardware Evaluation:
- [ ] Use case defined (what data, how often, where)
- [ ] Display technology selected with tradeoff justification
- [ ] SoC selected (WiFi/BLE/power requirements)
- [ ] Dev board identified (vendor, availability, price)
- [ ] Power strategy (USB-only, battery, battery+USB)
- [ ] If battery: power budget calculated, target life defined
- [ ] Enclosure feasibility (size constraints, mounting)
- [ ] LVGL or UI framework compatibility verified
- [ ] API integration plan (reuse existing endpoints or new)
- [ ] Cost estimate (BOM per unit at 10, 100, 1000 qty)
- [ ] Firmware reuse assessment (shared code with Leaf?)
```

## Coordination

- Hand off hardware specs to `engineer-device` for firmware implementation.
- Coordinate with `designer-device` on enclosure constraints and form factor.
- Involve `pm-device` for market fit and pricing validation.
- Involve `firmware-release` when a new board type needs OTA support.
