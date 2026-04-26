import nodePath from "node:path/posix";
import { describe, expect, test } from "vitest";

import * as shim from "../path-browser";

describe("path-browser shim", () => {
  test("sep and delimiter match POSIX", () => {
    expect(shim.sep).toBe(nodePath.sep);
    expect(shim.delimiter).toBe(nodePath.delimiter);
  });

  const joins: string[][] = [
    ["a", "b", "c"],
    ["/a", "b", "c"],
    ["a", "..", "b"],
    ["a", "", "b"],
    ["/", "foo", "bar"],
    ["a/", "b/"],
    ["./a", "b"],
  ];
  for (const parts of joins) {
    test(`join(${parts.map((p) => JSON.stringify(p)).join(", ")})`, () => {
      expect(shim.join(...parts)).toBe(nodePath.join(...parts));
    });
  }

  const dirCases = ["/a/b/c", "a/b/c", "/a", "a", "/", "."];
  for (const p of dirCases) {
    test(`dirname(${JSON.stringify(p)})`, () => {
      expect(shim.dirname(p)).toBe(nodePath.dirname(p));
    });
  }

  const baseCases: Array<[string, string?]> = [["/a/b/c.ts"], ["/a/b/c.ts", ".ts"], ["a/b"], ["a"]];
  for (const [p, ext] of baseCases) {
    test(`basename(${JSON.stringify(p)}, ${JSON.stringify(ext)})`, () => {
      expect(shim.basename(p, ext)).toBe(nodePath.basename(p, ext));
    });
  }

  const extCases = ["a.ts", "a.spec.ts", "a", ".hidden", "/x/y/z.json"];
  for (const p of extCases) {
    test(`extname(${JSON.stringify(p)})`, () => {
      expect(shim.extname(p)).toBe(nodePath.extname(p));
    });
  }

  test("isAbsolute matches POSIX", () => {
    for (const p of ["/a", "a", "./a", "../a", "/", ""]) {
      expect(shim.isAbsolute(p)).toBe(nodePath.isAbsolute(p));
    }
  });

  test("relative matches POSIX", () => {
    expect(shim.relative("/a/b", "/a/c")).toBe(nodePath.relative("/a/b", "/a/c"));
    expect(shim.relative("/a/b/c", "/a/d")).toBe(nodePath.relative("/a/b/c", "/a/d"));
    expect(shim.relative("/a", "/a")).toBe(nodePath.relative("/a", "/a"));
  });

  test("posix.* re-exports the same functions", () => {
    expect(shim.posix.join("a", "b")).toBe(shim.join("a", "b"));
    expect(shim.posix.resolve("/a", "b")).toBe(shim.resolve("/a", "b"));
  });
});
