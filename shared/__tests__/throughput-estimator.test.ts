import { describe, expect, it } from "vitest";
import { DEFAULT_ASSUMPTIONS } from "../cost-formulas";
import { estimatePerGpuThroughputTps, vramRequiredGb } from "../throughput-estimator";

describe("throughput estimator", () => {
  it("uses active parameters for MoE VRAM sizing", () => {
    expect(
      vramRequiredGb(
        {
          architecture: "moe",
          active_params_b: 17,
          params_b: 400
        },
        "fp16"
      )
    ).toBeCloseTo(39.1);
  });

  it("uses total parameters for dense VRAM sizing", () => {
    expect(
      vramRequiredGb(
        {
          architecture: "dense",
          active_params_b: 24,
          params_b: 24
        },
        "int8"
      )
    ).toBeCloseTo(27.6);
  });

  it("estimates throughput from memory bandwidth and quantization multiplier", () => {
    const fp16 = estimatePerGpuThroughputTps(3350, { active_params_b: 17 }, "fp16", DEFAULT_ASSUMPTIONS);
    const int8 = estimatePerGpuThroughputTps(3350, { active_params_b: 17 }, "int8", DEFAULT_ASSUMPTIONS);

    expect(fp16).toBeCloseTo(236.47, 2);
    expect(int8).toBeCloseTo(fp16 * DEFAULT_ASSUMPTIONS.int8ThroughputMultiplier, 2);
  });
});
