#include "api_client.h"
#include "config.h"
#include <cstring>
#include <cstdio>

#ifndef SIMULATOR
#include "certs.h"
#endif

static char s_base_url[128];
static char s_token[TOKEN_MAX_LEN];
static char s_fw_version[24] = "0.0.0";

void api_init(const char *baseUrl, const char *token) {
    strncpy(s_base_url, baseUrl, sizeof(s_base_url) - 1);
    strncpy(s_token, token, sizeof(s_token) - 1);
}

void api_set_firmware_version(const char *ver) {
    strncpy(s_fw_version, ver, sizeof(s_fw_version) - 1);
    s_fw_version[sizeof(s_fw_version) - 1] = '\0';
}

// ── Simulator implementation (libcurl + ArduinoJson) ────────────────
#ifdef SIMULATOR

#include <curl/curl.h>
#include <ArduinoJson.h>
#include <string>

static size_t curl_write_cb(void *data, size_t size, size_t nmemb, void *userp) {
    size_t total = size * nmemb;
    static_cast<std::string *>(userp)->append(static_cast<char *>(data), total);
    return total;
}

static bool sim_http_get(const char *path, JsonDocument &doc) {
    char url[256];
    snprintf(url, sizeof(url), "%s%s", s_base_url, path);

    char auth[128];
    snprintf(auth, sizeof(auth), "Authorization: Bearer %s", s_token);
    char fw_hdr[64];
    snprintf(fw_hdr, sizeof(fw_hdr), "X-Firmware-Version: %s", s_fw_version);

    CURL *curl = curl_easy_init();
    if (!curl) return false;

    std::string body;
    struct curl_slist *headers = nullptr;
    headers = curl_slist_append(headers, auth);
    headers = curl_slist_append(headers, fw_hdr);

    curl_easy_setopt(curl, CURLOPT_URL, url);
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, curl_write_cb);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, &body);
    curl_easy_setopt(curl, CURLOPT_TIMEOUT, 15L);

    CURLcode res = curl_easy_perform(curl);
    long http_code = 0;
    curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &http_code);
    curl_slist_free_all(headers);
    curl_easy_cleanup(curl);

    if (res != CURLE_OK || http_code != 200) {
        printf("[API] GET %s -> curl=%d http=%ld\n", path, res, http_code);
        return false;
    }

    DeserializationError err = deserializeJson(doc, body);
    if (err) {
        printf("[API] JSON parse error: %s\n", err.c_str());
        return false;
    }
    return true;
}

static int sim_http_post(const char *path, JsonDocument &doc) {
    char url[256];
    snprintf(url, sizeof(url), "%s%s", s_base_url, path);

    char auth[128];
    snprintf(auth, sizeof(auth), "Authorization: Bearer %s", s_token);
    char fw_hdr[64];
    snprintf(fw_hdr, sizeof(fw_hdr), "X-Firmware-Version: %s", s_fw_version);

    CURL *curl = curl_easy_init();
    if (!curl) return -1;

    std::string body;
    struct curl_slist *headers = nullptr;
    headers = curl_slist_append(headers, auth);
    headers = curl_slist_append(headers, fw_hdr);
    headers = curl_slist_append(headers, "Content-Type: application/json");

    curl_easy_setopt(curl, CURLOPT_URL, url);
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, "{}");
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, curl_write_cb);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, &body);
    curl_easy_setopt(curl, CURLOPT_TIMEOUT, 30L);

    CURLcode res = curl_easy_perform(curl);
    long http_code = 0;
    curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &http_code);
    curl_slist_free_all(headers);
    curl_easy_cleanup(curl);

    if (res != CURLE_OK) {
        printf("[API] POST %s -> curl=%d\n", path, res);
        return -1;
    }

    if (http_code != 200) {
        printf("[API] POST %s -> http=%ld body=%s\n", path, http_code, body.c_str());
        deserializeJson(doc, body);
        return (int)http_code;
    }

    DeserializationError err = deserializeJson(doc, body);
    if (err) {
        printf("[API] JSON parse error: %s\n", err.c_str());
        return -1;
    }
    return 200;
}

bool api_fetch_portfolio(PortfolioData &out) {
    portfolio_clear(out);

    JsonDocument doc;
    if (!sim_http_get("/api/portfolio/summary", doc)) return false;

    out.totalValueEUR        = doc["totalValueEUR"]        | 0.0f;
    out.costBasis            = doc["costBasis"]             | 0.0f;
    out.dayChangeEUR         = doc["dayChangeEUR"]         | 0.0f;
    out.dayChangePercent     = doc["dayChangePercent"]      | 0.0f;
    out.totalGainLoss        = doc["totalGainLoss"]         | 0.0f;
    out.totalGainLossPercent = doc["totalGainLossPercent"]  | 0.0f;
    out.holdingsCount        = doc["holdingsCount"]         | 0;

    JsonArray arr = doc["topHoldings"].as<JsonArray>();
    out.topCount = 0;
    for (JsonObject h : arr) {
        if (out.topCount >= MAX_TOP_HOLDINGS) break;
        TopHolding &t = out.top[out.topCount++];
        strncpy(t.ticker, h["ticker"] | "", sizeof(t.ticker) - 1);
        strncpy(t.name,   h["name"]   | "", sizeof(t.name)   - 1);
        t.weight    = h["weight"]    | 0.0f;
        t.dayChange = h["dayChange"] | 0.0f;
    }
    return true;
}

bool api_fetch_ai_summary(PortfolioData &out) {
    JsonDocument doc;
    int status = sim_http_post("/api/device/ai-summary", doc);

    out.aiUsed  = doc["used"]  | out.aiUsed;
    out.aiLimit = doc["limit"] | out.aiLimit;

    if (status == 200) {
        const char *summary = doc["summary"] | "";
        strncpy(out.aiSummary, summary, AI_SUMMARY_MAX - 1);
        out.aiSummary[AI_SUMMARY_MAX - 1] = '\0';
        out.aiLoaded = true;
        return true;
    }

    const char *err = doc["error"] | "";
    if (err[0] != '\0') {
        strncpy(out.aiSummary, err, AI_SUMMARY_MAX - 1);
        out.aiSummary[AI_SUMMARY_MAX - 1] = '\0';
    } else if (status == 429) {
        strncpy(out.aiSummary, "Monthly AI summary limit reached.", AI_SUMMARY_MAX - 1);
    } else if (status == 401) {
        strncpy(out.aiSummary, "Pro subscription required.", AI_SUMMARY_MAX - 1);
    } else {
        strncpy(out.aiSummary, "AI service unavailable.", AI_SUMMARY_MAX - 1);
    }
    return false;
}

bool api_validate_token() {
    JsonDocument doc;
    return sim_http_get("/api/portfolio/summary", doc);
}

bool api_fetch_device_config(DeviceConfig &out) {
    device_config_clear(out);
    JsonDocument doc;
    if (!sim_http_get("/api/device/config", doc)) return false;

    strncpy(out.plan, doc["plan"] | "free", sizeof(out.plan) - 1);
    out.aiSummaryEnabled  = doc["features"]["aiSummary"] | false;
    out.topHoldingsCount  = doc["features"]["topHoldingsCount"] | MAX_TOP_HOLDINGS;
    out.refreshIntervalSec = doc["features"]["refreshIntervalSec"] | 120;
    strncpy(out.templateId, doc["templateId"] | "classic-dark", sizeof(out.templateId) - 1);
    strncpy(out.latestFirmware, doc["firmwareVersion"] | "", sizeof(out.latestFirmware) - 1);
    return true;
}

bool api_check_firmware_update(FirmwareInfo &out) {
    firmware_info_clear(out);
    char path[128];
    snprintf(path, sizeof(path), "/api/device/firmware?v=%s&board=t4s3", s_fw_version);

    JsonDocument doc;
    if (!sim_http_get(path, doc)) return false;

    out.available = doc["available"] | false;
    if (!out.available) return true;
    strncpy(out.version, doc["version"] | "", sizeof(out.version) - 1);
    strncpy(out.url, doc["url"] | "", sizeof(out.url) - 1);
    strncpy(out.sha256, doc["sha256"] | "", sizeof(out.sha256) - 1);
    out.size = doc["size"] | 0;
    return true;
}

// ── Device (ESP32) implementation ───────────────────────────────────
#else

#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

static bool http_get_json(const char *path, JsonDocument &doc) {
    char url[256];
    snprintf(url, sizeof(url), "%s%s", s_base_url, path);

    WiFiClientSecure client;
    client.setCACert(ISRG_ROOT_X1_PEM);

    HTTPClient http;
    if (!http.begin(client, url)) return false;

    char auth[128];
    snprintf(auth, sizeof(auth), "Bearer %s", s_token);
    http.addHeader("Authorization", auth);
    http.addHeader("X-Firmware-Version", s_fw_version);

    int code = http.GET();
    if (code != 200) {
        Serial.printf("HTTP GET %s -> %d\n", path, code);
        http.end();
        return false;
    }

    String body = http.getString();
    http.end();

    DeserializationError err = deserializeJson(doc, body);
    if (err) {
        Serial.printf("JSON parse error: %s\n", err.c_str());
        return false;
    }
    return true;
}

static int http_post_json(const char *path, JsonDocument &doc) {
    char url[256];
    snprintf(url, sizeof(url), "%s%s", s_base_url, path);

    WiFiClientSecure client;
    client.setCACert(ISRG_ROOT_X1_PEM);

    HTTPClient http;
    if (!http.begin(client, url)) return -1;

    char auth[128];
    snprintf(auth, sizeof(auth), "Bearer %s", s_token);
    http.addHeader("Authorization", auth);
    http.addHeader("X-Firmware-Version", s_fw_version);
    http.addHeader("Content-Type", "application/json");

    int code = http.POST("{}");
    String body = http.getString();
    http.end();

    if (code <= 0) {
        Serial.printf("HTTP POST %s -> %d\n", path, code);
        return -1;
    }

    if (code != 200) {
        Serial.printf("HTTP POST %s -> %d body=%s\n", path, code, body.c_str());
        deserializeJson(doc, body);
        return code;
    }

    DeserializationError err = deserializeJson(doc, body);
    if (err) {
        Serial.printf("JSON parse error: %s\n", err.c_str());
        return -1;
    }
    return 200;
}

bool api_fetch_portfolio(PortfolioData &out) {
    portfolio_clear(out);

    JsonDocument doc;
    if (!http_get_json("/api/portfolio/summary", doc)) return false;

    out.totalValueEUR        = doc["totalValueEUR"]        | 0.0f;
    out.costBasis            = doc["costBasis"]             | 0.0f;
    out.dayChangeEUR         = doc["dayChangeEUR"]         | 0.0f;
    out.dayChangePercent     = doc["dayChangePercent"]      | 0.0f;
    out.totalGainLoss        = doc["totalGainLoss"]         | 0.0f;
    out.totalGainLossPercent = doc["totalGainLossPercent"]  | 0.0f;
    out.holdingsCount        = doc["holdingsCount"]         | 0;

    JsonArray arr = doc["topHoldings"].as<JsonArray>();
    out.topCount = 0;
    for (JsonObject h : arr) {
        if (out.topCount >= MAX_TOP_HOLDINGS) break;
        TopHolding &t = out.top[out.topCount++];
        strncpy(t.ticker, h["ticker"] | "", sizeof(t.ticker) - 1);
        strncpy(t.name,   h["name"]   | "", sizeof(t.name)   - 1);
        t.weight    = h["weight"]    | 0.0f;
        t.dayChange = h["dayChange"] | 0.0f;
    }
    return true;
}

bool api_fetch_ai_summary(PortfolioData &out) {
    JsonDocument doc;
    int status = http_post_json("/api/device/ai-summary", doc);

    out.aiUsed  = doc["used"]  | out.aiUsed;
    out.aiLimit = doc["limit"] | out.aiLimit;

    if (status == 200) {
        const char *summary = doc["summary"] | "";
        strncpy(out.aiSummary, summary, AI_SUMMARY_MAX - 1);
        out.aiSummary[AI_SUMMARY_MAX - 1] = '\0';
        out.aiLoaded = true;
        return true;
    }

    const char *err = doc["error"] | "";
    if (err[0] != '\0') {
        strncpy(out.aiSummary, err, AI_SUMMARY_MAX - 1);
        out.aiSummary[AI_SUMMARY_MAX - 1] = '\0';
    } else if (status == 429) {
        strncpy(out.aiSummary, "Monthly AI summary limit reached.", AI_SUMMARY_MAX - 1);
    } else if (status == 401) {
        strncpy(out.aiSummary, "Pro subscription required.", AI_SUMMARY_MAX - 1);
    } else {
        strncpy(out.aiSummary, "AI service unavailable.", AI_SUMMARY_MAX - 1);
    }
    return false;
}

bool api_validate_token() {
    JsonDocument doc;
    return http_get_json("/api/portfolio/summary", doc);
}

bool api_fetch_device_config(DeviceConfig &out) {
    device_config_clear(out);
    JsonDocument doc;
    if (!http_get_json("/api/device/config", doc)) return false;

    strncpy(out.plan, doc["plan"] | "free", sizeof(out.plan) - 1);
    out.aiSummaryEnabled  = doc["features"]["aiSummary"] | false;
    out.topHoldingsCount  = doc["features"]["topHoldingsCount"] | MAX_TOP_HOLDINGS;
    out.refreshIntervalSec = doc["features"]["refreshIntervalSec"] | 120;
    strncpy(out.templateId, doc["templateId"] | "classic-dark", sizeof(out.templateId) - 1);
    strncpy(out.latestFirmware, doc["firmwareVersion"] | "", sizeof(out.latestFirmware) - 1);
    return true;
}

bool api_check_firmware_update(FirmwareInfo &out) {
    firmware_info_clear(out);
    char path[128];
    snprintf(path, sizeof(path), "/api/device/firmware?v=%s&board=t4s3", s_fw_version);

    JsonDocument doc;
    if (!http_get_json(path, doc)) return false;

    out.available = doc["available"] | false;
    if (!out.available) return true;
    strncpy(out.version, doc["version"] | "", sizeof(out.version) - 1);
    strncpy(out.url, doc["url"] | "", sizeof(out.url) - 1);
    strncpy(out.sha256, doc["sha256"] | "", sizeof(out.sha256) - 1);
    out.size = doc["size"] | 0;
    return true;
}

#endif
