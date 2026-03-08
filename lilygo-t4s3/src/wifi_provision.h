#pragma once

// Start SoftAP provisioning mode.
// Creates AP "trefolio-XXXX" (last 4 of MAC) and serves a captive portal
// where the user can enter WiFi credentials and device passkey.
// Blocks until credentials are submitted, then saves to NVS and reboots.
void wifi_provision_start();

// Returns true if WiFi credentials are stored and a connection should be attempted.
bool wifi_provision_has_credentials();
