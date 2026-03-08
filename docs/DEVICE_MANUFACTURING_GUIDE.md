# trefolio Device — Manufacturing Guide

> **Version:** 1.0 — March 2026
> **Initial batch:** 10–50 units
> **Scope:** LILYGO T4-S3 + custom enclosure + firmware pre-flash + premium packaging

---

## Table of Contents

1. [Product Specification](#1-product-specification)
2. [Recommended Manufacturers](#2-recommended-manufacturers)
3. [Production Phases](#3-production-phases)
4. [Firmware Preparation](#4-firmware-preparation)
5. [Cost Estimate](#5-cost-estimate)
6. [How to Contact Manufacturers](#6-how-to-contact-manufacturers)
7. [Certification & Compliance](#7-certification--compliance)
8. [Quality Control](#8-quality-control)
9. [Scaling Roadmap](#9-scaling-roadmap)

---

## 1. Product Specification

| Attribute | Detail |
|-----------|--------|
| **Board** | LILYGO T4-S3 — ESP32-S3 @ 240 MHz, 16 MB QIO flash, OPI PSRAM |
| **Display** | 2.41" AMOLED, 600×450, capacitive touch |
| **Connection** | USB-C (power + serial for firmware flashing) |
| **WiFi** | 802.11 b/g/n (built into ESP32-S3) |
| **Enclosure** | Custom-designed, branded with trefolio logo |
| **Firmware** | Pre-flashed production binary via USB-C |
| **Packaging** | Premium rigid box, magnetic closure, foam insert |

### Enclosure Design Brief

- **Material:** Soft-touch matte ABS or polycarbonate
- **Color:** Matte black or dark slate (matching `COL_BG` #0f172a from trefolio design system)
- **Finish:** Smooth, soft-touch coating — tactile quality similar to Apple TV Remote
- **Logo:** trefolio wordmark debossed or laser-etched on the back/bottom
- **Cutouts:** Display window (flush or near-flush with slight bezel), USB-C port, optional ventilation slots
- **Form factor:** Compact desk-standing device — can sit upright or lie flat
- **At 10–50 units:** 3D printed (SLA or MJF for production-grade smooth finish)
- **At 200+ units:** Injection molding (tooling cost amortized over volume)

### Packaging Design Brief

Apple-like unboxing experience — the box should feel like a gift.

- **Box:** Rigid cardboard, ~140×100×45mm, magnetic closure
- **Exterior:** Matte black with trefolio logo in emerald (#10b981) foil stamp
- **Interior:** Black EVA foam insert custom-molded to cradle the device
- **Contents:**
  1. trefolio device (in enclosure)
  2. Braided USB-C cable (1m, black)
  3. Quick-start card (printed both sides)
  4. trefolio sticker
- **Quick-start card text:**
  - Side 1: "Welcome to trefolio" with emerald accent, device illustration
  - Side 2: "1. Plug in via USB-C → 2. Connect to WiFi → 3. Enter your passkey from trefolio.app"

---

## 2. Recommended Manufacturers

### Tier 1 — Turnkey (board + enclosure + firmware + assembly)

#### 1. Makerfabs (Shenzhen)

- **Website:** makerfabs.com
- **Why:** Specializes in ESP32 PCBA, supports 1-piece to few-thousand batches, 8+ years IoT experience, ISO9001/ISO14001 certified, IPC-A-610F Class 2/3 standards
- **Services:** PCB assembly, component sourcing, firmware programming, 3D printing/CNC for custom enclosures, packaging coordination, conformal coating
- **Lead time:** 2–4 weeks for small batches
- **Contact:** makerfabs.com/service.html (direct inquiry form)
- **Capability match:** Board sourcing, enclosure prototyping (3D print → injection mold at scale), firmware flashing, functional testing, packaging coordination

#### 2. Shenzhen Xinyuan Electronic Technology (LILYGO manufacturer)

- **Website:** lilygo.cc / Alibaba store
- **Why:** They manufacture the T4-S3 — factory pricing on boards, potential for custom enclosure design, deep knowledge of the hardware
- **Bulk pricing:** ~$52/unit for T4-S3 boards (10–50 units), negotiable at higher volumes
- **Lead time:** 7–10 days (1–10 pcs), 10–15 days (11–50 pcs), negotiated for 50+
- **Ask about:** OEM enclosure design, custom silkscreen/branding on board, volume discounts

#### 3. ESP32s.com

- **Website:** esp32s.com/odm-oem-bulk-inquiry/
- **Why:** ODM/OEM specialist for ESP32 consumer products, white-label solutions, CE/FCC/RoHS certification support
- **Best for:** Future transition to a fully custom PCB (dropping LILYGO, designing own board)
- **Services:** Custom hardware design, firmware development, prototyping, certification, mass production

### Tier 2 — Packaging Specialists

Pair one of these with a Tier 1 manufacturer for the premium box.

#### 4. BrillPack (Shenzhen)

- **Website:** brillpack.com
- **Why:** Luxury rigid boxes with custom molded inserts, free structural design, specializes in premium electronics packaging
- **MOQ:** Low (50–100 boxes)
- **Services:** Magnetic closure boxes, EVA/foam inserts, hot stamping, spot UV, tissue paper, branded accessories
- **Best for:** The Apple-like unboxing experience at low volumes

#### 5. Epackfactory (Shenzhen)

- **Website:** epackfactory.com
- **Why:** 20+ years experience, 10,000 m² facility, Heidelberg 7+1 UV presses, custom inner trays, luxury gift boxes
- **Services:** Advanced printing, automated die-cutting, hot stamping, spot UV, blister packaging
- **Best for:** Scaling to higher volumes with consistent print quality

#### 6. Shenzhen Zhibang Packaging

- **Website:** zhibangpackaging.com
- **Why:** 25+ years, 17,000 m² facility, ISO 9001 and FSC certified, 500+ global brands
- **Best for:** If environmental/sustainability certification matters for your market positioning

---

## 3. Production Phases

### Phase 1: Enclosure Design (2–3 weeks)

1. Commission Makerfabs or a freelance industrial designer (Fiverr/Upwork, ~$200–500) to create a 3D model (STEP/STL) of the enclosure around the T4-S3
2. Iterate on fit: ensure USB-C port alignment, display window cutout, and internal mounting clips
3. Prototype: order 2–3 SLA/MJF 3D prints to validate fit and feel
4. Finalize: apply soft-touch coating to prototype, verify laser-etch or deboss logo quality
5. Deliverable: production-ready 3D file + material/finish specification

### Phase 2: Firmware Binary Preparation (1 day)

See [Section 4](#4-firmware-preparation) for detailed commands and file list.

### Phase 3: Assembly + Flashing (1–2 weeks)

1. Manufacturer sources or receives LILYGO T4-S3 boards
2. Firmware is flashed to each board via USB-C (~2 min/device using esptool.py or Espressif Flash Download Tool)
3. Board is assembled into custom enclosure (snap-fit or screw mount)
4. Functional test: power on → verify AMOLED displays the trefolio token entry screen
5. Pass/fail logged per unit (serial number tracking recommended)

### Phase 4: Packaging (1–2 weeks, overlaps with Phase 3)

1. Packaging manufacturer produces rigid boxes with foil stamp
2. EVA foam inserts are CNC-cut or molded to fit device
3. Quick-start cards and stickers printed
4. USB-C cables sourced (braided, 1m, black)
5. Each unit is placed in foam insert → cable in compartment → card on top → box closed
6. Outer sleeve or shrink wrap for tamper evidence (optional)

### Phase 5: Shipping (1–2 weeks)

- **Carrier:** DHL Express or FedEx for small batches (10–50 units)
- **Transit time:** 3–5 business days Shenzhen → Europe
- **Customs:** Declare as "consumer electronic device / IoT display" — HS code 8471.49 or 8528.59
- **Import duty (EU):** Typically 0–3.5% for consumer electronics from China
- **VAT:** Collected at import, reclaimable if you have a VAT number

### Total Timeline

| Phase | Duration | Parallel? |
|-------|----------|-----------|
| Enclosure design | 2–3 weeks | — |
| Firmware prep | 1 day | Yes, during Phase 1 |
| Assembly + flashing | 1–2 weeks | — |
| Packaging production | 1–2 weeks | Yes, during Phase 3 |
| Shipping | 1–2 weeks | — |
| **Total** | **5–8 weeks** | |

---

## 4. Firmware Preparation

### Build the Production Binary

```bash
cd lilygo-t4s3
pio run -e lilygo-t4-s3
```

This produces three files needed for flashing:

| File | Path | Flash Address |
|------|------|---------------|
| Bootloader | `.pio/build/lilygo-t4-s3/bootloader.bin` | `0x0` |
| Partition table | `.pio/build/lilygo-t4-s3/partitions.bin` | `0x8000` |
| Application | `.pio/build/lilygo-t4-s3/firmware.bin` | `0x10000` |

### Flashing Command (for manufacturer)

Using esptool.py (cross-platform, recommended for production):

```bash
esptool.py --chip esp32s3 --port /dev/ttyUSB0 --baud 921600 \
  write_flash \
  0x0 bootloader.bin \
  0x8000 partitions.bin \
  0x10000 firmware.bin
```

Using Espressif Flash Download Tool (Windows GUI, good for factory operators):
- Download from espressif.com/en/support/download/other-tools
- Use "Factory" mode for locked interface (prevents operator mistakes)
- Supports parallel flashing of up to 4 devices simultaneously
- Configure SPI mode: QIO, SPI speed: 80 MHz, Flash size: 16 MB

### Production Flashing Checklist

Provide this to the manufacturer along with the binary files:

```
trefolio Firmware Flashing Instructions
- Chip: ESP32-S3
- Flash size: 16 MB
- SPI mode: QIO
- Baud rate: 921600
- Connection: USB-C (CDC mode)

Files to flash:
  bootloader.bin  → address 0x0
  partitions.bin  → address 0x8000
  firmware.bin    → address 0x10000

Verification:
  After flashing, disconnect and reconnect USB-C.
  The device should display the trefolio logo and token entry screen.
  If the screen is blank or shows garbled output, re-flash.
```

---

## 5. Cost Estimate

### Per-Unit Cost (50-unit batch)

| Component | Est. Cost (USD) |
|-----------|-----------------|
| LILYGO T4-S3 board | $52 |
| Custom enclosure (3D printed SLA/MJF) | $12 |
| Firmware flashing + assembly + functional test | $5 |
| Premium packaging (rigid box, EVA insert, foil stamp) | $8 |
| USB-C cable (braided, 1m) | $2 |
| Quick-start card + sticker | $1 |
| **Subtotal per unit** | **~$80** |
| Shipping to EU (DHL, amortized per unit) | ~$8 |
| **Landed cost per unit** | **~$88** |

### Batch Cost Summary

| Batch Size | Per-Unit Cost | Total Batch Cost | Notes |
|------------|---------------|------------------|-------|
| 10 units | ~$95 | ~$950 | Higher per-unit due to setup costs |
| 25 units | ~$90 | ~$2,250 | Sweet spot for beta |
| 50 units | ~$88 | ~$4,400 | Best small-batch economics |
| 200 units | ~$70 | ~$14,000 | Injection mold enclosure kicks in |

### Pricing Strategy

| Model | Price | Margin |
|-------|-------|--------|
| Device only | 149 EUR | ~60 EUR (~68%) |
| Device + 1 year Pro subscription | 179 EUR | ~50 EUR + recurring revenue |
| Device bundled with annual Pro | 199 EUR | Premium positioning, includes 12 months Pro |

The device is a hardware anchor — its primary purpose is to drive Pro subscriptions and increase customer lifetime value.

---

## 6. How to Contact Manufacturers

### Template Email

> **Subject:** OEM inquiry — 50-unit ESP32 consumer device with custom enclosure + premium packaging
>
> Hello,
>
> We are developing a premium portfolio tracking device for European retail investors, based on the LILYGO T4-S3 (ESP32-S3, 2.41" AMOLED touchscreen).
>
> We need a manufacturing partner for the following scope:
>
> 1. **Custom enclosure** — matte black soft-touch ABS/PC, debossed logo, cutouts for display + USB-C (we provide 3D CAD files or need design support)
> 2. **Board sourcing** — LILYGO T4-S3 boards (or we can ship them to you)
> 3. **Firmware flashing** — via USB-C, we provide the binary file + flashing instructions
> 4. **Assembly** — board into enclosure, functional test (screen displays our UI after power-on)
> 5. **Premium packaging** — rigid magnetic-closure box with EVA foam insert, foil-stamped logo, includes USB-C cable and printed quick-start card
>
> **Initial order:** 50 units
> **Target timeline:** 6–8 weeks from order to delivery in Europe (DHL/FedEx)
>
> Could you please share:
> - Pricing breakdown per unit
> - Lead time for this scope
> - Minimum order quantity
> - Portfolio of similar ESP32/IoT consumer products you have manufactured
>
> We are happy to share detailed specs, 3D files, and firmware binaries once we confirm the partnership.
>
> Thank you,
> [Your name]
> trefolio — trefolio.app

### Alibaba Inquiry Tips

- Search for "ESP32 OEM" or "LILYGO T4-S3" on Alibaba
- Filter by: Verified Manufacturer, Shenzhen, Trade Assurance
- Message 3–5 suppliers simultaneously for competitive quotes
- Ask for a sample order (1–2 units) before committing to the full batch
- Use Trade Assurance for payment protection on orders over $500

### Payment Terms

| Order Size | Recommended Terms |
|------------|-------------------|
| Sample (1–5 units) | Full payment upfront via PayPal or Alibaba |
| Small batch (10–50) | 50% deposit, 50% before shipping |
| Medium batch (50–200) | 30% deposit, 60% pre-shipment, 10% post-arrival |
| Large batch (200+) | 30/60/10 split with Trade Assurance or L/C |

---

## 7. Certification & Compliance

### Required for EU Sales

| Certification | Status | Action Needed |
|---------------|--------|---------------|
| **CE marking** | LILYGO T4-S3 board is CE certified | Custom enclosure needs a Declaration of Conformity (self-declaration for small electronics) |
| **RoHS** | LILYGO boards are RoHS compliant | Verify enclosure materials are RoHS compliant |
| **WEEE** | Required for EU electronics sales | Register as a producer in your country of operation |
| **REACH** | EU chemical regulation | Enclosure material supplier should provide REACH compliance certificate |

### Phased Approach

**Phase 1 (10–50 units, beta testers):**
- Self-declare CE conformity based on LILYGO's existing certification
- Include CE and RoHS symbols on packaging
- WEEE registration can wait until commercial sales begin
- Low enforcement risk at this volume

**Phase 2 (50–200 units, commercial launch):**
- Formal CE testing at a certified lab (~500–1,500 EUR for EMC + safety)
- WEEE registration in country of operation
- Proper DoC (Declaration of Conformity) document on file
- Product liability insurance recommended

**Phase 3 (200+ units, scaling):**
- Full certification suite (CE, RoHS, REACH, WEEE)
- Consider FCC certification if expanding to US market
- Product liability insurance required

### Customs & Import

- **HS Code:** 8471.49 (other digital automatic data processing machines) or 8528.59 (other monitors)
- **EU import duty:** 0–3.5% depending on classification
- **VAT:** Collected at customs, reclaimable with VAT number
- **Documentation needed:** Commercial invoice, packing list, CE declaration, bill of lading/airway bill

---

## 8. Quality Control

### Pre-Production

- [ ] Enclosure prototype fits T4-S3 board perfectly (no rattling, USB-C aligned)
- [ ] Soft-touch finish is uniform, no visible layer lines (if 3D printed)
- [ ] Logo deboss/etch is crisp and legible
- [ ] Display window has no optical distortion

### During Production

- [ ] 100% firmware flash verification (device powers on, shows token entry screen)
- [ ] Visual inspection of enclosure assembly (no gaps, scratches, or defects)
- [ ] Touch screen responds to input through display window
- [ ] USB-C port is accessible and cable seats firmly
- [ ] Each unit passes a 30-second functional test

### Pre-Shipment

- [ ] Random sample inspection (AQL 2.5 for critical defects, AQL 4.0 for minor)
- [ ] Packaging integrity check (box closure, insert alignment, all contents present)
- [ ] Request photos/video of packed units before shipping
- [ ] Confirm shipping labels and customs documentation

### Defect Handling

- Agree on defect rate tolerance upfront (suggest < 3% for electronics)
- Manufacturer replaces defective units at their cost within tolerance
- Keep 2–3 spare units in each batch for replacements

---

## 9. Scaling Roadmap

### Volume Progression

```
10–50 units     →  3D printed enclosure, manual assembly, DHL shipping
50–200 units    →  Injection mold tooling, semi-automated flashing, air freight
200–1,000 units →  Injection mold, production line flashing (4x parallel), sea freight
1,000+ units    →  Consider custom PCB (drop LILYGO, own ESP32-S3 board design)
```

### Custom PCB Transition (1,000+ units)

At higher volumes, designing a custom PCB around the ESP32-S3 module becomes cost-effective:

| Approach | Per-Unit Board Cost | Setup Cost |
|----------|--------------------:|------------|
| LILYGO T4-S3 (off-the-shelf) | $52 | $0 |
| Custom PCB with ESP32-S3 WROOM + same AMOLED | ~$20–30 | $5,000–15,000 (NRE) |

Break-even: ~200–300 units. At 1,000 units, the custom PCB saves $20,000+.

Use ESP32s.com or Makerfabs for the custom PCB design transition.

---

*This document is a living reference. Last updated: March 2026.*
