import { describe, expect, it } from "vitest";
import {
  decodeHistory,
  emptyHistory,
  UnsupportedHistoryVersionError,
} from "../src/js/history";

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
    expect(() => decodeHistory({ version: 2, history: [] })).toThrow(
      UnsupportedHistoryVersionError,
    );
  });
});
