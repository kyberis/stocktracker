"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import { isNativePlatform, getNativePlatform } from "./capacitor";

let cachedIsNative: boolean | null = null;
let cachedPlatform: "ios" | "android" | "web" | null = null;

function detectOnce() {
  if (cachedIsNative === null) {
    cachedIsNative = isNativePlatform();
    cachedPlatform = getNativePlatform();
  }
}

function subscribe(cb: () => void) {
  if (cachedIsNative === null) {
    detectOnce();
    cb();
  }
  return () => {};
}

function getIsNativeSnapshot(): boolean {
  if (cachedIsNative === null && typeof window !== "undefined") detectOnce();
  return cachedIsNative ?? false;
}

function getIsNativeServerSnapshot(): boolean {
  return false;
}

function getPlatformSnapshot(): "ios" | "android" | "web" {
  if (cachedPlatform === null && typeof window !== "undefined") detectOnce();
  return cachedPlatform ?? "web";
}

function getPlatformServerSnapshot(): "ios" | "android" | "web" {
  return "web";
}

/**
 * Returns true when running inside a Capacitor native shell.
 * Safe for SSR — returns false on the server, detects on client after hydration.
 */
export function useIsNative(): boolean {
  return useSyncExternalStore(subscribe, getIsNativeSnapshot, getIsNativeServerSnapshot);
}

/**
 * Returns "ios", "android", or "web".
 * Safe for SSR — returns "web" on the server.
 */
export function useNativePlatform(): "ios" | "android" | "web" {
  return useSyncExternalStore(subscribe, getPlatformSnapshot, getPlatformServerSnapshot);
}
