#include "api_client.h"
#include "config.h"
#include <cstring>
#include <cstdio>

static char s_base_url[128];
static char s_token[TOKEN_MAX_LEN];

void api_init(const char *baseUrl, const char *token) {
    strncpy(s_base_url, baseUrl, sizeof(s_base_url) - 1);
    strncpy(s_token, token, sizeof(s_token) - 1);
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

    CURL *curl = curl_easy_init();
    if (!curl) return false;

    std::string body;
    struct curl_slist *headers = nullptr;
    headers = curl_slist_append(headers, auth);

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

static bool sim_http_post(const char *path, JsonDocument &doc) {
    char url[256];
    snprintf(url, sizeof(url), "%s%s", s_base_url, path);

    char auth[128];
    snprintf(auth, sizeof(auth), "Authorization: Bearer %s", s_token);

    CURL *curl = curl_easy_init();
    if (!curl) return false;

    std::string body;
    struct curl_slist *headers = nullptr;
    headers = curl_slist_append(headers, auth);
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

    if (res != CURLE_OK || http_code != 200) {
        printf("[API] POST %s -> curl=%d http=%ld\n", path, res, http_code);
        return false;
    }

    DeserializationError err = deserializeJson(doc, body);
    if (err) {
        printf("[API] JSON parse error: %s\n", err.c_str());
        return false;
    }
    return true;
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
    if (!sim_http_post("/api/device/ai-summary", doc)) return false;

    const char *summary = doc["summary"] | "";
    strncpy(out.aiSummary, summary, AI_SUMMARY_MAX - 1);
    out.aiSummary[AI_SUMMARY_MAX - 1] = '\0';
    out.aiLoaded = true;
    return true;
}

bool api_validate_token() {
    JsonDocument doc;
    return sim_http_get("/api/portfolio/summary", doc);
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
    client.setInsecure();

    HTTPClient http;
    if (!http.begin(client, url)) return false;

    char auth[128];
    snprintf(auth, sizeof(auth), "Bearer %s", s_token);
    http.addHeader("Authorization", auth);

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

static bool http_post_json(const char *path, JsonDocument &doc) {
    char url[256];
    snprintf(url, sizeof(url), "%s%s", s_base_url, path);

    WiFiClientSecure client;
    client.setInsecure();

    HTTPClient http;
    if (!http.begin(client, url)) return false;

    char auth[128];
    snprintf(auth, sizeof(auth), "Bearer %s", s_token);
    http.addHeader("Authorization", auth);
    http.addHeader("Content-Type", "application/json");

    int code = http.POST("{}");
    if (code != 200) {
        Serial.printf("HTTP POST %s -> %d\n", path, code);
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
    if (!http_post_json("/api/device/ai-summary", doc)) return false;

    const char *summary = doc["summary"] | "";
    strncpy(out.aiSummary, summary, AI_SUMMARY_MAX - 1);
    out.aiSummary[AI_SUMMARY_MAX - 1] = '\0';
    out.aiLoaded = true;
    return true;
}

bool api_validate_token() {
    JsonDocument doc;
    return http_get_json("/api/portfolio/summary", doc);
}

#endif
