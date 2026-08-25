import { describe, expect, it } from "vitest";
import { imageUrlForResolution } from "../src/js/requests";

const raw = "https://images.unsplash.com/photo-example?ixid=example";

describe("Unsplash image resolution", () => {
  it("requests a 2000px standard image", () => {
    const url = new URL(imageUrlForResolution(raw, "standard"));
    expect(url.searchParams.get("w")).toBe("2000");
    expect(url.searchParams.get("fit")).toBe("max");
  });

  it("requests a 4000px high image", () => {
    expect(
      new URL(imageUrlForResolution(raw, "high")).searchParams.get("w"),
    ).toBe("4000");
  });

  it("leaves the raw image unconstrained for max resolution", () => {
    expect(imageUrlForResolution(raw, "max")).toBe(raw);
  });
});
