import { afterEach, describe, expect, it, vi } from "vitest";
import type { BackgroundAsset } from "../src/ts/assets";
import { StellarApp } from "../src/ts/components/stellar-app";

const asset: BackgroundAsset = {
  sourceId: "earthview",
  sourceAssetId: "1003",
  cacheKey: "unused",
  width: 1800,
  height: 1200,
  color: null,
  description: null,
  attribution: null,
  payloadVersion: 1,
  sourcePayload: {},
  createdAt: 0,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("browser downloads", () => {
  it("hands the remote URL to the browser before tracking, without fetching the image", async () => {
    const download = vi.fn().mockResolvedValue(42);
    const sendMessage = vi.fn().mockResolvedValue({ ok: true });
    const fetchMock = vi.fn();
    vi.stubGlobal("chrome", {
      downloads: { download },
      runtime: { sendMessage },
    });
    vi.stubGlobal("fetch", fetchMock);

    const app = new StellarApp();
    // @ts-expect-error Exercise the shared current-photo/history download handler.
    await app.downloadAsset(asset);

    expect(download).toHaveBeenCalledWith({
      url: "https://www.gstatic.com/prettyearth/assets/full/1003.jpg",
      filename: "earthview-1003.jpg",
    });
    expect(sendMessage).toHaveBeenCalledWith({
      command: "track-download",
      asset,
    });
    expect(download.mock.invocationCallOrder[0]).toBeLessThan(
      sendMessage.mock.invocationCallOrder[0]!,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports a failed start without tracking it and allows retry", async () => {
    const download = vi
      .fn()
      .mockRejectedValueOnce(new Error("Denied"))
      .mockResolvedValue(42);
    const sendMessage = vi.fn().mockResolvedValue({ ok: true });
    const alert = vi.fn();
    vi.stubGlobal("chrome", {
      downloads: { download },
      runtime: { sendMessage },
    });
    vi.stubGlobal("window", { alert });

    const app = new StellarApp();
    // @ts-expect-error Exercise download failure handling.
    await app.downloadAsset(asset);

    expect(alert).toHaveBeenCalledWith(
      "Couldn’t start the download. Please try again.",
    );
    expect(sendMessage).not.toHaveBeenCalled();

    // @ts-expect-error Retry the same download after failure.
    await app.downloadAsset(asset);

    expect(download).toHaveBeenCalledTimes(2);
    expect(sendMessage).toHaveBeenCalledTimes(1);
  });
});
