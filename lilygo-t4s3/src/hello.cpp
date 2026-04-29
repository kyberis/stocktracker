#ifdef HELLO_WORLD

#include <Arduino.h>
#include <LilyGo_AMOLED.h>
#include <LV_Helper.h>

LilyGo_Class amoled;

static lv_obj_t *banner_label = nullptr;
static lv_obj_t *counter_label = nullptr;

void setup() {
    Serial.begin(115200);
    delay(200);
    Serial.println();
    Serial.println("=========================================");
    Serial.println(" trefolio Leaf - HELLO WORLD diagnostic ");
    Serial.println("=========================================");

    Serial.printf("Free heap before display init: %u\n", ESP.getFreeHeap());
    Serial.printf("Free PSRAM before display init: %u\n", ESP.getFreePsram());

    Serial.println("Calling amoled.begin() ...");
    if (!amoled.begin()) {
        Serial.println("AMOLED init FAILED. Halting.");
        while (1) {
            delay(1000);
            Serial.println("(amoled.begin() returned false)");
        }
    }

    Serial.printf("AMOLED OK -> %dx%d  board=%s\n",
                  amoled.width(), amoled.height(), amoled.getName());

    amoled.setBrightness(180);

    Serial.println("Initializing LVGL helper ...");
    beginLvglHelper(amoled);

    lv_obj_t *scr = lv_scr_act();
    lv_obj_set_style_bg_color(scr, lv_color_hex(0x0f172a), 0);
    lv_obj_set_style_bg_opa(scr, LV_OPA_COVER, 0);

    banner_label = lv_label_create(scr);
    lv_label_set_text(banner_label, "trefolio");
    lv_obj_set_style_text_color(banner_label, lv_color_hex(0x10b981), 0);
    lv_obj_set_style_text_font(banner_label, &lv_font_montserrat_30, 0);
    lv_obj_align(banner_label, LV_ALIGN_CENTER, 0, -40);

    lv_obj_t *sub = lv_label_create(scr);
    lv_label_set_text(sub, "Hello, world!");
    lv_obj_set_style_text_color(sub, lv_color_hex(0xf1f5f9), 0);
    lv_obj_set_style_text_font(sub, &lv_font_montserrat_20, 0);
    lv_obj_align(sub, LV_ALIGN_CENTER, 0, 0);

    counter_label = lv_label_create(scr);
    lv_label_set_text(counter_label, "uptime: 0 s");
    lv_obj_set_style_text_color(counter_label, lv_color_hex(0x94a3b8), 0);
    lv_obj_set_style_text_font(counter_label, &lv_font_montserrat_14, 0);
    lv_obj_align(counter_label, LV_ALIGN_CENTER, 0, 50);

    Serial.println("UI ready. Entering loop().");
    Serial.printf("Free heap after init: %u\n", ESP.getFreeHeap());
    Serial.printf("Free PSRAM after init: %u\n", ESP.getFreePsram());
}

void loop() {
    static uint32_t last_print = 0;
    static uint32_t last_ui = 0;
    uint32_t now = millis();

    if (now - last_print >= 1000) {
        last_print = now;
        Serial.printf("[heartbeat] uptime=%lus  heap=%u  psram=%u\n",
                      now / 1000, ESP.getFreeHeap(), ESP.getFreePsram());
    }

    if (now - last_ui >= 250 && counter_label) {
        last_ui = now;
        char buf[32];
        snprintf(buf, sizeof(buf), "uptime: %lu s", now / 1000);
        lv_label_set_text(counter_label, buf);
    }

    lv_task_handler();
    delay(5);
}

#endif // HELLO_WORLD
