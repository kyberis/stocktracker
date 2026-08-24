import { describe, expect, it, beforeEach } from "vitest";
import {
  clearHomeBootstrapBookHydrated,
  isHomeBootstrapPending,
  markHomeBootstrapBookHydrated,
  setHomeBootstrapPending,
  wasHomeBootstrapBookHydrated,
} from "./home-bootstrap-pending";

describe("home-bootstrap-pending", () => {
  beforeEach(() => {
    setHomeBootstrapPending(false);
    clearHomeBootstrapBookHydrated();
  });

  it("tracks pending flag", () => {
    expect(isHomeBootstrapPending()).toBe(false);
    setHomeBootstrapPending(true);
    expect(isHomeBootstrapPending()).toBe(true);
  });

  it("tracks hydrated portfolio book", () => {
    expect(wasHomeBootstrapBookHydrated("p1")).toBe(false);
    markHomeBootstrapBookHydrated("p1");
    expect(wasHomeBootstrapBookHydrated("p1")).toBe(true);
    expect(wasHomeBootstrapBookHydrated("p2")).toBe(false);
  });
});
