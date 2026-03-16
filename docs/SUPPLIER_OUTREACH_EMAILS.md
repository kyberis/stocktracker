# trefolio Device — Supplier Outreach Emails

> **Date prepared:** March 8, 2026
> **Goal:** Request 1 sample unit from device assemblers, 1 sample box from packaging suppliers, and pricing for a 50-unit batch.

---

## Response Tracking


| #   | Supplier         | Type      | Email                                                 | Sent | Replied | Sample Cost | 50-Unit Quote | Lead Time | Notes |
| --- | ---------------- | --------- | ----------------------------------------------------- | ---- | ------- | ----------- | ------------- | --------- | ----- |
| 1   | Makerfabs        | Assembly  | [sales@makerfabs.com](mailto:sales@makerfabs.com)     | DONE |         |             |               |           |       |
| 2   | LILYGO / Xinyuan | Assembly  | [orders@lilygo.cc](mailto:orders@lilygo.cc)           | DONE |         |             |               |           |       |
| 3   | ESP32s.com       | Assembly  | [info@esp32s.com](mailto:info@esp32s.com)             | DONE |         |             |               |           |       |
| 4   | BrillPack        | Packaging | [info@brillpack.com](mailto:info@brillpack.com)       | DONE | YES     |             |               | Sample 7-10d, Production 15-20d | Confirmed magnetic box style, offers structural + EVA design, semi-manual at low MOQ |
| 5   | Epackfactory     | Packaging | [info@epackfactory.com](mailto:info@epackfactory.com) | DONE |         |             |               |           |       |


---

## Email 1 — Makerfabs (Turnkey Assembly)

**To:** [sales@makerfabs.com](mailto:sales@makerfabs.com)
**Subject:** Sample request — premium ESP32-S3 consumer device with custom enclosure

---

Hello Makerfabs team,

I'm building **trefolio**, a premium desk-mounted portfolio tracker for European retail investors. The device is based on the **LILYGO T4-S3** (ESP32-S3, 2.41" AMOLED touchscreen, USB-C) and I'm looking for a manufacturing partner who can handle the full assembly process.

I chose to reach out to you because of your deep experience with ESP32 projects and your turnkey PCBA capabilities.

### What I need

1. **Custom enclosure** — matte black, soft-touch ABS or polycarbonate (similar finish to an Apple TV Remote). The enclosure wraps around the LILYGO T4-S3 with cutouts for the display and USB-C port, and our "trefolio" logo debossed or laser-etched on the back. I can provide 3D CAD files, or I'd welcome your design support if you offer enclosure design services.
2. **Board sourcing** — LILYGO T4-S3 boards. Can you source these directly, or should I ship them to you?
3. **Firmware flashing** — I provide the binary files and flashing instructions. Flashing is via USB-C using esptool.py (~2 minutes per device).
4. **Assembly** — board into enclosure, snap-fit or screw mount.
5. **Functional test** — power on each unit and verify the AMOLED displays our UI (the trefolio login screen).
6. **Packaging** (if possible) — premium rigid box with magnetic closure, black EVA foam insert, foil-stamped logo. If this is outside your scope, could you recommend a packaging partner in Shenzhen?

### Quality bar

This is a consumer product, not a dev kit. The finish quality should feel premium — think Apple, Teenage Engineering, or Nothing. Clean lines, no visible seams or layer lines, smooth soft-touch coating. People should love holding it.

### What I'm asking for now

- **1 sample unit** — fully assembled (board + enclosure + firmware flashed), shipped to Europe. I want to evaluate the build quality before committing to a larger order.
- **Pricing for 50 units** — per-unit breakdown (board, enclosure, assembly, testing) so I can compare.
- **Lead time** for both the sample and the 50-unit batch.
- **Portfolio examples** of similar ESP32/IoT consumer products you've built, if available.

I'm happy to share detailed specs, 3D files, firmware binaries, and the device UI mockup as soon as we agree to move forward.

This is the start of what I hope will be a long-term partnership — we plan to scale to 200+ units after validating the first batch.

Thank you,
[Your name]
trefolio — [https://trefolio.com](https://trefolio.com)

---

## Email 2 — LILYGO / Xinyuan (Board Manufacturer)

**To:** [orders@lilygo.cc](mailto:orders@lilygo.cc) (CC: [info@lilygo.cc](mailto:info@lilygo.cc))
**Subject:** OEM inquiry — custom enclosure + assembly for T4-S3 device

---

Hello LILYGO team,

I'm reaching out because we are building a consumer product based on your **T4-S3 board** and I'd like to explore whether we can work together beyond just purchasing the board.

Our product is called **trefolio** — it's a premium desk-mounted portfolio tracker for European investors. The T4-S3's AMOLED display and compact form factor are perfect for our use case. We've already built the firmware and it runs great on the T4-S3.

### What I need

Since you manufacture the T4-S3, I believe you're in the best position to help with:

1. **T4-S3 boards at factory/OEM pricing** — we'll need 50 units for our first batch, scaling to 200+ after that.
2. **Custom enclosure design** — do you offer OEM enclosure design services for the T4-S3? We need a premium matte black soft-touch case (ABS or PC) with display cutout, USB-C port access, and our "trefolio" logo on the back. The quality standard is Apple-level: smooth, tactile, beautiful.
3. **Firmware pre-flashing** — we provide the .bin files. Can your factory flash our firmware onto the boards before shipping?
4. **Assembly** — board mounted into the custom enclosure, with a functional power-on test.
5. **Custom silkscreen or branding** — is it possible to add our brand to the board itself (e.g., custom silkscreen on the PCB)?

### What I'm asking for now

- **1 sample T4-S3 board** at your best OEM price, so I can verify our firmware works perfectly on your latest production revision.
- **Pricing for 50 boards** (and 200 boards if you can quote both).
- Whether you can provide **enclosure design + assembly + flashing** as a service, or if you recommend we work with a separate assembly partner.
- **Lead time** for each option.

We are a European startup building a premium fintech device. The T4-S3 is the heart of our product and we'd love to build a direct relationship with your team.

Thank you,
[Your name]
trefolio — [https://trefolio.com](https://trefolio.com)

---

## Email 3 — ESP32s.com (ODM/OEM Specialist)

**To:** [info@esp32s.com](mailto:info@esp32s.com)
**Subject:** ODM partnership inquiry — premium ESP32-S3 consumer device for European market

---

Hello ESP32s team,

I'm building a consumer electronics product called **trefolio** — a premium desk-mounted portfolio tracker for European retail investors. The device uses an ESP32-S3 with a 2.41" AMOLED touchscreen (currently based on the LILYGO T4-S3) and connects to our cloud platform via WiFi to display real-time portfolio data and AI-powered insights.

I found your ODM/OEM service page and I'm interested in exploring a partnership, both for our immediate needs and for the longer term.

### Immediate need (LILYGO T4-S3 based)

For our first production run, we're using the off-the-shelf LILYGO T4-S3 board. I need:

1. **Custom enclosure** — premium matte black soft-touch finish (ABS/PC), debossed logo, cutouts for display and USB-C. Think Apple product quality.
2. **Board sourcing** — LILYGO T4-S3 (or can you source an equivalent ESP32-S3 + 2.41" AMOLED module?).
3. **Firmware flashing + assembly + functional testing** — we provide the binary, you flash and assemble.
4. **Premium packaging** — rigid magnetic box with EVA insert (or you can recommend a packaging partner).

### Future opportunity (custom PCB)

Once we validate the product with 50-200 units, we plan to design a **custom PCB** around the ESP32-S3 WROOM module with the same AMOLED display. This would reduce per-unit cost significantly and give us more control over the form factor. I'd be very interested in your custom hardware design and certification services (CE, RoHS) for this transition.

### What I'm asking for now

- **1 fully assembled sample** (T4-S3 + custom enclosure + our firmware), shipped to Europe.
- **Pricing for 50 units** with per-unit breakdown.
- Whether you can handle the full scope (enclosure + assembly + packaging) or if your strength is more on the PCB/ODM side.
- **Lead time** for the sample and for a 50-unit batch.
- A rough estimate for **custom PCB design** (ESP32-S3 + 2.41" AMOLED) NRE cost, so I can plan the transition.

We're targeting a premium retail price of 149-199 EUR per device in the European market. The product quality must match that positioning.

Thank you,
[Your name]
trefolio — [https://trefolio.com](https://trefolio.com)

---

## Email 4 — BrillPack (Premium Packaging)

**To:** [info@brillpack.com](mailto:info@brillpack.com)
**Subject:** Sample request — premium rigid box for consumer electronics device

---

Hello BrillPack team,

I'm developing a premium consumer electronics product called **trefolio** — a small desk-mounted device (approximately 80 x 55 x 15 mm) that we're selling to European retail investors at 149-199 EUR. The unboxing experience is critical to our brand — we want it to feel like opening an Apple product.

### Box specification

- **Type:** Rigid box with magnetic closure
- **Outer dimensions:** approximately 140 x 100 x 45 mm
- **Exterior:** Matte black paper/cardboard with our "trefolio" logo in **emerald green (#10b981) foil stamp** — clean, minimal, premium
- **Interior:** Black EVA foam insert, custom-molded to cradle:
  - The device (approximately 80 x 55 x 15 mm)
  - A braided USB-C cable (coiled, in a lower compartment or side slot)
- **Included printed materials:** A quick-start card (credit-card sized, printed both sides, 350gsm) placed on top of the device
- **Extras:** One branded sticker (trefolio logo, 40mm circle, emerald on black)
- **Optional:** Black tissue paper wrap, outer sleeve, or shrink wrap for tamper evidence

### Quality reference

The closest reference is the packaging for Apple AirPods or Nothing Ear — compact, rigid, magnetic, with a satisfying open/close feel. Matte black with a single foil-stamped logo. Minimal but luxurious.

### What I'm asking for

1. **1 sample box** — with the magnetic closure, EVA insert (can be generic shape for now), and matte black finish with foil stamp in emerald green. I want to feel the quality before ordering.
2. **Pricing for 50 boxes** — per-unit cost with all components (box, insert, foil stamp, quick-start card printing, sticker).
3. **Pricing for 200 boxes** — so I can plan for scaling.
4. **Lead time** for both the sample and a 50-unit production run.
5. Whether you offer **structural design support** — I have the device dimensions but would appreciate your expertise on optimal box layout and insert design.

I can provide our logo files (SVG/AI), exact device dimensions, and Pantone/hex color references once we proceed.

Thank you,
[Your name]
trefolio — [https://trefolio.com](https://trefolio.com)

---

## Email 5 — Epackfactory (Premium Packaging)

**To:** [info@epackfactory.com](mailto:info@epackfactory.com)
**Subject:** Custom premium packaging inquiry — small electronics device, sample + 50-unit quote

---

Hello Epackfactory team,

I'm developing a premium consumer electronics device called **trefolio** — a compact desk-mounted portfolio tracker sold at 149-199 EUR to European investors. I'm looking for a packaging partner who can deliver a luxury unboxing experience at small batch volumes.

I was impressed by your 20+ years of experience and advanced printing capabilities (Heidelberg presses, hot stamping, die-cutting). That's exactly the quality level I need.

### Box specification

- **Type:** Rigid box with magnetic closure
- **Outer dimensions:** approximately 140 x 100 x 45 mm
- **Exterior finish:** Matte black with our "trefolio" logo applied via **hot stamping in emerald green foil** (Pantone 3395 C / hex #10b981). Minimal design — just the logo centered on the lid.
- **Interior:** Black EVA foam insert, CNC-cut or custom-molded to hold:
  - The device (approximately 80 x 55 x 15 mm)
  - A braided USB-C cable (1m, coiled)
- **Printed insert:** Quick-start card, approximately 85 x 55 mm, 350gsm, printed both sides in full color (dark background with emerald accents)
- **Sticker:** 40mm circle, emerald green logo on black background
- **Feel:** The box should feel substantial and satisfying to open — similar to Apple AirPods Pro or Nothing Ear packaging

### What I'm asking for

1. **1 sample box** — with magnetic closure, matte black exterior, emerald foil stamp (can use placeholder logo text if needed), and a generic EVA insert. I need to evaluate the material quality, magnetic strength, and overall feel.
2. **Pricing for 50 boxes** — full spec including box, EVA insert, foil stamping, quick-start card, and sticker.
3. **Pricing for 200 boxes** — for comparison and scaling planning.
4. **Lead time** for sample and for 50-unit production.
5. **MOQ** — is 50 boxes feasible for the first run, or is your minimum higher?

I'll provide logo files (SVG/AI format), exact device CAD dimensions for the insert mold, and print-ready artwork for the quick-start card once we agree to proceed.

Thank you,
[Your name]
trefolio — [https://trefolio.com](https://trefolio.com)

---

## Next Steps After Sending

1. **Send all 5 emails** on the same day — this lets you compare responses side by side
2. **Track responses** in the table at the top of this document
3. **Expect replies** within 12-48 hours (Epackfactory is fastest at 12h, others at 24h)
4. **Compare on:** sample cost, 50-unit pricing, lead time, communication quality, portfolio/references
5. **Order 1 sample** from the best-looking Tier 1 supplier and 1 sample box from the best Tier 2 supplier
6. **Evaluate samples** when they arrive (2-3 weeks): build quality, finish, packaging feel
7. **Negotiate** the 50-unit order with the winning suppliers based on sample quality

### What to share after first reply

Once a supplier responds positively, send them:

- trefolio logo files (SVG and AI format)
- Device dimensions (from LILYGO T4-S3 datasheet)
- Enclosure 3D CAD files (if available) or ask for their design service
- Firmware binary files + flashing instructions (see `docs/DEVICE_MANUFACTURING_GUIDE.md` Section 4)
- Reference photos of the device UI (screenshot of `lilygo-t4s3/mockup-redesign.html`)
- Color reference: emerald green = Pantone 3395 C / hex #10b981

