import { describe, expect, it } from "vitest";

import {
  readFrequency,
  statusMessage,
} from "../src/ts/components/settings-form";

describe("settings form", () => {
  it("accepts only supported frequencies", () => {
    const event = (value: string) =>
      ({ currentTarget: { value } }) as unknown as Event;

    expect(readFrequency(event("everyhour"))).toBe("everyhour");
    expect(readFrequency(event("sometimes"))).toBeUndefined();
  });

  it("formats save states", () => {
    expect(statusMessage("saving")).toBe("Saving…");
    expect(statusMessage("saved")).toBe("Saved");
    expect(statusMessage("error")).toBe("Couldn’t save this setting.");
    expect(statusMessage("idle")).toBe("");
  });
});
