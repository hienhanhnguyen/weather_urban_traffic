import { z } from "zod";
import type { TranslateValidation } from "@/lib/forms/translate";

export const routeSchema = (t: TranslateValidation) =>
  z.object({
    name: z
      .string()
      .trim()
      .min(1, t("nameRequired"))
      .max(255, t("nameTooLong")),
  });

export type RouteValues = z.infer<ReturnType<typeof routeSchema>>;
