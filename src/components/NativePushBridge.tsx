"use client";

import { useEffect } from "react";
import { isNativePlatform } from "@/lib/capacitor";

/**
 * Registers for native push notifications when running inside a Capacitor shell.
 * Sends the native device token to the backend so alerts can be delivered via APNs/FCM.
 *
 * Prerequisites (not yet wired):
 * - Install @capacitor/push-notifications: npm install @capacitor/push-notifications
 * - Backend: add FCM/APNs dispatch in src/lib/alert-dispatcher.ts
 * - Backend: store native tokens via a new API route (POST /api/notifications/native-token)
 *
 * Until the backend is wired, web push notifications continue to work inside the WebView.
 */
export default function NativePushBridge() {
  useEffect(() => {
    if (!isNativePlatform()) return;
    // Native push registration is disabled until google-services.json (Android)
    // and APNs entitlements (iOS) are configured. Without Firebase initialized,
    // calling PushNotifications.register() crashes the Android app at the native layer.
    // TODO: Enable when FCM/APNs backend dispatch is wired up.
  }, []);

  return null;
}
