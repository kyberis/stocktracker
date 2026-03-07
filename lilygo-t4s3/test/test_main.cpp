#include <Arduino.h>
#include <unity.h>

void test_wifi_mac_not_empty() {
    uint8_t mac[6];
    esp_read_mac(mac, ESP_MAC_WIFI_STA);
    TEST_ASSERT_NOT_EQUAL(0, mac[0] | mac[1] | mac[2] | mac[3] | mac[4] | mac[5]);
}

void setup() {
    delay(2000);
    UNITY_BEGIN();
    RUN_TEST(test_wifi_mac_not_empty);
    UNITY_END();
}

void loop() {}
