import { describe, expect, it } from "vitest";
import {
  decodeHistory,
  emptyHistory,
  UnsupportedHistoryVersionError,
} from "../src/ts/history";

describe("history schema", () => {
  it("distinguishes absent and supported empty state", () => {
    expect(decodeHistory(undefined)).toBeNull();
    expect(decodeHistory(emptyHistory())).toEqual(emptyHistory());
  });

  it("rejects malformed state", () => {
    expect(() => decodeHistory({ version: 1, history: "nope" })).toThrow(
      "Malformed",
    );
  });

  it("fails closed on a future schema", () => {
    expect(() => decodeHistory({ version: 3, history: [] })).toThrow(
      UnsupportedHistoryVersionError,
    );
  });

  it("upgrades legacy Unsplash records to source-owned payloads", () => {
    const state = decodeHistory({
      version: 1,
      currentId: "photo-1",
      history: [
        {
          id: "photo-1",
          cacheKey: "https://cache.stellar-photos.invalid/photo/photo-1",
          width: 1600,
          height: 900,
          color: "#123456",
          description: "A mountain",
          photographerName: "Ada",
          photographerUrl: "https://unsplash.com/@ada",
          unsplashUrl: "https://unsplash.com/photos/photo-1",
          downloadLocation: "https://api.unsplash.com/photos/photo-1/download",
          createdAt: 1,
        },
      ],
    });

    expect(state).toMatchObject({
      version: 2,
      history: [
        {
          sourceId: "unsplash",
          sourceAssetId: "photo-1",
          attribution: {
            name: "Ada",
            url: "https://unsplash.com/@ada",
            sourceUrl: "https://unsplash.com/photos/photo-1",
          },
          payloadVersion: 1,
          sourcePayload: {
            downloadLocation:
              "https://api.unsplash.com/photos/photo-1/download",
          },
        },
      ],
    });
  });

  it("drops only malformed legacy records", () => {
    const state = decodeHistory({
      version: 1,
      history: [
        { broken: true },
        {
          id: "photo-1",
          cacheKey: "https://cache.stellar-photos.invalid/photo/photo-1",
          width: 1600,
          height: 900,
          photographerName: "Ada",
          photographerUrl: "https://unsplash.com/@ada",
          unsplashUrl: "https://unsplash.com/photos/photo-1",
          downloadLocation: "https://api.unsplash.com/photos/photo-1/download",
          createdAt: 1,
        },
      ],
    });

    expect(state?.history).toHaveLength(1);
    expect(state?.history[0]?.sourceAssetId).toBe("photo-1");
  });
});
