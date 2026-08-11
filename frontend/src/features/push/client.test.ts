import { describe, expect, it } from "vitest";
import {
  PushError,
  sameServerKey,
  subscriptionInput,
  urlBase64ToUint8Array,
} from "./client";

const KEY_BYTES = Uint8Array.from({ length: 65 }, (_, i) => (i * 7) % 256);
const KEY = Buffer.from(KEY_BYTES).toString("base64url");

describe("urlBase64ToUint8Array", () => {
  it("decodes an unpadded string", () => {
    expect([...urlBase64ToUint8Array("AAECAw")]).toEqual([0, 1, 2, 3]);
  });

  it("translates the url-safe alphabet", () => {
    expect([...urlBase64ToUint8Array("-_--")]).toEqual([0xfb, 0xff, 0xbe]);
  });

  it("round-trips a VAPID-sized key", () => {
    expect(KEY).not.toContain("=");
    expect([...urlBase64ToUint8Array(KEY)]).toEqual([...KEY_BYTES]);
  });
});

describe("sameServerKey", () => {
  it("matches an identical key", () => {
    expect(sameServerKey(KEY_BYTES.slice().buffer, KEY_BYTES)).toBe(true);
  });

  it("rejects a rotated key of the same length", () => {
    const rotated = KEY_BYTES.slice();
    rotated[64] ^= 1;
    expect(sameServerKey(rotated.buffer, KEY_BYTES)).toBe(false);
  });

  it("rejects a key of a different length", () => {
    expect(sameServerKey(KEY_BYTES.slice(0, 64).buffer, KEY_BYTES)).toBe(false);
  });

  it("treats a browser that reports no key as a mismatch", () => {
    expect(sameServerKey(null, KEY_BYTES)).toBe(false);
  });
});

describe("subscriptionInput", () => {
  const JSON_SUB = {
    endpoint: "https://fcm.googleapis.com/fcm/send/abc",
    keys: { p256dh: "p256dh-value", auth: "auth-value" },
  };

  it("keeps only the fields the API takes", () => {
    expect(subscriptionInput({ ...JSON_SUB, expirationTime: 123 })).toEqual({
      endpoint: JSON_SUB.endpoint,
      keys: JSON_SUB.keys,
    });
  });

  it("truncates a user agent to the column width", () => {
    const input = subscriptionInput(JSON_SUB, "x".repeat(400));
    expect(input.user_agent).toHaveLength(255);
  });

  it("rejects a subscription without keys", () => {
    expect(() => subscriptionInput({ endpoint: JSON_SUB.endpoint })).toThrow(
      PushError,
    );
    expect(() =>
      subscriptionInput({ ...JSON_SUB, keys: { p256dh: "only-one" } }),
    ).toThrow(PushError);
  });
});
