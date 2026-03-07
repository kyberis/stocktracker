#include "config.h"

#ifdef SIMULATOR

#include <cstdio>
#include <cstring>

static char sim_token[TOKEN_MAX_LEN] = {};

void config_init() {}

bool config_has_token() {
    return sim_token[0] != '\0';
}

void config_load_token(char *buf, size_t len) {
    strncpy(buf, sim_token, len);
    buf[len - 1] = '\0';
}

void config_save_token(const char *token) {
    strncpy(sim_token, token, TOKEN_MAX_LEN);
    sim_token[TOKEN_MAX_LEN - 1] = '\0';
}

void config_clear_token() {
    sim_token[0] = '\0';
}

#else

#include <Preferences.h>

static Preferences prefs;

void config_init() {
    prefs.begin("stocktracker", false);
}

bool config_has_token() {
    return prefs.isKey("token");
}

void config_load_token(char *buf, size_t len) {
    String val = prefs.getString("token", "");
    strncpy(buf, val.c_str(), len);
    buf[len - 1] = '\0';
}

void config_save_token(const char *token) {
    prefs.putString("token", token);
}

void config_clear_token() {
    prefs.remove("token");
}

#endif
