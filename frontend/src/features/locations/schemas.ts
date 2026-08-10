import { z } from "zod";
import type { TranslateValidation } from "@/lib/forms/translate";

export const locationSchema = (t: TranslateValidation) =>
  z.object({
    name: z
      .string()
      .trim()
      .min(1, t("nameRequired"))
      .max(255, t("nameTooLong")),
    address: z.string().trim().max(1000, t("addressTooLong")),
  });

export type LocationValues = z.infer<ReturnType<typeof locationSchema>>;
