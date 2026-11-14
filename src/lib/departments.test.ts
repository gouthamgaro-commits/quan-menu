import { describe, expect, it } from "vitest";
import { alternateDepartments, distinctPicks } from "./departments";

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

describe("distinctPicks", () => {
  const departments = new Map([["w1", "women"], ["w2", "women"], ["w3", "women"], ["m1", "men"], ["m2", "men"], ["m3", "men"]]);
  const ids = (lists: { id: string }[][]) => lists.map((l) => l.map((p) => p.id));

  it("shows a piece in two lists only in the first, departments still in turn", () => {
    const lists = [["w1", "m1", "w2"], ["w1", "m2", "w3", "m3"]].map((l) => l.map(piece));
    expect(ids(distinctPicks(lists, departments, 2))).toEqual([["w1", "m1"], ["m2", "w3"]]);
  });

  it("tops up a list that has too few others with pieces shown before", () => {
    const lists = [["w1", "m1"], ["m1", "w1", "w2"]].map((l) => l.map(piece));
    expect(ids(distinctPicks(lists, departments, 2))).toEqual([["w1", "m1"], ["w2", "m1"]]);
    expect(distinctPicks([], departments, 4)).toEqual([]);
  });
});
