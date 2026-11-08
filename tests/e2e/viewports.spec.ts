import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync } from "node:fs";

// Part 12.7: for every page and viewport, no horizontal scroll, no overlap of hero text and scene, navbar on
// one baseline, 44 px taps, zero console errors, axe AA. Screenshots go to tests/e2e/__screens__/.
const VIEWPORTS = [
  { name: "iphone14", width: 390, height: 844 },
  { name: "iphone-pro-max", width: 430, height: 932 },
  { name: "pixel7", width: 412, height: 915 },
  { name: "ipad-air", width: 820, height: 1180 },
  { name: "laptop", width: 1280, height: 800 },
  { name: "desktop", width: 1440, height: 900 },
  { name: "fullhd", width: 1920, height: 1080 },
];
const PAGES = ["/", "/studio", "/tab", "/proof", "/judge", "/status", "/sell", "/rescue"];

mkdirSync("tests/e2e/__screens__", { recursive: true });

async function smallTargets(page: Page) {
  return page.evaluate(() => {
    const bad: string[] = [];
    document.querySelectorAll<HTMLElement>("button, a[href], input, select, summary, [role=radio]").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      if (el.closest("p")) return; // inline links inside running text are exempt (WCAG 2.2 target size)
      if (el.classList.contains("sr-only") || el.closest("label")?.querySelector("input.sr-only")) return;
      if (r.height < 43.5 && r.width < 43.5) bad.push(`${el.tagName} ${(el.textContent ?? "").trim().slice(0, 24)} ${Math.round(r.width)}x${Math.round(r.height)}`);
      else if (r.height < 43.5) bad.push(`${el.tagName} ${(el.textContent ?? "").trim().slice(0, 24)} h${Math.round(r.height)}`);
    });
    return bad;
  });
}

for (const vp of VIEWPORTS) {
  for (const path of PAGES) {
    test(`${path} at ${vp.name}`, async ({ browser }) => {
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, reducedMotion: "reduce" });
      const page = await ctx.newPage();
      const errors: string[] = [];
      page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
      page.on("pageerror", (e) => errors.push(String(e)));
      await page.goto(path, { waitUntil: "networkidle" });

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, "horizontal scroll").toBeLessThanOrEqual(0);

      const tops = await page.$$eval("header nav a:visible, header nav button:visible", (els) => els.map((e) => Math.round(e.getBoundingClientRect().top + e.getBoundingClientRect().height / 2)));
      if (tops.length > 1) expect(Math.max(...tops) - Math.min(...tops), "navbar baseline").toBeLessThanOrEqual(8);

      if (path === "/") {
        const boxes = await page.evaluate(() => {
          const h = document.querySelector("h1")!.getBoundingClientRect();
          const s = document.querySelector("svg[role=img]")!.getBoundingClientRect();
          return { overlap: !(h.right <= s.left || s.right <= h.left || h.bottom <= s.top || s.bottom <= h.top), gap: s.top - h.bottom };
        });
        expect(boxes.overlap, "hero text overlaps scene").toBe(false);
        if (vp.width < 1024) expect(boxes.gap, "32 px above scene on small screens").toBeGreaterThanOrEqual(32);
      }

      // No two sibling boxes in a status row or a tile may overlap (the earlier layout let a long name run under its badge).
      const overlaps = await page.evaluate(() => {
        const bad: string[] = [];
        document.querySelectorAll("main li").forEach((li) => {
          const kids = Array.from(li.children).filter((k) => (k as HTMLElement).offsetWidth > 0) as HTMLElement[];
          for (let i = 0; i < kids.length; i++) for (let j = i + 1; j < kids.length; j++) {
            const a = kids[i].getBoundingClientRect(), b = kids[j].getBoundingClientRect();
            const w = Math.min(a.right, b.right) - Math.max(a.left, b.left), h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
            if (w > 2 && h > 2) bad.push(`${(kids[i].textContent ?? "").trim().slice(0, 20)} / ${(kids[j].textContent ?? "").trim().slice(0, 20)}`);
          }
        });
        return bad;
      });
      expect(overlaps, "overlapping boxes").toEqual([]);

      if (path === "/judge") {
        await expect(page.getByTestId("recorded-run")).toBeVisible();
        await expect(page.getByTestId("now-caption")).not.toHaveText("");
      }
      if (path === "/proof") {
        const tiles = await page.getByTestId("proof-tile").allTextContents();
        expect(tiles.slice(0, 4), "overcharges shown as a number").toContain("0");
      }

      expect(await smallTargets(page), "tap targets under 44 px").toEqual([]);

      const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
      expect(axe.violations.map((v) => `${v.id}: ${v.nodes.slice(0, 2).map((n) => n.target.join(" ")).join(" | ")}`), "axe").toEqual([]);

      await page.screenshot({ path: `tests/e2e/__screens__/${path === "/" ? "landing" : path.slice(1)}-${vp.name}.png`, fullPage: false });
      expect(errors, "console errors").toEqual([]);
      await ctx.close();
    });
  }
}
