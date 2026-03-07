#pragma once

#ifdef SIMULATOR
#include <cstddef>
#include <cstring>
#else
#include <Arduino.h>
#endif

constexpr const char *WIFI_SSID     = "YOUR_WIFI_SSID";
constexpr const char *WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

#ifdef SIMULATOR
constexpr const char *API_BASE_URL  = "http://localhost:3000";
#else
constexpr const char *API_BASE_URL  = "https://trefolio.com";
#endif

constexpr size_t TOKEN_MAX_LEN = 16; // "XXXX-XXXX" + null

void config_init();
bool config_has_token();
void config_load_token(char *buf, size_t len);
void config_save_token(const char *token);
void config_clear_token();
