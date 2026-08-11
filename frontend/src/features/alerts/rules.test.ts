import { describe, expect, it } from "vitest";
import type { TranslateValidation } from "@/lib/forms/translate";
import { isMuted, unitLabel } from "./format";
import { ruleSchema, type RuleValues } from "./schemas";

const key: TranslateValidation = (name) => name;

const schema = ruleSchema(key);

const valid: RuleValues = {
  metric: "temp",
  operator: ">",
  threshold: "35",
  scope: "current",
  severity: "warning",
  cooldownMinutes: "60",
};

const errorsOn = (values: Partial<RuleValues>, field: keyof RuleValues) => {
  const result = schema.safeParse({ ...valid, ...values });
  return result.success
    ? []
    : result.error.issues
        .filter((issue) => issue.path[0] === field)
        .map((issue) => issue.message);
};

describe("ruleSchema", () => {
  it("accepts a plain threshold", () => {
    expect(schema.safeParse(valid).success).toBe(true);
  });

  it("rejects a blank threshold rather than reading it as zero", () => {
    expect(errorsOn({ threshold: "" }, "threshold")).toEqual([
      "thresholdRequired",
    ]);
  });

  it("rejects a threshold that is not a number", () => {
    expect(errorsOn({ threshold: "warm" }, "threshold")).toEqual([
      "thresholdNumber",
    ]);
  });

  it("accepts a negative threshold", () => {
    expect(errorsOn({ threshold: "-5" }, "threshold")).toEqual([]);
  });

  it("keeps a probability within 0 and 100", () => {
    const outOfRange = { metric: "precipprob", threshold: "150" } as const;
    expect(errorsOn(outOfRange, "threshold")).toEqual(["thresholdPercent"]);
    expect(errorsOn({ ...outOfRange, threshold: "80" }, "threshold")).toEqual(
      [],
    );
  });

  it("bounds the range of a probability only for that metric", () => {
    expect(errorsOn({ metric: "temp", threshold: "150" }, "threshold")).toEqual(
      [],
    );
  });

  it("requires a whole cooldown inside the backend cap", () => {
    expect(errorsOn({ cooldownMinutes: "1.5" }, "cooldownMinutes")).toEqual([
      "cooldownRange",
    ]);
    expect(errorsOn({ cooldownMinutes: "10081" }, "cooldownMinutes")).toEqual([
      "cooldownRange",
    ]);
    expect(errorsOn({ cooldownMinutes: "0" }, "cooldownMinutes")).toEqual([]);
  });
});

describe("isMuted", () => {
  it("flags a rule the account's minimum severity would drop", () => {
    expect(isMuted("info", "warning")).toBe(true);
    expect(isMuted("warning", "warning")).toBe(false);
    expect(isMuted("critical", "warning")).toBe(false);
  });

  it("claims nothing while the preference is still unknown", () => {
    expect(isMuted("info", undefined)).toBe(false);
  });
});

describe("unitLabel", () => {
  it("renders the stored unit for display", () => {
    expect(unitLabel("C")).toBe("°C");
    expect(unitLabel("mm")).toBe("mm");
    expect(unitLabel(null)).toBe("");
  });
});
