import { describe, expect, it } from "vitest";
import { alternateDepartments } from "./departments";

const piece = (id: string) => ({ id });

describe("alternateDepartments", () => {
  it("takes pieces from each department in turn, each keeping its own order", () => {
    const items = ["w1", "w2", "w3", "m1", "m2", "a1"].map(piece);
    const departments = new Map([["w1", "women"], ["w2", "women"], ["w3", "women"], ["m1", "men"], ["m2", "men"], ["a1", "accessories"]]);
    expect(alternateDepartments(items, departments).map((p) => p.id)).toEqual(["w1", "m1", "a1", "w2", "m2", "w3"]);
  });

  it("leads with the department that came first, and leaves a single department as it was", () => {
    const departments = new Map([["m1", "men"], ["w1", "women"], ["m2", "men"]]);
    expect(alternateDepartments(["m1", "m2", "w1"].map(piece), departments).map((p) => p.id)).toEqual(["m1", "w1", "m2"]);
    expect(alternateDepartments(["a", "b", "c"].map(piece), new Map()).map((p) => p.id)).toEqual(["a", "b", "c"]);
    expect(alternateDepartments([], new Map())).toEqual([]);
  });
});
