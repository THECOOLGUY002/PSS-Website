import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");

test("GSAP and ScrollTrigger are loaded locally before the site script", async () => {
  const html = await read("index.html");
  const gsapIndex = html.indexOf("gsap.min.js");
  const scrollTriggerIndex = html.indexOf("ScrollTrigger.min.js");
  const appIndex = html.indexOf('src="app.js"');

  assert.match(html, /src="assets\/vendor\/gsap\.min\.js"/);
  assert.match(html, /src="assets\/vendor\/ScrollTrigger\.min\.js"/);
  assert.ok(gsapIndex > -1, "GSAP script is loaded");
  assert.ok(scrollTriggerIndex > -1, "ScrollTrigger script is loaded");
  assert.ok(
    gsapIndex < scrollTriggerIndex && scrollTriggerIndex < appIndex,
    "GSAP scripts load before app.js",
  );
});

test("scroll-driven hero and process motion use ScrollTrigger", async () => {
  const script = await read("app.js");

  assert.match(
    script,
    /gsap\.registerPlugin\(ScrollTrigger\)/,
    "ScrollTrigger is registered",
  );
  assert.match(
    script,
    /scrollTrigger:\s*{/,
    "GSAP tweens use ScrollTrigger configs",
  );
  assert.doesNotMatch(
    script,
    /const updateHeroFrame\b/,
    "hero frame updates are not handled by manual scroll math",
  );
  assert.doesNotMatch(
    script,
    /const updateProcessScroll\b/,
    "process movement is not handled by manual scroll math",
  );
  assert.doesNotMatch(
    script,
    /window\.addEventListener\("scroll",\s*requestUpdate/,
    "scroll event listener no longer drives page motion",
  );
  assert.doesNotMatch(
    script,
    /(?:heroSection|processSection)\.getBoundingClientRect\(\)/,
    "hero/process scroll progress no longer reads layout on every scroll",
  );
});

test("reveals and title words are animated by GSAP batches", async () => {
  const [script, css] = await Promise.all([read("app.js"), read("styles.css")]);

  assert.match(
    script,
    /ScrollTrigger\.batch\(reveals/,
    "standard reveal elements use ScrollTrigger.batch",
  );
  assert.match(
    script,
    /ScrollTrigger\.batch\(titleRevealTargets/,
    "title reveal elements use ScrollTrigger.batch",
  );
  assert.match(script, /gsap\.to\(heroTitleWords/, "hero title uses GSAP");
  assert.match(
    script,
    /gsap\.to\(heroTitleWords,\s*{\s*yPercent: 0,\s*y: 0,/,
    "hero title clears both percent and pixel translate values",
  );
  assert.match(
    script,
    /gsap\.set\(titleRevealWords,\s*{\s*yPercent: 112,\s*y: 0\s*}\)/,
    "title reveal words start from a clean GSAP transform",
  );
  assert.doesNotMatch(
    script,
    /new IntersectionObserver/,
    "reveal triggers no longer use IntersectionObserver",
  );
  assert.doesNotMatch(
    css,
    /\.reveal\.is-visible/,
    "reveal visibility is no longer class-transition driven",
  );
  assert.doesNotMatch(
    css,
    /\.title-reveal\.is-visible/,
    "title words are no longer class-keyframe driven",
  );
  assert.doesNotMatch(
    css,
    /@keyframes title-rise/,
    "title-rise keyframe is no longer used",
  );
});
