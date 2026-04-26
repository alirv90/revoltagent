import { isDeepStrictEqual as nodeIsDeepStrictEqual } from "node:util";
import { describe, expect, test } from "vitest";

import { isDeepStrictEqual } from "../node-util";

const cases: Array<[string, unknown, unknown]> = [
  ["identical primitives", 1, 1],
  ["distinct primitives", 1, 2],
  ["NaN equals NaN", Number.NaN, Number.NaN],
  ["null === null", null, null],
  ["null vs undefined", null, undefined],
  ["string equality", "abc", "abc"],
  ["empty objects", {}, {}],
  ["nested object equality", { a: { b: [1, 2] } }, { a: { b: [1, 2] } }],
  ["nested object inequality", { a: { b: [1, 2] } }, { a: { b: [1, 3] } }],
  ["array length mismatch", [1, 2, 3], [1, 2]],
  ["array order mismatch", [1, 2, 3], [3, 2, 1]],
  ["key order independence", { a: 1, b: 2 }, { b: 2, a: 1 }],
  ["extra key", { a: 1 }, { a: 1, b: 2 }],
  ["dates equal", new Date(0), new Date(0)],
  ["dates not equal", new Date(0), new Date(1)],
  ["regexp equal", /abc/g, /abc/g],
  ["regexp flag mismatch", /abc/g, /abc/i],
  ["typed arrays equal", new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 3])],
  ["typed arrays unequal", new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 4])],
];

describe("isDeepStrictEqual shim", () => {
  for (const [name, a, b] of cases) {
    test(name, () => {
      expect(isDeepStrictEqual(a, b)).toBe(nodeIsDeepStrictEqual(a, b));
    });
  }

  test("self-reference (sanity)", () => {
    const obj = { a: 1 };
    expect(isDeepStrictEqual(obj, obj)).toBe(true);
  });

  test("tool-call-shaped JSON arguments match node:util", () => {
    const a = { tool: "search", args: { query: "voltagent", limit: 5, flags: ["new", "trim"] } };
    const b = { tool: "search", args: { query: "voltagent", limit: 5, flags: ["new", "trim"] } };
    expect(isDeepStrictEqual(a, b)).toBe(true);
    expect(isDeepStrictEqual(a, b)).toBe(nodeIsDeepStrictEqual(a, b));
  });
});
