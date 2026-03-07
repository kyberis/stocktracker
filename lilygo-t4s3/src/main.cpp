#include <Arduino.h>
#include <LilyGo_AMOLED.h>
#include <LV_Helper.h>
#include "stocks.h"
#include "ui.h"

LilyGo_Class amoled;

static const uint32_t TICK_INTERVAL_MS = 2000;
static uint32_t lastTick = 0;

void setup() {
    Serial.begin(115200);
    Serial.println("StockTracker T4-S3 booting...");

    if (!amoled.begin()) {
        Serial.println("AMOLED init failed!");
        while (1) delay(1000);
    }

    Serial.printf("Display: %dx%d  Board: %s\n",
                  amoled.width(), amoled.height(), amoled.getName());

    beginLvglHelper(amoled);
    stocks_init();
    ui_init();
    ui_update();

    Serial.println("Ready.");
}

void loop() {
    uint32_t now = millis();
    if (now - lastTick >= TICK_INTERVAL_MS) {
        lastTick = now;
        stocks_tick();
        ui_update();
    }
    lv_task_handler();
    delay(5);
}
