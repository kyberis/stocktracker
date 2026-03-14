import { isNativePlatform } from "./capacitor";

type ImpactStyle = "Heavy" | "Medium" | "Light";

export async function hapticImpact(style: ImpactStyle = "Light") {
  if (!isNativePlatform()) return;
  try {
    const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
    const map = { Heavy: ImpactStyle.Heavy, Medium: ImpactStyle.Medium, Light: ImpactStyle.Light };
    await Haptics.impact({ style: map[style] });
  } catch {
    // Haptics plugin not available
  }
}

export async function hapticNotification(type: "Success" | "Warning" | "Error" = "Success") {
  if (!isNativePlatform()) return;
  try {
    const { Haptics, NotificationType } = await import("@capacitor/haptics");
    const map = { Success: NotificationType.Success, Warning: NotificationType.Warning, Error: NotificationType.Error };
    await Haptics.notification({ type: map[type] });
  } catch {
    // Haptics plugin not available
  }
}

export async function hapticSelectionStart() {
  if (!isNativePlatform()) return;
  try {
    const { Haptics } = await import("@capacitor/haptics");
    await Haptics.selectionStart();
  } catch {
    // Haptics plugin not available
  }
}

export async function hapticSelectionChanged() {
  if (!isNativePlatform()) return;
  try {
    const { Haptics } = await import("@capacitor/haptics");
    await Haptics.selectionChanged();
  } catch {
    // Haptics plugin not available
  }
}

export async function hapticSelectionEnd() {
  if (!isNativePlatform()) return;
  try {
    const { Haptics } = await import("@capacitor/haptics");
    await Haptics.selectionEnd();
  } catch {
    // Haptics plugin not available
  }
}
