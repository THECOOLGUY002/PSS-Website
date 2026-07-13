import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");

const heroLineBlock = (html) => {
  const narrativeIndex = html.indexOf("data-hero-narrative");
  if (narrativeIndex === -1) return "";

  const start = html.lastIndexOf("<div", narrativeIndex);
  const end = html.indexOf("</div>", narrativeIndex);

  return html.slice(start, end + "</div>".length);
};

test("hero includes four narrative states in sequence", async () => {
  const html = await read("index.html");
  const block = heroLineBlock(html);
  const stateIds = [
    ...block.matchAll(/data-hero-narrative-state="([^"]+)"/g),
  ].map((match) => match[1]);
  const labels = [...block.matchAll(/<span[^>]*>([^<]+)<\/span>/g)].map(
    (match) => match[1].trim(),
  );

  assert.match(block, /data-hero-narrative/, "hero narrative wrapper exists");
  assert.deepEqual(stateIds, ["assess", "prepare", "style", "launch"]);
  assert.deepEqual(labels, ["Assess", "Prepare", "Style", "Launch"]);
  assert.match(
    block,
    /data-hero-narrative-state="assess"[\s\S]*?aria-current="step"/,
    "Assess is the initial active narrative state",
  );
});

test("hero narrative state is synchronized from the existing frame progress", async () => {
  const script = await read("app.js");

  assert.match(
    script,
    /const heroNarrativeStates = \[/,
    "hero narrative thresholds are defined in JS",
  );
  assert.match(
    script,
    /const setHeroNarrativeProgress = \(progress\) =>/,
    "hero narrative progress synchronizer exists",
  );
  assert.match(
    script,
    /setHeroNarrativeProgress\(maxHeroProgress\)/,
    "hero frame progress drives narrative progress",
  );
  assert.equal(
    (script.match(/id: "hero-frame"/g) || []).length,
    1,
    "hero narrative does not add another hero ScrollTrigger",
  );
});

test("hero narrative states have active styling and reduced-motion support", async () => {
  const css = await read("styles.css");

  assert.match(css, /\.hero-line span\.is-active/, "active state style exists");
  assert.match(css, /\.hero-line span\.is-past/, "past state style exists");
  assert.match(
    css,
    /@media \(prefers-reduced-motion: reduce\)/,
    "reduced-motion styles exist",
  );
});
