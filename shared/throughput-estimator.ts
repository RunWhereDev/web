import { DEFAULT_ASSUMPTIONS, quantizationBytesPerParam, quantizationThroughputMultiplier } from "./cost-formulas";
import type { CostAssumptions, ModelRecord, Quantization } from "./types";

const WEIGHT_SCAN_CALIBRATION = 4;

export function vramRequiredGb(model: Pick<ModelRecord, "architecture" | "active_params_b" | "params_b">, quantization: Quantization) {
  const paramsForInference = model.architecture === "moe" ? model.active_params_b : model.params_b;
  const rawGb = paramsForInference * quantizationBytesPerParam(quantization);

  return rawGb * 1.15;
}

export function estimatePerGpuThroughputTps(
  memoryBandwidthGbps: number,
  model: Pick<ModelRecord, "active_params_b">,
  quantization: Quantization,
  assumptions: CostAssumptions = DEFAULT_ASSUMPTIONS
) {
  const activeBytesGbFp16 = model.active_params_b * 2;
  const fp16Tps = (memoryBandwidthGbps / activeBytesGbFp16) * assumptions.utilization * WEIGHT_SCAN_CALIBRATION;

  return fp16Tps * quantizationThroughputMultiplier(quantization, assumptions);
}
