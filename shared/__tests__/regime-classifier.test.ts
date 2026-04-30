import { describe, expect, it } from "vitest";
import { classifyRegime, costRatio } from "../regime-classifier";

describe("regime classifier", () => {
  it("calls close-call below the pinned 1.5x threshold", () => {
    expect(classifyRegime(100, 140)).toBe("close-call");
  });

  it("calls self-host when it is clearly cheaper", () => {
    expect(classifyRegime(100, 151)).toBe("self-host-wins");
  });

  it("calls API when it is clearly cheaper", () => {
    expect(classifyRegime(151, 100)).toBe("api-wins");
  });

  it("treats infeasible self-hosting as API wins", () => {
    expect(classifyRegime(Number.POSITIVE_INFINITY, 100)).toBe("api-wins");
  });

  it("returns nullable ratios for infeasible inputs", () => {
    expect(costRatio(Number.POSITIVE_INFINITY, 100)).toBeNull();
    expect(costRatio(100, 151)).toBeCloseTo(1.51);
  });
});
