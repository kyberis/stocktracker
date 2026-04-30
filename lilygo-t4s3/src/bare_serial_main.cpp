/**
 * Zero-LilyGo heartbeat — verifies ESP32-S3 + USB CDC + sketch run before layering display/LVGL.
 *
 * Upload:   pio run -e bare-serial --target upload
 *           pio run -e bare-serial-nopsram --target upload   ; if PSRAM/SPIRAM bring-up loops
 */
#include <Arduino.h>
#include <esp_system.h>

void setup()
{
    Serial.begin(115200);
    delay(800);
    Serial.printf("\n[bare-serial] reset_reason=%d\n", (int)esp_reset_reason());
    Serial.printf("[bare-serial] heap_free=%u\n", (unsigned)ESP.getFreeHeap());
#ifdef BOARD_HAS_PSRAM
    Serial.printf("[bare-serial] psram_size=%u\n", (unsigned)ESP.getPsramSize());
#endif
    Serial.flush();
}

void loop()
{
    Serial.printf("[bare-serial] tick ms=%lu\n", (unsigned long)millis());
    delay(1000);
}
