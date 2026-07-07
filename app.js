const header = document.querySelector("[data-header]");
const root = document.documentElement;
const entryLoader = document.querySelector("[data-entry-loader]");
const entryWordmark = document.querySelector("[data-entry-wordmark]");
const reveals = document.querySelectorAll(".reveal");
const heroTitleWords = document.querySelectorAll(".hero-title-word");
const heroSection = document.querySelector("[data-hero-scroll]");
const heroFrame = document.querySelector("[data-hero-frame]");
const processSection = document.querySelector("[data-process-scroll]");
const processTrack = document.querySelector("[data-process-track]");
const introStats = document.querySelector("[data-intro-stats]");
const introStatNumbers = document.querySelectorAll("[data-count-to]");
const faqStations = document.querySelectorAll("[data-faq-station]");
const faqPanels = document.querySelectorAll("[data-faq-panel]");
const faqRouteBase = document.querySelector("[data-faq-route-base]");
const faqRouteProgress = document.querySelector("[data-faq-route-progress]");
const titleRevealTargets = document.querySelectorAll(
  [
    ".intro-copy > p",
    ".proof-decision-copy h2",
    ".process-panel h2",
    ".section-heading h2",
    ".service-copy h3",
    ".project-story-copy h2",
    ".faq-copy h2",
    ".contact-panel h2",
  ].join(", "),
);

const frameCount = 91;
const frameBase = "assets/video/hero-frames/frame-";
const frameExtension = ".jpg";
const clamp = (value, min = 0, max = 1) => Math.min(Math.max(value, min), max);
const frameSrc = (index) =>
  `${frameBase}${String(index).padStart(3, "0")}${frameExtension}`;
const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const introStatsDelay = 300;
const faqPathState = { progress: 0 };
let heroTitleAnimated = false;
let setFaqRouteProgress = () => {};

gsap.registerPlugin(ScrollTrigger);

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
    root.classList.remove("is-loading");
    document.body.classList.remove("is-loading");
    document.body.classList.add("is-entered");
    animateHeroTitle();
    ScrollTrigger.refresh();
  }, 3000);

  window.setTimeout(() => {
    entryLoader.remove();
  }, 4000);
};

const setStatNumber = (number, value, isFinal = false) => {
  number.textContent = String(isFinal ? Math.round(value) : Math.floor(value));
};

const easeOut = (progress) => 1 - Math.pow(1 - progress, 5);

const wrapTitleWords = (node, counter) => {
  Array.from(node.childNodes).forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      const fragment = document.createDocumentFragment();
      const tokens = child.textContent.split(/(\s+)/);

      tokens.forEach((token) => {
        if (!token) return;

        if (/^\s+$/.test(token)) {
          fragment.append(document.createTextNode(token));
          return;
        }

        const clip = document.createElement("span");
        const word = document.createElement("span");

        clip.className = "title-reveal-clip";
        word.className = "title-reveal-word";
        word.textContent = token;
        word.style.setProperty("--word-index", counter.value);
        counter.value += 1;

        clip.append(word);
        fragment.append(clip);
      });

      child.replaceWith(fragment);
      return;
    }

    if (child.nodeType === Node.ELEMENT_NODE) {
      wrapTitleWords(child, counter);
    }
  });
};

const prepareTitleReveals = () => {
  titleRevealTargets.forEach((title) => {
    if (title.dataset.titleReveal === "ready") return;

    title.dataset.titleReveal = "ready";
    title.classList.add("title-reveal");
    wrapTitleWords(title, { value: 0 });
  });
};

const animateHeroTitle = () => {
  if (heroTitleAnimated || !heroTitleWords.length) return;

  heroTitleAnimated = true;

  if (motionQuery.matches) {
    gsap.set(heroTitleWords, { yPercent: 0, y: 0 });
    return;
  }

  gsap.set(heroTitleWords, { yPercent: 112, y: 0 });
  gsap.to(heroTitleWords, {
    yPercent: 0,
    y: 0,
    duration: 1.05,
    ease: "power3.out",
    stagger: 0.045,
    overwrite: true,
  });
};

const animateTitleBatch = (batch) => {
  batch.forEach((title) => {
    gsap.to(title.querySelectorAll(".title-reveal-word"), {
      yPercent: 0,
      y: 0,
      duration: 1.05,
      ease: "power3.out",
      stagger: 0.042,
      overwrite: true,
    });
  });
};

const initRevealAnimations = () => {
  const titleRevealWords = document.querySelectorAll(".title-reveal-word");

  if (motionQuery.matches) {
    gsap.set(reveals, { autoAlpha: 1, y: 0 });
    gsap.set(heroTitleWords, { yPercent: 0, y: 0 });
    gsap.set(titleRevealWords, { yPercent: 0, y: 0 });
    startIntroStats();
    return;
  }

  gsap.set(reveals, { autoAlpha: 0, y: 36 });
  gsap.set(titleRevealWords, { yPercent: 112, y: 0 });

  ScrollTrigger.batch(reveals, {
    start: "top 84%",
    once: true,
    interval: 0.08,
    batchMax: 6,
    onEnter: (batch) => {
      gsap.to(batch, {
        autoAlpha: 1,
        y: 0,
        duration: 0.8,
        ease: "power2.out",
        stagger: 0.08,
        overwrite: true,
      });

      batch.forEach((item) => {
        if (introStats && item.contains(introStats)) {
          startIntroStats();
        }
      });
    },
  });

  ScrollTrigger.batch(titleRevealTargets, {
    start: "top 82%",
    once: true,
    interval: 0.08,
    batchMax: 4,
    onEnter: animateTitleBatch,
  });
};

const animateStatNumber = (number) => {
  if (number.dataset.counted === "true") return;

  const target = Number(number.dataset.countTo);
  if (!Number.isFinite(target)) return;

  number.dataset.counted = "true";

  if (motionQuery.matches) {
    setStatNumber(number, target, true);
    return;
  }

  const duration = 1850;
  const start = performance.now();

  const tick = (now) => {
    const progress = clamp((now - start) / duration);
    const eased = easeOut(progress);

    setStatNumber(number, target * eased);

    if (progress < 1) {
      window.requestAnimationFrame(tick);
      return;
    }

    setStatNumber(number, target, true);
  };

  window.requestAnimationFrame(tick);
};

const startIntroStats = () => {
  if (!introStats || introStats.dataset.started === "true") return;

  introStats.dataset.started = "true";
  window.setTimeout(() => {
    introStatNumbers.forEach(animateStatNumber);
  }, introStatsDelay);
};

const initFaqPathProgress = () => {
  if (!faqRouteBase || !faqRouteProgress) {
    return;
  }

  const routeLength = faqRouteBase.getTotalLength();
  if (!routeLength) return;

  gsap.set(faqRouteProgress, {
    strokeDasharray: routeLength,
    strokeDashoffset: routeLength,
  });

  const renderProgress = (progress) => {
    const safeProgress = clamp(progress);

    gsap.set(faqRouteProgress, {
      strokeDashoffset: routeLength * (1 - safeProgress),
    });
  };

  setFaqRouteProgress = (progress, options = {}) => {
    const safeProgress = clamp(progress);

    if (options.animate && !motionQuery.matches) {
      gsap.to(faqPathState, {
        progress: safeProgress,
        duration: 0.65,
        ease: "power2.out",
        overwrite: true,
        onUpdate: () => renderProgress(faqPathState.progress),
      });
      return;
    }

    faqPathState.progress = safeProgress;
    renderProgress(faqPathState.progress);
  };

  const initialStation = document.querySelector("[data-faq-station].is-active");
  setFaqRouteProgressForStation(initialStation?.dataset.faqStation, {
    animate: false,
  });
};

const setFaqRouteProgressForStation = (activeId, options = {}) => {
  const activeStation = document.querySelector(
    `[data-faq-station="${activeId}"]`,
  );
  const progress = Number(activeStation?.dataset.faqPathProgress);

  if (!Number.isFinite(progress)) return;

  setFaqRouteProgress(progress, options);
};

const setFaqPanel = (activeId) => {
  faqStations.forEach((station) => {
    const isActive = station.dataset.faqStation === activeId;
    const indicator = station.querySelector("small");

    station.classList.toggle("is-active", isActive);
    station.setAttribute("aria-selected", String(isActive));
    if (indicator) indicator.textContent = isActive ? "-" : "+";
  });

  faqPanels.forEach((panel) => {
    const isActive = panel.dataset.faqPanel === activeId;

    panel.classList.toggle("is-active", isActive);
    panel.hidden = !isActive;
  });

  setFaqRouteProgressForStation(activeId, { animate: true });
};

prepareTitleReveals();
initRevealAnimations();

let currentFrame = 1;
let maxHeroProgress = 0;
let heroScrollReleased = false;

const releaseHeroScroll = () => {
  if (heroScrollReleased) return;

  heroScrollReleased = true;
  document.body.classList.add("is-hero-released");
};

const setHeroFrameProgress = (progress) => {
  if (!heroSection || !heroFrame) return;
  if (document.body.classList.contains("is-loading")) return;

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

const initHeroScroll = () => {
  if (!heroSection || !heroFrame) return;

  const heroState = { progress: 0 };

  gsap.to(heroState, {
    progress: 1,
    ease: "none",
    scrollTrigger: {
      id: "hero-frame",
      trigger: heroSection,
      start: "top top",
      end: "bottom bottom",
      scrub: true,
      refreshPriority: 0,
      onUpdate: (self) => setHeroFrameProgress(self.progress),
      onLeave: () => {
        setHeroFrameProgress(1);
        releaseHeroScroll();
      },
    },
  });
};

const initProcessScroll = () => {
  if (!processSection || !processTrack) return;

  gsap.to(processTrack, {
    x: () =>
      -Math.max(
        processTrack.scrollWidth - document.documentElement.clientWidth,
        0,
      ),
    ease: "none",
    scrollTrigger: {
      trigger: processSection,
      start: "top top",
      end: "bottom bottom",
      scrub: true,
      invalidateOnRefresh: true,
      refreshPriority: 1,
    },
  });
};

const initHeaderScroll = () => {
  ScrollTrigger.create({
    start: 80,
    end: "max",
    onEnter: () => header.classList.add("is-scrolled"),
    onLeaveBack: () => header.classList.remove("is-scrolled"),
  });

  header.classList.toggle("is-scrolled", (window.scrollY || 0) > 80);
};

const preloadFrames = () => {
  const indexes = Array.from({ length: frameCount }, (_, index) => index + 1);

  indexes.forEach((index) => {
    const image = new Image();
    image.src = frameSrc(index);
  });
};

initHeaderScroll();
initHeroScroll();
initProcessScroll();
initFaqPathProgress();

window.addEventListener(
  "load",
  () => {
    preloadFrames();
    ScrollTrigger.refresh();
  },
  { once: true },
);
buildEntryLoader();

faqStations.forEach((station) => {
  station.addEventListener("click", () => {
    setFaqPanel(station.dataset.faqStation);
  });
});

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", (event) => {
    const target = document.querySelector(link.getAttribute("href"));

    if (!target) return;

    event.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});
