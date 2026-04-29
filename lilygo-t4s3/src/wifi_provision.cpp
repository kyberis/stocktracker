#include "wifi_provision.h"
#include "config.h"

#ifdef SIMULATOR

void wifi_provision_start() {}
bool wifi_provision_has_credentials() { return true; }

#else

#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include <DNSServer.h>
#include <esp_mac.h>
#include <lvgl.h>

static WebServer server(80);
static DNSServer dns;
static bool provisioned = false;

static const char PROVISION_HTML[] PROGMEM = R"HTML(
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>trefolio Device Setup</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,system-ui,sans-serif;background:#0f172a;color:#f1f5f9;
     display:flex;justify-content:center;align-items:center;min-height:100vh;padding:16px}
.card{background:#1e293b;border-radius:16px;border:1px solid #334155;padding:32px;
      max-width:400px;width:100%}
h1{font-size:20px;margin-bottom:4px;color:#10b981}
.sub{font-size:13px;color:#94a3b8;margin-bottom:24px}
label{display:block;font-size:13px;color:#94a3b8;margin-bottom:4px;margin-top:16px}
input,select{width:100%;padding:10px 12px;border-radius:10px;border:1px solid #334155;
       background:#0f172a;color:#f1f5f9;font-size:15px;outline:none}
input:focus{border-color:#10b981}
.btn{display:block;width:100%;padding:12px;margin-top:24px;border:none;border-radius:10px;
     background:#10b981;color:#fff;font-size:16px;font-weight:600;cursor:pointer}
.btn:hover{background:#059669}
.hint{font-size:11px;color:#64748b;margin-top:8px;text-align:center}
#networks{margin-top:8px}
</style>
</head>
<body>
<div class="card">
<h1>trefolio</h1>
<p class="sub">Connect your device to WiFi</p>
<form method="POST" action="/save">
<label>WiFi Network</label>
<select name="ssid" id="ssid"></select>
<div id="networks"><em style="color:#64748b;font-size:12px">Scanning...</em></div>
<label>WiFi Password</label>
<input type="password" name="pass" placeholder="Enter password" required>
<label>Device Passkey (from trefolio.com profile)</label>
<input type="text" name="token" placeholder="XXXX-XXXX-XXXX" maxlength="14"
       pattern="[0-9]{4}-[0-9]{4}-[0-9]{4}" inputmode="numeric" style="letter-spacing:2px">
<p class="hint">Leave blank if already configured</p>
<button class="btn" type="submit">Connect</button>
</form>
</div>
<script>
fetch('/scan').then(r=>r.json()).then(nets=>{
  const sel=document.getElementById('ssid');
  const div=document.getElementById('networks');
  div.innerHTML='';
  nets.forEach(n=>{
    const o=document.createElement('option');
    o.value=n.ssid; o.textContent=n.ssid+' ('+n.rssi+'dBm)';
    sel.appendChild(o);
  });
});
</script>
</body>
</html>
)HTML";

static const char DONE_HTML[] PROGMEM = R"HTML(
<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>trefolio</title>
<style>body{font-family:sans-serif;background:#0f172a;color:#f1f5f9;display:flex;
justify-content:center;align-items:center;min-height:100vh;text-align:center}
h2{color:#10b981}</style>
</head><body><div><h2>Connected!</h2><p>Device will restart now.</p></div></body></html>
)HTML";

static void handle_root() {
    server.send(200, "text/html", PROVISION_HTML);
}

static void handle_scan() {
    int n = WiFi.scanNetworks();
    String json = "[";
    for (int i = 0; i < n; i++) {
        if (i > 0) json += ",";
        json += "{\"ssid\":\"" + WiFi.SSID(i) + "\",\"rssi\":" + String(WiFi.RSSI(i)) + "}";
    }
    json += "]";
    server.send(200, "application/json", json);
}

static void handle_save() {
    String ssid = server.arg("ssid");
    String pass = server.arg("pass");
    String token = server.arg("token");

    if (ssid.length() == 0 || pass.length() == 0) {
        server.send(400, "text/plain", "SSID and password required");
        return;
    }

    config_save_wifi(ssid.c_str(), pass.c_str());

    if (token.length() > 0) {
        // Normalize: uppercase and ensure dashes
        token.toUpperCase();
        config_save_token(token.c_str());
    }

    server.send(200, "text/html", DONE_HTML);
    provisioned = true;
}

static void handle_not_found() {
    // Captive portal: redirect all requests to the setup page
    server.sendHeader("Location", "http://192.168.4.1/");
    server.send(302, "text/plain", "");
}

void wifi_provision_start() {
    // Generate AP name from MAC
    uint8_t mac[6];
    esp_read_mac(mac, ESP_MAC_WIFI_STA);
    char ap_name[24];
    snprintf(ap_name, sizeof(ap_name), "trefolio-%02X%02X", mac[4], mac[5]);

    Serial.printf("[Provision] Starting AP: %s\n", ap_name);

    WiFi.mode(WIFI_AP_STA);
    WiFi.softAP(ap_name);
    delay(100);

    // DNS server redirects all domains to the AP IP (captive portal)
    dns.start(53, "*", WiFi.softAPIP());

    server.on("/", handle_root);
    server.on("/scan", handle_scan);
    server.on("/save", HTTP_POST, handle_save);
    server.onNotFound(handle_not_found);
    server.begin();

    Serial.printf("[Provision] Portal at http://%s/\n", WiFi.softAPIP().toString().c_str());
    Serial.println("[Provision] USB serial fallback also available.");
    Serial.println("[Provision] Type one of:");
    Serial.println("[Provision]   WIFI <ssid> <password>");
    Serial.println("[Provision]   WIFI <ssid> <password> <passkey>     (e.g. 12345678 or 1234-5678)");
    Serial.println("[Provision]   STATUS                               (re-prints AP info)");
    Serial.println("[Provision] (Spaces inside ssid/password are not supported via serial.)");

    String serial_buf;
    serial_buf.reserve(160);

    auto handle_serial_line = [&](String line) {
        line.trim();
        if (line.length() == 0) return;

        if (line.equalsIgnoreCase("STATUS")) {
            Serial.printf("[Provision] AP=%s  IP=%s  clients=%d\n",
                          ap_name,
                          WiFi.softAPIP().toString().c_str(),
                          WiFi.softAPgetStationNum());
            return;
        }

        if (line.startsWith("WIFI ") || line.startsWith("wifi ")) {
            String rest = line.substring(5);
            rest.trim();

            int sp1 = rest.indexOf(' ');
            if (sp1 < 0) {
                Serial.println("[Provision] usage: WIFI <ssid> <password> [passkey]");
                return;
            }
            String s_ssid = rest.substring(0, sp1);
            String tail = rest.substring(sp1 + 1);
            tail.trim();

            int sp2 = tail.indexOf(' ');
            String s_pass, s_token;
            if (sp2 < 0) {
                s_pass = tail;
            } else {
                s_pass = tail.substring(0, sp2);
                s_token = tail.substring(sp2 + 1);
                s_token.trim();
            }

            if (s_ssid.length() == 0 || s_pass.length() == 0) {
                Serial.println("[Provision] ssid and password are required");
                return;
            }

            config_save_wifi(s_ssid.c_str(), s_pass.c_str());
            Serial.printf("[Provision] Saved WiFi: ssid=%s\n", s_ssid.c_str());

            if (s_token.length() > 0) {
                s_token.toUpperCase();
                config_save_token(s_token.c_str());
                Serial.printf("[Provision] Saved passkey (%d chars)\n", s_token.length());
            }

            provisioned = true;
            return;
        }

        Serial.printf("[Provision] unknown command: %s\n", line.c_str());
    };

    provisioned = false;
    while (!provisioned) {
        dns.processNextRequest();
        server.handleClient();

        while (Serial.available() > 0) {
            char c = (char)Serial.read();
            if (c == '\r') continue;
            if (c == '\n') {
                handle_serial_line(serial_buf);
                serial_buf = "";
            } else {
                if (serial_buf.length() < 150) serial_buf += c;
            }
        }

        lv_task_handler();
        delay(10);
    }

    // Give the browser time to render the success page
    uint32_t end = millis() + 2000;
    while (millis() < end) {
        dns.processNextRequest();
        server.handleClient();
        delay(10);
    }

    server.stop();
    dns.stop();
    WiFi.softAPdisconnect(true);
    WiFi.mode(WIFI_STA);

    Serial.println("[Provision] Complete. Restarting...");
    delay(500);
    ESP.restart();
}

bool wifi_provision_has_credentials() {
    return config_has_wifi();
}

#endif
