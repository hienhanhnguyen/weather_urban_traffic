import { z } from "zod";
import type { TranslateValidation } from "@/lib/forms/translate";

export const MAX_COOLDOWN_MINUTES = 10_080; 


export const ruleSchema = (t: TranslateValidation) =>
  z
    .object({
      metric: z.enum(["temp", "feelslike", "precip", "precipprob"]),
      operator: z.enum([">", ">=", "<", "<="]),
      threshold: z.string().trim().min(1, t("thresholdRequired")),
      scope: z.enum(["current", "forecast_24h"]),
      severity: z.enum(["info", "warning", "critical"]),
      cooldownMinutes: z.string().trim().min(1, t("cooldownRange")),
    })
    .superRefine((values, ctx) => {
      const threshold = Number(values.threshold);

      if (!Number.isFinite(threshold)) {
        ctx.addIssue({
          code: "custom",
          path: ["threshold"],
          message: t("thresholdNumber"),
        });
      } else if (
        values.metric === "precipprob" &&
        (threshold < 0 || threshold > 100)
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["threshold"],
          message: t("thresholdPercent"),
        });
      }

      const cooldown = Number(values.cooldownMinutes);

      if (
        !Number.isInteger(cooldown) ||
        cooldown < 0 ||
        cooldown > MAX_COOLDOWN_MINUTES
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["cooldownMinutes"],
          message: t("cooldownRange"),
        });
      }
    });

export type RuleValues = z.infer<ReturnType<typeof ruleSchema>>;
