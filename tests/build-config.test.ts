import { describe, expect, it } from "vitest";
import { resolveBuildAccessKey } from "../build-config";

describe("build credential loading", () => {
  it("loads UNSPLASH_ACCESS_KEY from dotenv content when the environment is empty", () => {
    expect(
      resolveBuildAccessKey({}, 'UNSPLASH_ACCESS_KEY="dotenv-access-key"\n'),
    ).toBe("dotenv-access-key");
  });

  it("prefers an exported key over dotenv content", () => {
    expect(
      resolveBuildAccessKey(
        { UNSPLASH_ACCESS_KEY: "environment-access-key" },
        "UNSPLASH_ACCESS_KEY=dotenv-access-key\n",
      ),
    ).toBe("environment-access-key");
  });
});
