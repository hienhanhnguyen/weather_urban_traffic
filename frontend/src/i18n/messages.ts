import type { Locale } from "./config";
import type en from "./messages/en.json";

export type Messages = typeof en;

const inFlight = new Map<Locale, Promise<Messages>>();

export function loadMessages(locale: Locale): Promise<Messages> {
  let promise = inFlight.get(locale);

  if (!promise) {
    promise =
      locale === "vi"
        ? import("./messages/vi.json").then((module) => module.default)
        : import("./messages/en.json").then((module) => module.default);

    inFlight.set(locale, promise);
  }

  return promise;
}
