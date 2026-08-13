import { describe, expect, it } from "vitest";

import { matchStaffQueryHeuristic } from "./prodops-staff-query";

describe("matchStaffQueryHeuristic", () => {
  it("maps slash commands", () => {
    expect(matchStaffQueryHeuristic("/snapshot")).toMatchObject({
      intent: "ops_digest",
      source: "heuristic",
    });
    expect(matchStaffQueryHeuristic("/digest@trefoliobot")).toMatchObject({
      intent: "ops_digest",
    });
    expect(matchStaffQueryHeuristic("/experiments")).toMatchObject({
      intent: "experiments_overview",
    });
    expect(matchStaffQueryHeuristic("/help")).toMatchObject({ intent: "help" });
  });

  it("maps existing English phrases", () => {
    expect(matchStaffQueryHeuristic("latest user created")).toMatchObject({
      intent: "latest_user_created",
    });
    expect(matchStaffQueryHeuristic("recent feedback")).toMatchObject({
      intent: "latest_feedbacks",
    });
    expect(matchStaffQueryHeuristic("last interaction")).toMatchObject({
      intent: "latest_user_interaction",
    });
  });

  it("maps experiment assignment questions in English and Spanish", () => {
    expect(
      matchStaffQueryHeuristic("how many people on each experiment and treatment"),
    ).toMatchObject({ intent: "experiments_overview" });
    expect(
      matchStaffQueryHeuristic("cuánta gente hay en cada experimento"),
    ).toMatchObject({ intent: "experiments_overview" });
    expect(matchStaffQueryHeuristic("empty_activation treatment counts")).toMatchObject({
      intent: "experiments_overview",
    });
  });

  it("returns null for unrelated text so the LLM path can run", () => {
    expect(matchStaffQueryHeuristic("what is the weather")).toBeNull();
    expect(matchStaffQueryHeuristic("")).toBeNull();
  });
});
