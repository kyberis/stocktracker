import { describe, expect, it } from "vitest";
import {
  brokerInitials,
  filterPickerBrokers,
  mergePickerBrokers,
  TRADE_REPUBLIC_PICKER,
} from "./import-broker-picker";
import type { AvailableBrokerage } from "./snaptrade-client";

const ALPACA: AvailableBrokerage = {
  id: "1",
  slug: "ALPACA",
  name: "Alpaca",
  displayName: "Alpaca",
  enabled: true,
  maintenanceMode: false,
  isDegraded: false,
  logoUrl: "https://example.com/alpaca.png",
};

const DISABLED: AvailableBrokerage = {
  id: "2",
  slug: "OFF",
  name: "Off Broker",
  displayName: "Off Broker",
  enabled: false,
  maintenanceMode: false,
  isDegraded: false,
  logoUrl: null,
};

describe("mergePickerBrokers", () => {
  it("pins Trade Republic first and sorts SnapTrade brokers alphabetically", () => {
    const zed: AvailableBrokerage = { ...ALPACA, id: "3", slug: "ZED", name: "Zed", displayName: "Zed" };
    const merged = mergePickerBrokers([zed, ALPACA, DISABLED]);
    expect(merged[0]).toEqual(TRADE_REPUBLIC_PICKER);
    expect(merged.map((b) => b.slug)).toEqual(["trade-republic", "ALPACA", "ZED"]);
  });
});

describe("filterPickerBrokers", () => {
  const list = mergePickerBrokers([ALPACA]);

  it("returns all brokers when query is empty", () => {
    expect(filterPickerBrokers(list, "  ")).toHaveLength(list.length);
  });

  it("matches display name, name, and slug", () => {
    expect(filterPickerBrokers(list, "alpaca").map((b) => b.slug)).toEqual(["ALPACA"]);
    expect(filterPickerBrokers(list, "TRADE").map((b) => b.slug)).toEqual(["trade-republic"]);
  });

  it("returns empty when nothing matches", () => {
    expect(filterPickerBrokers(list, "nordnet")).toEqual([]);
  });
});

describe("brokerInitials", () => {
  it("uses capital letters when present", () => {
    expect(brokerInitials("Trade Republic")).toBe("TR");
  });
});
