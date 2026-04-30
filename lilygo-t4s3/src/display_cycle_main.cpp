/**
 * Cycles full-screen RGB565 colours (no LVGL / no Wi‑Fi).
 * If this stays black while Serial shows "display-cycle OK", the failure is almost
 * certainly hardware (OLED supply, FPC, or dead panel) — see LilyGo issue #72 / #54.
 *
 * Build & flash:
 *   pio run -e display-cycle --target upload --upload-port /dev/cu.usbmodemXXXX
 */
#include <Arduino.h>
#include <esp_heap_caps.h>
#include <LilyGo_AMOLED.h>

LilyGo_Class amoled;

static void fill_colour(uint16_t rgb565)
{
    const uint16_t w = amoled.width();
    const uint16_t h = amoled.height();
    const uint32_t pix = static_cast<uint32_t>(w) * static_cast<uint32_t>(h);

    auto *whole =
        reinterpret_cast<uint16_t *>(heap_caps_malloc(pix * sizeof(uint16_t), MALLOC_CAP_SPIRAM));

    if (whole) {
        for (uint32_t i = 0; i < pix; ++i)
            whole[i] = rgb565;
        amoled.pushColors(0, 0, w, h, whole);
        heap_caps_free(whole);
        return;
    }

    constexpr uint16_t stripe_h = 60;
    const uint32_t stripe_px =
        static_cast<uint32_t>(w) * static_cast<uint32_t>(stripe_h);

    auto *stripe =
        reinterpret_cast<uint16_t *>(malloc(stripe_px * sizeof(uint16_t)));
    if (!stripe)
        return;

    for (uint32_t i = 0; i < stripe_px; ++i)
        stripe[i] = rgb565;

    uint16_t y = 0;
    while (y < h) {
        uint16_t rh = stripe_h;
        if (static_cast<uint32_t>(y) + rh > static_cast<uint32_t>(h))
            rh = static_cast<uint16_t>(static_cast<uint32_t>(h) - y);

        if (rh < stripe_h) {
            free(stripe);
            const uint32_t tail_px = static_cast<uint32_t>(w) * static_cast<uint32_t>(rh);
            stripe = reinterpret_cast<uint16_t *>(malloc(tail_px * sizeof(uint16_t)));
            if (!stripe)
                return;
            for (uint32_t i = 0; i < tail_px; ++i)
                stripe[i] = rgb565;
        }

        amoled.pushColors(0, y, w, rh, stripe);
        y += rh;
        if (rh < stripe_h)
            break;
    }
    free(stripe);
}

void setup()
{
    Serial.begin(115200);
    delay(400);

    Serial.println("\n=== display-cycle ===");

    if (!amoled.beginAMOLED_241(true /*disable_sd*/, false)) {
        Serial.println("[FAIL] beginAMOLED_241");
        while (true)
            delay(300);
    }

    amoled.disp_wakeup();
    delay(150);

    /** Repeated brightness writes occasionally revive DIM/zero NVM brightness traces */
    amoled.setBrightness(255);
    delay(50);
    amoled.setBrightness(255);

    Serial.printf("[OK] %dx%d %s board=%u psram_free=%u\n", amoled.width(), amoled.height(),
                  amoled.getName(), static_cast<unsigned>(amoled.getBoardID()),
                  static_cast<unsigned>(ESP.getFreePsram()));

    Serial.println("Cycling RED→GREEN→BLUE every 3s — watch panel + Serial.");
}

void loop()
{
    static uint8_t step;
    uint16_t c = 0xF800;
    const char *name = "RED";

    switch (step % 3) {
    case 0:
        c = 0xF800;
        name = "RED";
        break;
    case 1:
        c = 0x07E0;
        name = "GREEN";
        break;
    case 2:
        c = 0x001F;
        name = "BLUE";
        break;
    }

    Serial.printf("Fill %s (0x%04X)\n", name, static_cast<unsigned>(c));
    fill_colour(c);
    step++;

    delay(3000);
}
