/**
 * Minimal display bring-up — full-screen solid RGB565 colour.
 *
 * Upload: pio run -e display-test --target upload
 * Switch back to app:    pio run -e lilygo-t4-s3 --target upload
 */
#include <Arduino.h>
#include <esp_heap_caps.h>
#include <LilyGo_AMOLED.h>

LilyGo_Class amoled;

static void pixel_push_or_chunk(uint16_t rgb565)
{
    const uint16_t w = amoled.width();
    const uint16_t h = amoled.height();
    const uint32_t pix = static_cast<uint32_t>(w) * static_cast<uint32_t>(h);

    auto *whole = reinterpret_cast<uint16_t *>(
        heap_caps_malloc(pix * sizeof(uint16_t), MALLOC_CAP_SPIRAM));

    if (whole) {
        for (uint32_t i = 0; i < pix; ++i)
            whole[i] = rgb565;
        amoled.pushColors(0, 0, w, h, whole);
        heap_caps_free(whole);
        Serial.println("[display-test] full-screen pushColors (PSRAM)");
        return;
    }

    constexpr uint16_t kStripeH = 40;
    const uint32_t stripePix = static_cast<uint32_t>(w) * kStripeH;

    auto *stripe = reinterpret_cast<uint16_t *>(malloc(stripePix * sizeof(uint16_t)));
    if (!stripe) {
        Serial.println("[display-test] stripe alloc FAILED");
        return;
    }
    for (uint32_t i = 0; i < stripePix; ++i)
        stripe[i] = rgb565;

    uint16_t y = 0;
    while (y < h) {
        uint16_t rh = kStripeH;
        if (static_cast<uint32_t>(y) + rh > static_cast<uint32_t>(h))
            rh = static_cast<uint16_t>(static_cast<uint32_t>(h) - y);

        if (rh < kStripeH) {
            const uint32_t tailPix = static_cast<uint32_t>(w) * static_cast<uint32_t>(rh);
            free(stripe);
            stripe = reinterpret_cast<uint16_t *>(malloc(tailPix * sizeof(uint16_t)));
            if (!stripe) {
                Serial.println("[display-test] tail alloc FAILED");
                return;
            }
            for (uint32_t i = 0; i < tailPix; ++i)
                stripe[i] = rgb565;
        }

        amoled.pushColors(0, y, w, rh, stripe);
        y += rh;
        if (rh < kStripeH)
            break;
    }
    free(stripe);
    Serial.println("[display-test] striped pushColors (SRAM)");
}

void setup()
{
    Serial.begin(115200);
    delay(300);
    Serial.println("\n[trefolio] display-test (solid fill, no LVGL)");

    if (!amoled.beginAMOLED_241(true /*disable_sd*/, false)) {
        Serial.println("[display-test] beginAMOLED_241 FAILED");
        while (true)
            delay(500);
    }

    amoled.disp_wakeup();
    delay(120);
    amoled.setBrightness(255);

    const uint16_t w = amoled.width();
    const uint16_t h = amoled.height();
    Serial.printf("[display-test] panel %dx%d id=%u name=%s\n", w, h,
                  (unsigned)amoled.getBoardID(), amoled.getName());
    Serial.printf("[display-test] psram_total=%u free=%u heap=%u\n",
                  static_cast<unsigned>(ESP.getPsramSize()),
                  static_cast<unsigned>(ESP.getFreePsram()),
                  static_cast<unsigned>(ESP.getFreeHeap()));

    /** Bright magenta (RGB565): easy to distinguish from blacks / boot garbage. */
    pixel_push_or_chunk(0xF81Fu);

    Serial.println("[display-test] done — screen should be solid magenta.");
}

void loop()
{
    static uint32_t t;
    if (millis() - t > 3000) {
        t = millis();
        Serial.printf("[display-test] alive heap=%u\n",
                      static_cast<unsigned>(ESP.getFreeHeap()));
    }
}
