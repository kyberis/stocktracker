import { describe, expect, it } from "vitest";
import {
  DEFAULT_JOBS_NAV_JOB,
  getChipsForJob,
  isJobsNavChipActive,
  isJobsNavJob,
  parseJobsNavJob,
} from "./jobs-nav";

describe("parseJobsNavJob", () => {
  it("accepts known jobs", () => {
    expect(parseJobsNavJob("alta")).toBe("alta");
    expect(parseJobsNavJob("evaluar")).toBe("evaluar");
    expect(parseJobsNavJob("descubrir")).toBe("descubrir");
  });

  it("falls back to evaluar", () => {
    expect(parseJobsNavJob(null)).toBe(DEFAULT_JOBS_NAV_JOB);
    expect(parseJobsNavJob("nope")).toBe("evaluar");
    expect(isJobsNavJob("alta")).toBe(true);
    expect(isJobsNavJob("x")).toBe(false);
  });
});

describe("getChipsForJob", () => {
  it("returns Alta actions", () => {
    const ids = getChipsForJob("alta").map((c) => c.id);
    expect(ids).toEqual(["import", "add", "warren"]);
    expect(getChipsForJob("alta").find((c) => c.id === "import")?.href).toBe("/import");
  });

  it("returns Evaluar destinations", () => {
    const chips = getChipsForJob("evaluar");
    expect(chips.map((c) => c.id)).toEqual(["home", "alerts", "portfolio", "allocation", "tools"]);
    expect(chips.find((c) => c.id === "alerts")?.href).toBe("/tools/alerts");
    expect(chips.find((c) => c.id === "allocation")?.href).toBe("/tools/taxonomy");
  });

  it("returns Descubrir destinations", () => {
    const chips = getChipsForJob("descubrir");
    expect(chips.map((c) => c.id)).toEqual(["screener", "moat", "analysis", "explore"]);
    expect(chips.find((c) => c.id === "screener")?.href).toBe("/tools/screener");
    expect(chips.find((c) => c.id === "moat")?.href).toBe("/tools/evaluation");
  });
});

describe("isJobsNavChipActive", () => {
  const evaluar = getChipsForJob("evaluar");
  const home = evaluar.find((c) => c.id === "home")!;
  const tools = evaluar.find((c) => c.id === "tools")!;
  const alerts = evaluar.find((c) => c.id === "alerts")!;
  const add = getChipsForJob("alta").find((c) => c.id === "add")!;

  it("matches Home only on /", () => {
    expect(isJobsNavChipActive(home, "/")).toBe(true);
    expect(isJobsNavChipActive(home, "/portfolio")).toBe(false);
  });

  it("does not treat nested tools routes as the Tools hub", () => {
    expect(isJobsNavChipActive(tools, "/tools")).toBe(true);
    expect(isJobsNavChipActive(tools, "/tools/alerts")).toBe(false);
    expect(isJobsNavChipActive(alerts, "/tools/alerts")).toBe(true);
  });

  it("never marks action chips active", () => {
    expect(isJobsNavChipActive(add, "/")).toBe(false);
  });
});
