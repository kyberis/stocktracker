import { afterEach, describe, expect, it, vi } from "vitest";
import {
  __resetExperimentPreviewForTests,
  clearExperimentPreview,
  getExperimentPreview,
  hasAnyExperimentPreview,
  listExperimentPreviews,
  setExperimentPreview,
  subscribeExperimentPreview,
  syncExperimentPreviewFromSearchParams,
} from "@/lib/experiment-preview";

describe("experiment-preview", () => {
  afterEach(() => {
    __resetExperimentPreviewForTests();
  });

  it("sets, gets, lists, and clears previews", () => {
    setExperimentPreview("empty_activation", "job_chooser");
    expect(getExperimentPreview("empty_activation")).toBe("job_chooser");
    expect(listExperimentPreviews()).toEqual({
      empty_activation: "job_chooser",
    });
    clearExperimentPreview("empty_activation");
    expect(getExperimentPreview("empty_activation")).toBeNull();
    expect(hasAnyExperimentPreview()).toBe(false);
  });

  it("notifies subscribers on change", () => {
    const spy = vi.fn();
    const unsub = subscribeExperimentPreview(spy);
    setExperimentPreview("empty_activation", "control");
    expect(spy).toHaveBeenCalledTimes(1);
    clearExperimentPreview("all");
    expect(spy).toHaveBeenCalledTimes(2);
    unsub();
    setExperimentPreview("empty_activation", "control");
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("syncs from exp_preview search params", () => {
    const params = new URLSearchParams(
      "exp_preview=empty_activation:portfolio_first",
    );
    const applied = syncExperimentPreviewFromSearchParams(params);
    expect(applied).toEqual({
      key: "empty_activation",
      variant: "portfolio_first",
    });
    expect(getExperimentPreview("empty_activation")).toBe("portfolio_first");
  });
});
