import { describe, expect, it } from "vitest";

import { recordUrl } from "../src/ts/sources/smithsonian";

describe("recordUrl security boundary", () => {
  it("allows valid si.edu and *.si.edu hosts", () => {
    expect(recordUrl("https://si.edu/object/123")).toBe(
      "https://si.edu/object/123",
    );
    expect(recordUrl("https://www.si.edu/object/123")).toBe(
      "https://www.si.edu/object/123",
    );
    expect(recordUrl("https://airandspace.si.edu/object/123")).toBe(
      "https://airandspace.si.edu/object/123",
    );
    expect(recordUrl("http://si.edu/object/123")).toBe(
      "https://si.edu/object/123",
    );
    expect(recordUrl("/object/123")).toBe("https://www.si.edu/object/123");
  });

  it.each([
    ["evil-si.edu", "https://evil-si.edu/object/123"],
    ["si.edu.evil.com", "https://si.edu.evil.com/object/123"],
    ["not-si.edu", "https://not-si.edu/object/123"],
    ["credentials embedded", "https://user:pass@si.edu/object/123"],
    ["custom port", "https://si.edu:8080/object/123"],
    ["javascript scheme", "javascript:alert(1)"],
    ["file scheme", "file:///etc/passwd"],
    ["data scheme", "data:text/html,<script>alert(1)</script>"],
    ["undefined input", undefined],
    ["empty string", ""],
  ])("rejects hostile and invalid inputs: %s", (_label, hostileInput) => {
    expect(recordUrl(hostileInput)).toBe("https://www.si.edu/openaccess");
  });
});
