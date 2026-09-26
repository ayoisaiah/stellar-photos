import { describe, expect, it, vi } from "vitest";

import { EmptyState } from "../src/ts/components/empty-state";

describe("EmptyState component", () => {
  it("renders loading state by default", () => {
    const el = new EmptyState();
    el.phase = "loading";

    const rendered = el.render();
    expect(rendered).toBeDefined();
    expect(rendered.values).toContain("Your first photo is on its way.");
  });

  it("renders standard error message when allSourcesDown is false", () => {
    const el = new EmptyState();
    el.phase = "error";
    el.allSourcesDown = false;

    const rendered = el.render();
    expect(rendered.values).toContain("We couldn’t find a photo just yet.");
    expect(rendered.values).toContain("Check your connection and try again.");
  });

  it("renders 'Unable to retrieve new photos.' when allSourcesDown is true in error phase", () => {
    const el = new EmptyState();
    el.phase = "error";
    el.allSourcesDown = true;

    const rendered = el.render();
    expect(rendered.values).toContain("Unable to retrieve new photos.");
    expect(rendered.values).toContain(
      "All enabled photo sources are temporarily unavailable. Check your source settings or try again later.",
    );
  });

  it("dispatches retry event on retry call", () => {
    const el = new EmptyState();
    const retrySpy = vi.fn();
    el.addEventListener("retry", retrySpy);

    // @ts-expect-error accessing private method for test
    el.retry();

    expect(retrySpy).toHaveBeenCalledOnce();
  });
});
