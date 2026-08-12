import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/i18n/messages/en.json";
import { SkipLink } from "./SkipLink";

const renderLink = () =>
  render(
    <NextIntlClientProvider
      locale="en"
      messages={messages}
      timeZone="Asia/Ho_Chi_Minh"
    >
      <SkipLink />
    </NextIntlClientProvider>,
  );

describe("SkipLink", () => {
  it("targets the main landmark the app layout renders", () => {
    renderLink();

    expect(
      screen.getByRole("link", { name: messages.nav.skipToContent }),
    ).toHaveAttribute("href", "#main-content");
  });

  it("stays in the accessibility tree while it is visually hidden", () => {
    renderLink();

    const link = screen.getByRole("link", {
      name: messages.nav.skipToContent,
    });

    expect(link.className).toContain("sr-only");
    expect(link.className).toContain("focus:not-sr-only");
    expect(link).not.toHaveAttribute("aria-hidden");
  });
});
