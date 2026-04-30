/**
 * Minimal LVGL label — patterned after LilyGo upstream:
 * https://github.com/Xinyuan-LilyGO/LilyGo-AMOLED-Series/tree/master/examples/LVGL_Rotation
 *
 * Flow: Serial.begin → amoled.begin() (fallback beginAMOLED_241 for T4 Leaf) →
 *       disp_wakeup → setBrightness → beginLvglHelper(amoled) → UI on lv_scr_act().
 *
 * Deploy: pio run -e text-demo --target upload
 */
#include <Arduino.h>
#include <LilyGo_AMOLED.h>
#include <LV_Helper.h>
#include <lvgl.h>

LilyGo_Class amoled;

void setup(void)
{
    Serial.begin(115200);

    /* Same detection order philosophy as LVGL_Rotation.ino — auto probe first. */
    bool rslt = amoled.begin();
    if (!rslt) {
        Serial.println("[text-demo] begin() failed — forcing 2.41\" RM690B0 path (Leaf / T4-S3)");
        rslt = amoled.beginAMOLED_241(true, false);
    }

    if (!rslt) {
        while (1) {
            Serial.println(
                "Board model cannot be detected; see LilyGo LVGL examples and Core Debug Level");
            delay(1000);
        }
    }

    amoled.disp_wakeup();
    delay(100);
    amoled.setBrightness(255);

    /* Upstream LVGL examples use beginLvglHelper (PSRAM framebuffer), not *_DMA — see LVGL_Rotation.ino */
    beginLvglHelper(amoled);

    lv_obj_t *scr = lv_scr_act();

    lv_obj_set_style_bg_color(scr, lv_color_hex(0xe2e8f0), 0);
    lv_obj_set_style_bg_opa(scr, LV_OPA_COVER, 0);

    lv_obj_t *lbl = lv_label_create(scr);
    lv_label_set_text(lbl, "trefolio Leaf\ntexto demo");
    lv_obj_set_style_text_color(lbl, lv_color_hex(0x0f172a), 0);
    lv_obj_set_style_text_align(lbl, LV_TEXT_ALIGN_CENTER, 0);
    lv_obj_set_style_text_font(lbl, &lv_font_montserrat_28, 0);
    lv_obj_center(lbl);
}

void loop()
{
    lv_task_handler();
    delay(5);
}
