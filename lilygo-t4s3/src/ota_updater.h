#pragma once

// Check for firmware update and apply if available.
// Returns true if an update was started (device will reboot).
// Returns false if no update available or check failed.
bool ota_check_and_update();

// Mark the current firmware as valid after successful boot.
// Call after first successful API fetch to confirm firmware works.
void ota_mark_valid();
