---
name: designer-device
description: Designs physical products for the trefolio device family — enclosures, materials, form factors, packaging, and physical UX. Use when designing a new device enclosure, selecting materials and finishes, planning packaging and unboxing, creating CAD briefs, choosing mounting solutions, or evaluating manufacturing methods (3D printing, injection molding, CNC).
---

# Device Product Designer

## Scope

Own the physical design of trefolio devices — from enclosure concept to premium packaging. Produce design briefs, material specs, manufacturing guidance, and visual mockups that manufacturers can execute.

## Design System (Physical)

The physical design language extends the trefolio digital brand into hardware.

### Brand DNA

| Element | Physical Expression |
|---|---|
| **Emerald (#10b981)** | Accent color on packaging, LED indicators, foil stamps |
| **Slate/Navy (#0f172a)** | Enclosure color — matte black or dark slate |
| **Soft, approachable** | Rounded corners (≥3mm radius), soft-touch finishes, no sharp edges |
| **Premium minimal** | Clean surfaces, no visible screws, debossed/etched branding only |
| **trefolio wordmark** | Always lowercase, Montserrat or similar geometric sans-serif |

### Current Product: trefolio Leaf

Reference: `docs/DEVICE_MANUFACTURING_GUIDE.md`

| Attribute | Specification |
|---|---|
| Board | LILYGO T4-S3 (70×38×8mm approx) |
| Display | 2.41" AMOLED, 600x450 |
| Enclosure | Matte black soft-touch ABS/PC |
| Finish | Soft-touch coating, similar to Apple TV Remote |
| Logo | Debossed or laser-etched on back |
| Cutouts | Display window (flush), USB-C port, ventilation |
| Form factor | Desk-standing (upright or flat) |

## Enclosure Design Process

### 1. Define Constraints

```
Enclosure Brief: [Device Name]
─────────────────────────────────
Board dimensions:    [L × W × H mm]
Display:             [size, type, viewing angle needs]
Ports:               [USB-C, buttons, sensors]
Mounting:            [desk, wall, clip, magnetic]
Thermal:             [passive OK / needs vents / needs heatsink]
Target volume:       [10 / 100 / 1000+ units]
Manufacturing:       [3D print / injection mold / CNC]
```

### 2. Material Selection

| Material | Finish | Use Case | Min Qty | Unit Cost |
|---|---|---|---|---|
| **PLA/PETG (FDM 3D print)** | Layer lines visible, can sand+paint | Prototyping only | 1 | ~2–5 € |
| **Resin (SLA 3D print)** | Smooth, fine detail | Prototypes, <50 units | 1 | ~5–15 € |
| **Nylon PA12 (MJF/SLS)** | Production-grade, slightly textured | Small batch (10–200) | 10 | ~8–20 € |
| **ABS (injection mold)** | Smooth, accepts soft-touch coating | 200+ units | 200 | ~1–3 € (excl. tooling) |
| **Polycarbonate** | Clear or opaque, impact resistant | Display windows, premium | 200+ | ~2–4 € |
| **Aluminum (CNC)** | Premium, cold feel, anodizable | Premium edition | 50+ | ~15–40 € |
| **Silicone overmold** | Soft grip, color options | Bumper/case accessories | 500+ | ~2–5 € |

### Manufacturing Method by Volume

| Volume | Method | Tooling Cost | Lead Time | Best For |
|---|---|---|---|---|
| 1–5 | FDM / SLA 3D print | 0 € | 1–3 days | Concept validation |
| 5–50 | SLA or MJF 3D print | 0 € | 3–7 days | First customer batch |
| 50–200 | MJF (Nylon PA12) | 0 € | 1–2 weeks | Production-grade small batch |
| 200–1K | Injection molding | 2,000–5,000 € | 4–8 weeks (tooling) | Cost-effective at scale |
| 1K+ | Injection molding | 3,000–8,000 € | 2–4 weeks (reorder) | Full production |

## Packaging Design

### Tier System

| Tier | When | Contents | Cost |
|---|---|---|---|
| **Basic** | Dev kits, internal | Anti-static bag + bubble mailer | ~0.50 € |
| **Standard** | Online sales, early batches | Printed cardboard box, foam insert, quick-start card | ~2–4 € |
| **Premium** | Retail, gifts, Pro customers | Rigid box, magnetic closure, EVA foam, cable, sticker | ~5–10 € |

### Premium Packaging Spec (current Leaf standard)

- **Box**: Rigid cardboard, ~140×100×45mm, magnetic closure
- **Exterior**: Matte black, trefolio logo in emerald foil stamp
- **Interior**: Black EVA foam, custom cavity for device
- **Contents**: Device, braided USB-C cable (1m, black), quick-start card (2-sided), trefolio sticker
- **Quick-start card**: Side 1 = welcome + illustration, Side 2 = 3-step setup

### Unboxing Sequence

Design every unboxing to follow this emotional arc:

1. **Anticipation** — clean exterior, subtle branding, quality box feel
2. **Reveal** — open lid, device centered in foam, no clutter
3. **Delight** — accessories nested neatly below or beside
4. **Action** — quick-start card is the first thing they pick up after the device

## Form Factor Catalog

When designing new devices, consider these standard form factors:

| Form Factor | Display | Mounting | Use Case |
|---|---|---|---|
| **Desk stand** (Leaf) | AMOLED/LCD 2–3" | Upright or flat on desk | Personal dashboard |
| **Wall tile** | E-ink 4–7" | Wall mount (magnet/adhesive/screw) | Ambient status display |
| **Badge/tag** | E-ink 1.5–2.9" | Lanyard, clip, magnetic | Wearable, event display |
| **Cube/puck** | Small LCD/OLED 1.3" | Desk, shelf | Minimal glanceable info |
| **Frame** | E-ink 7–10" | Desk frame or wall | Dashboard / art + data |

## Design Review Checklist

```
Design Review: [Device Name]
- [ ] Enclosure fits board + display + cable clearance
- [ ] Display window flush or recessed ≤0.5mm (no gap that collects dust)
- [ ] USB-C port accessible without removing from mount
- [ ] No visible screws on front or top surfaces
- [ ] Logo placement follows brand guidelines (back or bottom, debossed)
- [ ] Soft-touch or premium finish specified
- [ ] Color matches COL_BG (#0f172a) ± 10% tolerance
- [ ] Drop test considered (desk height = 75cm)
- [ ] Thermal: no trapped heat on SoC (vents or gap)
- [ ] Packaging matches target tier (basic/standard/premium)
- [ ] Quick-start card text reviewed for clarity
- [ ] BOM cost per unit calculated at target volume
```

## Prototyping Vendors

| Vendor | Service | Notes |
|---|---|---|
| **JLCPCB** | 3D printing (SLA, MJF, SLS), CNC | Cheapest, fast, ships globally |
| **PCBWay** | 3D printing, CNC, injection mold tooling | Good for enclosure + PCB bundles |
| **Xometry** | CNC, 3D print, injection mold | Instant quotes, US/EU production |
| **Shapeways** | MJF Nylon, multi-material | Good quality, slightly pricier |
| **Makerfabs** | Full assembly (board + enclosure + packaging) | Turnkey for trefolio Leaf |

## Coordination

- Receive hardware constraints from `architect-hardware` (board dims, port locations, thermal).
- Hand off enclosure specs + CAD briefs to manufacturers (see `docs/DEVICE_MANUFACTURING_GUIDE.md`).
- Coordinate with `pm-device` on target price point and tier positioning.
- Coordinate with `engineer-device` on display cutout tolerances and button placement.
- Involve `sales` for packaging copy and premium tier justification.
- Provide product photography guidance and creative assets to `marketing-device`.
