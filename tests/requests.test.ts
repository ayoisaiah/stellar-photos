import { describe, expect, it } from "vitest";

import {
  buildRandomPhotoUrl,
  cleanIdentifier,
} from "../src/ts/sources/unsplash";

describe("buildRandomPhotoUrl", () => {
  it("defaults to the Stellar Photos collection with standard content filter", () => {
    const url = buildRandomPhotoUrl({});
    expect(url.searchParams.get("collections")).toBe("998309");
    expect(url.searchParams.get("content_filter")).toBe("low");
    expect(url.searchParams.get("count")).toBe("30");
    expect(url.searchParams.get("query")).toBeNull();
    expect(url.searchParams.get("topics")).toBeNull();
    expect(url.searchParams.get("username")).toBeNull();
    expect(url.searchParams.get("orientation")).toBeNull();
  });

  it("combines topics, collections, and username when no query is specified", () => {
    const url = buildRandomPhotoUrl({
      collections: "12345, 67890",
      topics: "nature, wallpapers",
      username: "nasa",
      orientation: "landscape",
      contentFilter: "high",
    });

    expect(url.searchParams.get("collections")).toBe("12345,67890");
    expect(url.searchParams.get("topics")).toBe("nature,wallpapers");
    expect(url.searchParams.get("username")).toBe("nasa");
    expect(url.searchParams.get("orientation")).toBe("landscape");
    expect(url.searchParams.get("content_filter")).toBe("high");
    expect(url.searchParams.get("query")).toBeNull();
  });

  it("enforces Unsplash restriction by omitting collections and topics when query is set", () => {
    const url = buildRandomPhotoUrl({
      query: "galaxy stars",
      collections: "12345",
      topics: "space",
      username: "nasa",
      orientation: "portrait",
    });

    expect(url.searchParams.get("query")).toBe("galaxy stars");
    expect(url.searchParams.get("username")).toBe("nasa");
    expect(url.searchParams.get("orientation")).toBe("portrait");
    expect(url.searchParams.get("collections")).toBeNull();
    expect(url.searchParams.get("topics")).toBeNull();
  });

  it("omits default collection when user or topics are explicitly configured without collections", () => {
    const urlUser = buildRandomPhotoUrl({ username: "nasa", collections: "" });
    expect(urlUser.searchParams.get("username")).toBe("nasa");
    expect(urlUser.searchParams.get("collections")).toBeNull();

    const urlTopic = buildRandomPhotoUrl({ topics: "nature", collections: "" });
    expect(urlTopic.searchParams.get("topics")).toBe("nature");
    expect(urlTopic.searchParams.get("collections")).toBeNull();
  });

  it("extracts slugs and IDs when full Unsplash URLs are passed as topics or collections", () => {
    const url = buildRandomPhotoUrl({
      topics: "https://unsplash.com/t/wallpapers, nature",
      collections: "https://unsplash.com/collections/12345/featured, 67890",
    });
    expect(url.searchParams.get("topics")).toBe("wallpapers,nature");
    expect(url.searchParams.get("collections")).toBe("12345,67890");
  });
});

describe("cleanIdentifier", () => {
  it.each([
    ["https://unsplash.com/collections/123/forest-walks", "123"],
    ["unsplash.com/collections/123/forest-walks", "123"],
    ["https://unsplash.com/t/nature?order=latest#photos", "nature"],
    ["nature", "nature"],
    ["  @ada  ", "ada"],
    ["https://unsplash.com/@ada/photos", "ada"],
    ["", ""],
  ])("extracts %s as %s", (input, expected) => {
    expect(cleanIdentifier(input)).toBe(expected);
  });
});
