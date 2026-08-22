import { AsyncLocalStorage } from "node:async_hooks";

export interface TrafficRequestContext {
  apiGroup: string;
}

const storage = new AsyncLocalStorage<TrafficRequestContext>();

export function getTrafficApiGroup(): string | undefined {
  return storage.getStore()?.apiGroup;
}

export function runWithTrafficApiGroup<T>(apiGroup: string, fn: () => T): T {
  return storage.run({ apiGroup }, fn);
}

export async function runWithTrafficApiGroupAsync<T>(
  apiGroup: string,
  fn: () => Promise<T>,
): Promise<T> {
  return storage.run({ apiGroup }, fn);
}
