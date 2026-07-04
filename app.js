const header = document.querySelector("[data-header]");
const entryLoader = document.querySelector("[data-entry-loader]");
const entryWordmark = document.querySelector("[data-entry-wordmark]");
const reveals = document.querySelectorAll(".reveal");
const heroSection = document.querySelector("[data-hero-scroll]");
const heroFrame = document.querySelector("[data-hero-frame]");
const processSection = document.querySelector("[data-process-scroll]");
const processTrack = document.querySelector("[data-process-track]");

const frameCount = 91;
const frameBase = "assets/video/hero-frames/frame-";
const frameExtension = ".jpg";
const clamp = (value, min = 0, max = 1) => Math.min(Math.max(value, min), max);
const frameSrc = (index) =>
  `${frameBase}${String(index).padStart(3, "0")}${frameExtension}`;

const buildEntryLoader = () => {
  if (!entryLoader || !entryWordmark) return;

  entryWordmark.querySelectorAll(".entry-loader-path").forEach((path) => {
    const length = path.getTotalLength();
    const dash = length + 2;
    const offset = Math.random() * dash;

    path.style.setProperty("--dash", dash.toFixed(2));
    path.style.setProperty("--offset", offset.toFixed(2));
    path.style.animationDelay = `${(Math.random() * 0.18).toFixed(3)}s`;
  });

  entryWordmark.getBoundingClientRect();
  entryLoader.classList.add("is-ready");

  window.setTimeout(() => {
    entryLoader.classList.add("is-done");
    document.body.classList.remove("is-loading");
    document.body.classList.add("is-entered");
    requestUpdate();
  }, 3000);

  window.setTimeout(() => {
    entryLoader.remove();
  }, 4000);
};

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
      }
    });
  },
  { threshold: 0.16 },
);

reveals.forEach((item) => revealObserver.observe(item));

let ticking = false;
let currentFrame = 1;
let maxHeroProgress = 0;
let heroScrollReleased = false;

const releaseHeroScroll = () => {
  if (heroScrollReleased) return;

  heroScrollReleased = true;
  document.body.classList.add("is-hero-released");
};

const updateHeroFrame = () => {
  if (!heroSection || !heroFrame) return;
  if (document.body.classList.contains("is-loading")) return;

  const rect = heroSection.getBoundingClientRect();
  const travel = Math.max(rect.height - window.innerHeight, 1);
  const progress = clamp(-rect.top / travel);
  maxHeroProgress = Math.max(maxHeroProgress, progress);
  const nextFrame = Math.round(1 + maxHeroProgress * (frameCount - 1));

  if (nextFrame !== currentFrame) {
    currentFrame = nextFrame;
    heroFrame.src = frameSrc(currentFrame);
  }

  if (maxHeroProgress >= 0.995) {
    releaseHeroScroll();
  }
};

const updateProcessScroll = () => {
  if (!processSection || !processTrack) return;

  const rect = processSection.getBoundingClientRect();
  const travel = Math.max(rect.height - window.innerHeight, 1);
  const progress = clamp(-rect.top / travel);
  const maxOffset = Math.max(
    processTrack.scrollWidth - document.documentElement.clientWidth,
    0,
  );

  processTrack.style.transform = `translate3d(${-progress * maxOffset}px, 0, 0)`;
};

const updateChrome = () => {
  const scrollY = window.scrollY || 0;
  header.classList.toggle("is-scrolled", scrollY > 80);
  updateHeroFrame();
  updateProcessScroll();
};

const requestUpdate = () => {
  if (ticking) return;

  ticking = true;
  window.requestAnimationFrame(() => {
    updateChrome();
    ticking = false;
  });
};

const preloadFrames = () => {
  const indexes = Array.from({ length: frameCount }, (_, index) => index + 1);

  indexes.forEach((index) => {
    const image = new Image();
    image.src = frameSrc(index);
  });
};

window.addEventListener("scroll", requestUpdate, { passive: true });
window.addEventListener("resize", requestUpdate);
window.addEventListener("load", preloadFrames, { once: true });
buildEntryLoader();
updateChrome();

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", (event) => {
    const target = document.querySelector(link.getAttribute("href"));

    if (!target) return;

    event.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});
