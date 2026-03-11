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

    let cleanup: (() => void) | undefined;

    async function register() {
      try {
        const { PushNotifications } = await import("@capacitor/push-notifications");

        const permResult = await PushNotifications.requestPermissions();
        if (permResult.receive !== "granted") return;

        await PushNotifications.register();

        const tokenListener = await PushNotifications.addListener(
          "registration",
          async (token) => {
            try {
              await fetch("/api/notifications/native-token", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token: token.value }),
              });
            } catch {
              console.warn("Failed to send native push token to backend");
            }
          }
        );

        const errorListener = await PushNotifications.addListener(
          "registrationError",
          (err) => {
            console.warn("Native push registration failed:", err);
          }
        );

        cleanup = () => {
          tokenListener.remove();
          errorListener.remove();
        };
      } catch {
        // @capacitor/push-notifications not installed yet — silently skip
      }
    }

    register();
    return () => cleanup?.();
  }, []);

  return null;
}
