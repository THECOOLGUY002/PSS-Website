import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");

const cubicPoint = (start, controlA, controlB, end, progress) => {
  const inverse = 1 - progress;
  const a = inverse ** 3;
  const b = 3 * inverse ** 2 * progress;
  const c = 3 * inverse * progress ** 2;
  const d = progress ** 3;

  return {
    x: a * start.x + b * controlA.x + c * controlB.x + d * end.x,
    y: a * start.y + b * controlA.y + c * controlB.y + d * end.y,
  };
};

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

const parseRoutePoints = (route) => {
  const values = route.match(/-?\d+(?:\.\d+)?/g).map(Number);
  const start = { x: values[0], y: values[1] };
  const segments = [];

  for (let index = 2; index < values.length; index += 6) {
    const previous = segments.at(-1)?.end || start;

    segments.push({
      start: previous,
      controlA: { x: values[index], y: values[index + 1] },
      controlB: { x: values[index + 2], y: values[index + 3] },
      end: { x: values[index + 4], y: values[index + 5] },
    });
  }

  return segments;
};

const closestRouteDistance = (segments, point) => {
  let closest = Infinity;

  for (const segment of segments) {
    for (let step = 0; step <= 120; step += 1) {
      closest = Math.min(
        closest,
        distance(
          cubicPoint(
            segment.start,
            segment.controlA,
            segment.controlB,
            segment.end,
            step / 120,
          ),
          point,
        ),
      );
    }
  }

  return closest;
};

const routeSamples = (segments) => {
  const samples = [{ length: 0, point: segments[0].start }];
  let length = 0;
  let previous = segments[0].start;

  for (const segment of segments) {
    for (let step = 1; step <= 180; step += 1) {
      const point = cubicPoint(
        segment.start,
        segment.controlA,
        segment.controlB,
        segment.end,
        step / 180,
      );

      length += distance(previous, point);
      samples.push({ length, point });
      previous = point;
    }
  }

  return samples.map((sample) => ({
    ...sample,
    progress: sample.length / length,
  }));
};

const pointAtProgress = (samples, progress) =>
  samples.reduce((closest, sample) =>
    Math.abs(sample.progress - progress) < Math.abs(closest.progress - progress)
      ? sample
      : closest,
  ).point;

const stationBlock = (html, station) =>
  [...html.matchAll(/<button[\s\S]*?<\/button>/g)]
    .map((match) => match[0])
    .find((block) => block.includes(`data-faq-station="${station}"`)) || "";

const panelOpeningTag = (html, panel) =>
  html.match(
    new RegExp(`<article[\\s\\S]*?data-faq-panel="${panel}"[\\s\\S]*?>`),
  )?.[0] || "";

test("FAQ section is placed before contact with expected controls and no CTA strip", async () => {
  const html = await read("index.html");

  assert.match(html, /href="#faq"/, "primary nav links to FAQ");
  assert.match(html, /<section[^>]+id="faq"[^>]*>/, "FAQ section exists");
  assert.ok(
    html.indexOf('id="faq"') < html.indexOf('id="contact"'),
    "FAQ section appears before contact",
  );
  assert.equal(
    (html.match(/data-faq-station=/g) || []).length,
    5,
    "five FAQ path station controls exist",
  );
  assert.equal(
    (html.match(/data-faq-panel=/g) || []).length,
    5,
    "five FAQ answer panels exist",
  );
  assert.doesNotMatch(html, /class="faq-cta"/, "FAQ CTA strip is removed");
  assert.doesNotMatch(
    html,
    /aria-label="FAQ contact actions"/,
    "FAQ contact actions wrapper is removed",
  );
});

test("FAQ section has interaction and styling hooks", async () => {
  const [script, css] = await Promise.all([read("app.js"), read("styles.css")]);

  assert.match(script, /data-faq-station/, "FAQ station JS hook exists");
  assert.match(script, /data-faq-panel/, "FAQ panel JS hook exists");
  assert.match(css, /\.faq\b/, "FAQ section styles exist");
  assert.match(css, /\.faq-path\b/, "FAQ path styles exist");
  assert.match(css, /\.faq-answer\b/, "FAQ answer panel styles exist");
});

test("FAQ defaults to the first Assess step", async () => {
  const html = await read("index.html");
  const assessStation = stationBlock(html, "assess");
  const prepareStation = stationBlock(html, "prepare");
  const assessPanel = panelOpeningTag(html, "assess");
  const preparePanel = panelOpeningTag(html, "prepare");

  assert.match(
    assessStation,
    /class="faq-station is-active"/,
    "Assess station is active on page load",
  );
  assert.match(
    assessStation,
    /aria-selected="true"/,
    "Assess station is selected on page load",
  );
  assert.match(
    assessStation,
    /<small aria-hidden="true">-<\/small>/,
    "Assess station shows the open indicator",
  );
  assert.doesNotMatch(
    prepareStation,
    /is-active/,
    "Prepare station is not active on page load",
  );
  assert.match(
    prepareStation,
    /aria-selected="false"/,
    "Prepare station is not selected on page load",
  );
  assert.match(
    assessPanel,
    /class="faq-answer is-active"/,
    "Assess answer is visible on page load",
  );
  assert.doesNotMatch(assessPanel, /\shidden\b/, "Assess answer is not hidden");
  assert.match(preparePanel, /\shidden\b/, "Prepare answer is hidden");
});

test("FAQ route has a click-driven progress path without a marker", async () => {
  const [html, script, css] = await Promise.all([
    read("index.html"),
    read("app.js"),
    read("styles.css"),
  ]);

  assert.match(
    html,
    /class="faq-route-progress"[\s\S]*data-faq-route-progress/,
    "FAQ SVG includes a separate animated progress route",
  );
  assert.doesNotMatch(
    html,
    /data-faq-route-marker|class="faq-route-marker"/,
    "FAQ SVG does not include a progress marker",
  );
  assert.match(
    script,
    /const initFaqPathProgress = \(\) =>/,
    "FAQ path progress is initialized in JS",
  );
  assert.match(
    script,
    /getTotalLength\(\)/,
    "FAQ progress uses the SVG path length",
  );
  assert.doesNotMatch(
    script,
    /faqRouteMarker|getPointAtLength/,
    "FAQ progress no longer drives a route marker",
  );
  assert.doesNotMatch(
    script,
    /id: "faq-route-progress"/,
    "FAQ path progress is not driven by ScrollTrigger",
  );
  assert.equal(
    (html.match(/data-faq-path-progress=/g) || []).length,
    5,
    "each FAQ station has a matching path progress value",
  );
  assert.match(
    script,
    /const setFaqRouteProgressForStation = \(activeId,\s*options = \{\}\) =>/,
    "FAQ station changes can drive path progress",
  );
  assert.match(
    script,
    /setFaqRouteProgressForStation\(activeId,\s*\{\s*animate: true\s*\}\)/,
    "FAQ station clicks animate the route progress path",
  );
  assert.match(
    script,
    /setFaqRouteProgressForStation\(initialStation\?\.dataset\.faqStation,\s*\{\s*animate: false,?\s*\}\)/,
    "FAQ path initializes from the active station without visible progress motion",
  );
  assert.match(
    css,
    /\.faq-route-progress\b[\s\S]*?stroke:\s*var\(--orange\)/,
    "progress route uses the brand accent",
  );
  assert.doesNotMatch(
    css,
    /\.faq-route path\s*{[\s\S]*?vector-effect:\s*non-scaling-stroke/,
    "FAQ route dash math should stay in the same coordinate system as the path",
  );
  assert.doesNotMatch(
    css,
    /\.faq-route-marker\b/,
    "progress marker styles are removed",
  );
});

test("FAQ route progress reaches intermediate station circles without passing them", async () => {
  const html = await read("index.html");
  const route = html.match(
    /class="faq-route"[\s\S]*?<path\s+d="([^"]+)"/,
  )[1];
  const samples = routeSamples(parseRoutePoints(route));
  const stationMatches = [
    ...html.matchAll(
      /style="--x: ([\d.]+)%; --y: ([\d.]+)%"[\s\S]*?data-faq-station="([^"]+)"[\s\S]*?data-faq-path-progress="([\d.]+)"/g,
    ),
  ];
  const stations = Object.fromEntries(
    stationMatches.map((match) => [
      match[3],
      {
        center: {
          x: Number(match[1]) * 10,
          y: Number(match[2]) * 3.2,
        },
        progress: Number(match[4]),
      },
    ]),
  );

  const misses = ["prioritise", "prepare", "photograph"]
    .map((stationName) => {
      const { center, progress } = stations[stationName];
      const progressPoint = pointAtProgress(samples, progress);
      const offset = distance(progressPoint, center);

      return {
        station: stationName,
        reachesCircle: offset <= 1,
        notPastCenter: progressPoint.x <= center.x + 1,
      };
    })
    .filter(({ reachesCircle, notPastCenter }) => !reachesCircle || !notPastCenter);

  assert.deepEqual(
    misses,
    [],
    "steps 2-4 should reach their number circles without overshooting them",
  );
});

test("FAQ route passes through station number centers", async () => {
  const html = await read("index.html");
  const css = await read("styles.css");
  const route = html.match(
    /class="faq-route"[\s\S]*?<path\s+d="([^"]+)"/,
  )[1];
  const segments = parseRoutePoints(route);
  const stationMatches = [
    ...html.matchAll(
      /class="faq-station[\s\S]*?style="--x: ([\d.]+)%; --y: ([\d.]+)%"/g,
    ),
  ];

  assert.equal(stationMatches.length, 5, "five station coordinates exist");
  assert.match(
    html,
    /class="faq-route"[\s\S]*preserveAspectRatio="none"/,
    "route SVG scales to the same coordinate space as stations",
  );
  assert.match(
    css,
    /\.faq-station\s*{[\s\S]*?transform:\s*translate\(-50%,\s*-24px\);/,
    "station y coordinate is the circle center",
  );

  const misses = stationMatches
    .map((match, index) => {
      const point = {
        x: Number(match[1]) * 10,
        y: Number(match[2]) * 3.2,
      };

      return {
        station: String(index + 1).padStart(2, "0"),
        miss: closestRouteDistance(segments, point),
      };
    })
    .filter(({ miss }) => miss > 6);

  assert.deepEqual(misses, [], "route should cross each station number");
});
