#pragma once

#ifdef SIMULATOR
#include <cstddef>
#include <cstring>
#else
#include <Arduino.h>
#endif

#ifdef SIMULATOR
constexpr const char *API_BASE_URL  = "http://localhost:3000";
#else
constexpr const char *API_BASE_URL  = "https://trefolio.com";
#endif

constexpr size_t TOKEN_MAX_LEN = 20; // "XXXX-XXXX-XXXX" + null

constexpr const char *FW_VERSION = "1.0.0";

void config_init();

// Token (passkey) storage — encrypted at rest on device via MAC-derived AES key
bool config_has_token();
void config_load_token(char *buf, size_t len);
void config_save_token(const char *token);
void config_clear_token();

// WiFi credentials storage (Phase 3: provisioning)
bool config_has_wifi();
void config_load_wifi_ssid(char *buf, size_t len);
void config_load_wifi_pass(char *buf, size_t len);
void config_save_wifi(const char *ssid, const char *pass);
void config_clear_wifi();

// Firmware version tracking
void config_save_fw_version(const char *ver);
void config_load_fw_version(char *buf, size_t len);

// Template ID
void config_save_template(const char *id);
void config_load_template(char *buf, size_t len);
