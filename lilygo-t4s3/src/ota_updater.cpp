#include "ota_updater.h"
#include "config.h"
#include "api_client.h"
#include "stocks.h"

#ifdef SIMULATOR

bool ota_check_and_update() { return false; }
void ota_mark_valid() {}

#else

#include <Arduino.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <Update.h>
#include <esp_ota_ops.h>
#include "certs.h"

bool ota_check_and_update() {
    FirmwareInfo fw;
    if (!api_check_firmware_update(fw)) {
        Serial.println("[OTA] No update available or check failed.");
        return false;
    }

    if (!fw.available || fw.url[0] == '\0') {
        return false;
    }

    Serial.printf("[OTA] Update available: %s (%d bytes)\n", fw.version, fw.size);

    WiFiClientSecure client;
    client.setCACert(ISRG_ROOT_X1_PEM);

    HTTPClient http;
    if (!http.begin(client, fw.url)) {
        Serial.println("[OTA] Failed to connect to firmware URL.");
        return false;
    }

    int code = http.GET();
    if (code != 200) {
        Serial.printf("[OTA] Firmware download HTTP %d\n", code);
        http.end();
        return false;
    }

    int contentLen = http.getSize();
    if (contentLen <= 0) {
        Serial.println("[OTA] Invalid content length.");
        http.end();
        return false;
    }

    if (!Update.begin(contentLen)) {
        Serial.printf("[OTA] Not enough space: %d bytes needed\n", contentLen);
        http.end();
        return false;
    }

    WiFiClient *stream = http.getStreamPtr();
    size_t written = Update.writeStream(*stream);
    http.end();

    if (written != (size_t)contentLen) {
        Serial.printf("[OTA] Written %u of %d bytes\n", (unsigned)written, contentLen);
        Update.abort();
        return false;
    }

    if (!Update.end(true)) {
        Serial.printf("[OTA] Update finalization failed: %s\n", Update.errorString());
        return false;
    }

    // Save new version before reboot
    config_save_fw_version(fw.version);
    Serial.printf("[OTA] Update to %s successful. Rebooting...\n", fw.version);
    delay(500);
    ESP.restart();
    return true; // unreachable
}

void ota_mark_valid() {
    const esp_partition_t *running = esp_ota_get_running_partition();
    esp_ota_img_states_t state;
    if (esp_ota_get_state_partition(running, &state) == ESP_OK) {
        if (state == ESP_OTA_IMG_PENDING_VERIFY) {
            esp_ota_mark_app_valid_cancel_rollback();
            Serial.println("[OTA] Firmware marked as valid.");
        }
    }
}

#endif
