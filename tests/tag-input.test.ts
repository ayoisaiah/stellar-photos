import { describe, expect, it, vi } from "vitest";

import { parseTags, StellarTagInput } from "../src/ts/components/tag-input";

describe("tag input parsing", () => {
  it("parses comma-separated values into trimmed arrays", () => {
    expect(parseTags("998309, 317099, 12345")).toEqual([
      "998309",
      "317099",
      "12345",
    ]);
    expect(parseTags("  wallpapers ,  nature  , travel ")).toEqual([
      "wallpapers",
      "nature",
      "travel",
    ]);
  });

  it("handles empty, null, or whitespace-only inputs", () => {
    expect(parseTags("")).toEqual([]);
    expect(parseTags(null)).toEqual([]);
    expect(parseTags(undefined)).toEqual([]);
    expect(parseTags("   , ,   ")).toEqual([]);
  });
});

describe("StellarTagInput component", () => {
  it("adds tags and emits change when valid", async () => {
    const el = new StellarTagInput();
    el.value = "nature";

    const changeSpy = vi.fn();
    el.addEventListener("change", (e) =>
      changeSpy((e as CustomEvent<{ value: string }>).detail.value),
    );

    // Simulate commitInput with candidate "wallpapers"
    // @ts-expect-error accessing private method for unit testing
    await el.addTags(["wallpapers"]);

    expect(changeSpy).toHaveBeenCalledWith("nature, wallpapers");
  });

  it("normalizes tags when validator returns normalized identifier", async () => {
    const el = new StellarTagInput();
    el.value = "";
    el.validate = async (tag) => {
      if (tag.includes("collections/12345")) {
        return { valid: true, normalized: "12345" };
      }
      return { valid: true };
    };

    const changeSpy = vi.fn();
    el.addEventListener("change", (e) =>
      changeSpy((e as CustomEvent<{ value: string }>).detail.value),
    );

    // @ts-expect-error accessing private method for unit testing
    await el.addTags(["https://unsplash.com/collections/12345/nature"]);

    expect(changeSpy).toHaveBeenCalledWith("12345");
  });

  it("rejects invalid tags and exposes error message", async () => {
    const el = new StellarTagInput();
    el.value = "nature";
    el.validate = async () => ({
      valid: false,
      error: 'Collection "999" was not found on Unsplash.',
    });

    const changeSpy = vi.fn();
    el.addEventListener("change", (e) =>
      changeSpy((e as CustomEvent<{ value: string }>).detail.value),
    );

    // @ts-expect-error accessing private method for unit testing
    await el.addTags(["999"]);

    expect(changeSpy).not.toHaveBeenCalled();
    // @ts-expect-error accessing private state for testing
    expect(el.errorMessage).toBe('Collection "999" was not found on Unsplash.');
  });

  it("handles boolean validation result", async () => {
    const el = new StellarTagInput();
    el.value = "";
    el.validate = (tag) => tag === "valid-tag";

    // @ts-expect-error accessing private method for unit testing
    await el.addTags(["valid-tag"]);
    expect(el.value).toBe("valid-tag");

    // @ts-expect-error accessing private method for unit testing
    await el.addTags(["bad-tag"]);
    // @ts-expect-error accessing private state for testing
    expect(el.errorMessage).toBe('"bad-tag" is invalid.');
  });

  it("clears error message on removeTag", () => {
    const el = new StellarTagInput();
    el.value = "tag1, tag2";
    // @ts-expect-error accessing private state
    el.errorMessage = "Some error";

    // @ts-expect-error accessing private method
    el.removeTag(0);

    // @ts-expect-error accessing private state
    expect(el.errorMessage).toBe("");
    expect(el.value).toBe("tag2");
  });

  it("preserves uncommitted text after comma when adding comma-delimited prefix", async () => {
    const el = new StellarTagInput();
    el.value = "";
    el.validate = async () =>
      new Promise((resolve) => setTimeout(() => resolve(true), 10));

    const inputMock = {
      value: "nature,wallpapers",
    } as unknown as HTMLInputElement;
    const eventMock = { currentTarget: inputMock } as unknown as Event;

    // @ts-expect-error accessing private method
    el.handleInput(eventMock);

    // @ts-expect-error accessing private state
    expect(el.inputValue).toBe("wallpapers");

    // Simulate user continuing to type while async validation is in flight
    // @ts-expect-error accessing private state
    el.inputValue = "wallpapers_hdr";

    // Wait for validation to finish
    await new Promise((resolve) => setTimeout(resolve, 20));

    // @ts-expect-error accessing private state
    expect(el.inputValue).toBe("wallpapers_hdr");
    expect(el.value).toBe("nature");
  });
});
