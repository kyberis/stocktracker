#include "config.h"

#ifdef SIMULATOR

#include <cstdio>
#include <cstring>

static char sim_token[TOKEN_MAX_LEN] = {};
static char sim_wifi_ssid[64] = {};
static char sim_wifi_pass[64] = {};
static char sim_fw_version[24] = {};
static char sim_template[32] = {};

void config_init() {}

bool config_has_token() { return sim_token[0] != '\0'; }

void config_load_token(char *buf, size_t len) {
    strncpy(buf, sim_token, len);
    buf[len - 1] = '\0';
}

void config_save_token(const char *token) {
    strncpy(sim_token, token, TOKEN_MAX_LEN);
    sim_token[TOKEN_MAX_LEN - 1] = '\0';
}

void config_clear_token() { sim_token[0] = '\0'; }

bool config_has_wifi() { return sim_wifi_ssid[0] != '\0'; }

void config_load_wifi_ssid(char *buf, size_t len) {
    strncpy(buf, sim_wifi_ssid, len);
    buf[len - 1] = '\0';
}

void config_load_wifi_pass(char *buf, size_t len) {
    strncpy(buf, sim_wifi_pass, len);
    buf[len - 1] = '\0';
}

void config_save_wifi(const char *ssid, const char *pass) {
    strncpy(sim_wifi_ssid, ssid, sizeof(sim_wifi_ssid) - 1);
    strncpy(sim_wifi_pass, pass, sizeof(sim_wifi_pass) - 1);
}

void config_clear_wifi() { sim_wifi_ssid[0] = '\0'; sim_wifi_pass[0] = '\0'; }

void config_save_fw_version(const char *ver) {
    strncpy(sim_fw_version, ver, sizeof(sim_fw_version) - 1);
}

void config_load_fw_version(char *buf, size_t len) {
    if (sim_fw_version[0])
        strncpy(buf, sim_fw_version, len);
    else
        strncpy(buf, FW_VERSION, len);
    buf[len - 1] = '\0';
}

void config_save_template(const char *id) {
    strncpy(sim_template, id, sizeof(sim_template) - 1);
}

void config_load_template(char *buf, size_t len) {
    strncpy(buf, sim_template[0] ? sim_template : "classic-dark", len);
    buf[len - 1] = '\0';
}

static uint8_t sim_brightness = 255;
static uint16_t sim_idle_dim_sec = 60;
static uint16_t sim_auto_sleep_sec = 600;

void config_save_brightness(uint8_t val) { sim_brightness = val; }
uint8_t config_load_brightness() { return sim_brightness; }

void config_save_idle_dim_sec(uint16_t sec) { sim_idle_dim_sec = sec; }
uint16_t config_load_idle_dim_sec() { return sim_idle_dim_sec; }

void config_save_auto_sleep_sec(uint16_t sec) { sim_auto_sleep_sec = sec; }
uint16_t config_load_auto_sleep_sec() { return sim_auto_sleep_sec; }

#else // ── Device (ESP32) ────────────────────────────────────────────

#include <Preferences.h>
#include <esp_mac.h>
#include <mbedtls/aes.h>
#include <mbedtls/sha256.h>

static Preferences prefs;

// Derive a 256-bit AES key from the device's unique MAC address.
// This prevents reading the token by dumping flash on a different device.
static uint8_t s_aes_key[32];

static void derive_key() {
    uint8_t mac[6];
    esp_read_mac(mac, ESP_MAC_WIFI_STA);

    // SHA-256(mac || "trefolio-nvs-key") → 32-byte AES key
    uint8_t seed[64];
    memcpy(seed, mac, 6);
    const char *salt = "trefolio-nvs-key";
    memcpy(seed + 6, salt, strlen(salt));

    mbedtls_sha256(seed, 6 + strlen(salt), s_aes_key, 0);
}

// AES-256-ECB encrypt/decrypt a short token (padded to 32 bytes).
// Token is max ~15 chars so one 32-byte block is sufficient.
static constexpr size_t ENC_BLOCK = 32;

static void aes_encrypt_token(const char *plain, uint8_t *out) {
    uint8_t padded[ENC_BLOCK] = {};
    strncpy((char *)padded, plain, ENC_BLOCK - 1);

    mbedtls_aes_context ctx;
    mbedtls_aes_init(&ctx);
    mbedtls_aes_setkey_enc(&ctx, s_aes_key, 256);
    mbedtls_aes_crypt_ecb(&ctx, MBEDTLS_AES_ENCRYPT, padded, out);
    mbedtls_aes_crypt_ecb(&ctx, MBEDTLS_AES_ENCRYPT, padded + 16, out + 16);
    mbedtls_aes_free(&ctx);
}

static void aes_decrypt_token(const uint8_t *enc, char *out, size_t out_len) {
    uint8_t padded[ENC_BLOCK] = {};

    mbedtls_aes_context ctx;
    mbedtls_aes_init(&ctx);
    mbedtls_aes_setkey_dec(&ctx, s_aes_key, 256);
    mbedtls_aes_crypt_ecb(&ctx, MBEDTLS_AES_DECRYPT, enc, padded);
    mbedtls_aes_crypt_ecb(&ctx, MBEDTLS_AES_DECRYPT, enc + 16, padded + 16);
    mbedtls_aes_free(&ctx);

    padded[ENC_BLOCK - 1] = '\0';
    strncpy(out, (char *)padded, out_len);
    out[out_len - 1] = '\0';
}

void config_init() {
    prefs.begin("trefolio", false);
    derive_key();
}

bool config_has_token() {
    return prefs.isKey("enc_token");
}

void config_load_token(char *buf, size_t len) {
    uint8_t enc[ENC_BLOCK] = {};
    size_t got = prefs.getBytes("enc_token", enc, ENC_BLOCK);
    if (got == ENC_BLOCK) {
        aes_decrypt_token(enc, buf, len);
    } else {
        // Fallback: try reading legacy unencrypted token and migrate
        String val = prefs.getString("token", "");
        if (val.length() > 0) {
            strncpy(buf, val.c_str(), len);
            buf[len - 1] = '\0';
            config_save_token(buf); // re-save encrypted
            prefs.remove("token");
        } else {
            buf[0] = '\0';
        }
    }
}

void config_save_token(const char *token) {
    uint8_t enc[ENC_BLOCK];
    aes_encrypt_token(token, enc);
    prefs.putBytes("enc_token", enc, ENC_BLOCK);
}

void config_clear_token() {
    prefs.remove("enc_token");
    prefs.remove("token"); // also clean up legacy key
}

bool config_has_wifi() {
    return prefs.isKey("wifi_ssid") && prefs.getString("wifi_ssid", "").length() > 0;
}

void config_load_wifi_ssid(char *buf, size_t len) {
    String val = prefs.getString("wifi_ssid", "");
    strncpy(buf, val.c_str(), len);
    buf[len - 1] = '\0';
}

void config_load_wifi_pass(char *buf, size_t len) {
    String val = prefs.getString("wifi_pass", "");
    strncpy(buf, val.c_str(), len);
    buf[len - 1] = '\0';
}

void config_save_wifi(const char *ssid, const char *pass) {
    prefs.putString("wifi_ssid", ssid);
    prefs.putString("wifi_pass", pass);
}

void config_clear_wifi() {
    prefs.remove("wifi_ssid");
    prefs.remove("wifi_pass");
}

void config_save_fw_version(const char *ver) {
    prefs.putString("fw_version", ver);
}

void config_load_fw_version(char *buf, size_t len) {
    String val = prefs.getString("fw_version", FW_VERSION);
    strncpy(buf, val.c_str(), len);
    buf[len - 1] = '\0';
}

void config_save_template(const char *id) {
    prefs.putString("template", id);
}

void config_load_template(char *buf, size_t len) {
    String val = prefs.getString("template", "classic-dark");
    strncpy(buf, val.c_str(), len);
    buf[len - 1] = '\0';
}

void config_save_brightness(uint8_t val) { prefs.putUChar("brightness", val); }
uint8_t config_load_brightness() { return prefs.getUChar("brightness", 255); }

void config_save_idle_dim_sec(uint16_t sec) { prefs.putUShort("idle_dim_s", sec); }
uint16_t config_load_idle_dim_sec() { return prefs.getUShort("idle_dim_s", 60); }

void config_save_auto_sleep_sec(uint16_t sec) { prefs.putUShort("sleep_s", sec); }
uint16_t config_load_auto_sleep_sec() { return prefs.getUShort("sleep_s", 600); }

#endif
