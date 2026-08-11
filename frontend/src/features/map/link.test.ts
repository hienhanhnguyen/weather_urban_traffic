import { describe, expect, it } from "vitest";
import { mapHrefFor, parseRouteLink } from "./link";

const ROUTE = {
  start: { latitude: 21.028511, longitude: 105.804817, address: "Hanoi" },
  end: { latitude: 20.844912, longitude: 106.688087, address: "Hai Phong" },
  profile: "cycling" as const,
};

describe("mapHrefFor / parseRouteLink", () => {
  it("survives a round trip", () => {
    const href = mapHrefFor(ROUTE);
    const link = parseRouteLink(new URLSearchParams(href.split("?")[1]));

    expect(link).toEqual({
      origin: { latitude: 21.028511, longitude: 105.804817, label: "Hanoi" },
      destination: {
        latitude: 20.844912,
        longitude: 106.688087,
        label: "Hai Phong",
      },
      profile: "cycling",
    });
  });

  it("omits labels that are not there", () => {
    const href = mapHrefFor({ ...ROUTE, start: { ...ROUTE.start, address: null } });

    expect(href).not.toContain("from=");
    expect(parseRouteLink(new URLSearchParams(href.split("?")[1]))?.origin.label)
      .toBe("");
  });

  it("falls back to driving for an unknown profile", () => {
    const params = new URLSearchParams(
      "fromLat=21&fromLng=105&toLat=20&toLng=106&profile=teleport",
    );

    expect(parseRouteLink(params)?.profile).toBe("driving");
  });

  it("rejects a half-filled or out-of-range link", () => {
    expect(parseRouteLink(new URLSearchParams("fromLat=21&fromLng=105"))).toBeNull();
    expect(
      parseRouteLink(new URLSearchParams("fromLat=91&fromLng=105&toLat=20&toLng=106")),
    ).toBeNull();
    expect(
      parseRouteLink(new URLSearchParams("fromLat=a&fromLng=105&toLat=20&toLng=106")),
    ).toBeNull();
  });
});
