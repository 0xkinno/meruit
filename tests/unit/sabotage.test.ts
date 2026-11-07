import { describe, it, expect } from "vitest";
import { parseSabotage, dropIndexes, activeSabotage, signSabotage, sabotageLabel } from "@/lib/sabotage";

describe("sabotage", () => {
  it("parses a comma list", () => {
    expect(parseSabotage("drop:3,vanish")).toMatchObject({ drop: 3, vanish: true, overcharge: false });
    expect(parseSabotage("double_settle,stale_slot,overcharge")).toMatchObject({ doubleSettle: true, staleSlot: true, overcharge: true });
    expect(parseSabotage("")).toEqual({ drop: 0, vanish: false, doubleSettle: false, staleSlot: false, overcharge: false });
    expect(parseSabotage("drop:x")).toMatchObject({ drop: 0 });
  });
  it("drop picks exactly n distinct indexes", () => {
    expect([...dropIndexes(12, 3)].sort((a, b) => a - b)).toEqual([3, 6, 9]);
    expect(dropIndexes(12, 0).size).toBe(0);
    expect(dropIndexes(2, 5).size).toBe(2);
    for (let t = 1; t < 30; t++) for (let d = 1; d <= t; d++) expect(dropIndexes(t, d).size).toBe(d);
  });
  it("header applies only with a valid signature and never in production", () => {
    const env = { MERUIT_SIGNING_SECRET: "s", MERUIT_SABOTAGE: "" } as unknown as NodeJS.ProcessEnv;
    const good = new Headers({ "x-meruit-sabotage": `vanish.${signSabotage("vanish", "s")}` });
    const bad = new Headers({ "x-meruit-sabotage": "vanish.deadbeef" });
    expect(activeSabotage(good, env).vanish).toBe(true);
    expect(activeSabotage(bad, env).vanish).toBe(false);
    expect(activeSabotage(good, { ...env, VERCEL_ENV: "production" } as never).vanish).toBe(false);
  });
  it("labels", () => {
    expect(sabotageLabel(parseSabotage("drop:3,vanish"))).toBe("drop:3,vanish");
    expect(sabotageLabel(parseSabotage(""))).toBe("off");
  });
});
