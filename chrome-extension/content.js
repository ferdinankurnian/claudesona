(() => {
  const ext = typeof browser !== "undefined" ? browser : chrome;
  "use strict";

  const SITE_CONFIGS = [
    {
      host: "claude.ai",
      prefix: "claude",
      label: "Claude",
      emotions: [
        "amused",
        "concerned",
        "curious",
        "frustrated",
        "happy",
        "playful",
        "sad",
        "sheepish",
        "skeptical",
        "thoughtful",
        "touched",
        "uncertain",
        "warm",
      ],
    },
    {
      host: "chatgpt.com",
      prefix: "gpt",
      label: "GPT",
      emotions: [
        "caution",
        "coherence_seeking",
        "confidence",
        "confusion",
        "curiosity",
        "focus",
        "frustration",
        "helpfulness",
        "novelty_detection",
        "satisfaction",
        "surprise",
        "uncertainty",
        "urgency",
      ],
    },
    {
      host: "gemini.google.com",
      prefix: "gemini",
      label: "Gemini",
      emotions: [
        "caution",
        "certainty",
        "convergence",
        "dissonance",
        "equilibrium",
        "generative_flow",
        "inquisitiveness",
        "perplexity",
        "resolution",
        "resonance",
        "saturation",
        "uncertainty",
        "vigilance",
      ],
    },
  ];

  const ACTIVE_SITE = SITE_CONFIGS.find((site) => window.location.hostname === site.host);
  if (!ACTIVE_SITE) return;

  const STORAGE_KEY = "sonaPreferences";
  const DEFAULT_STYLE = "style-1";
  const EMOTIONS = new Set(
    ACTIVE_SITE.emotions.map((emotion) => `${ACTIVE_SITE.prefix}_${emotion}`),
  );
  const TAG_RE = new RegExp(
    `<\\s*(${ACTIVE_SITE.prefix}_(?:${ACTIVE_SITE.emotions.join("|")}))\\s*(?:\\/\\s*)?>`,
    "g",
  );
  const TEXT_HINT = `${ACTIVE_SITE.prefix}_`;

  const SKIP_SELECTOR = [
    "script",
    "style",
    "textarea",
    "input",
    "select",
    "option",
    "button",
    "code",
    "pre",
    "[contenteditable='true']",
    ".sona-emotion-sprite-wrap",
    ".claude-emotion-sprite-wrap",
  ].join(",");

  let observer = null;
  let pendingScanFrame = null;
  let pendingScanTimer = null;
  let settings = { enabled: true, style: DEFAULT_STYLE };

  function shouldSkipNode(node) {
    const parent = node.parentElement;
    return !parent || parent.closest(SKIP_SELECTOR);
  }

  function emotionImage(name) {
    const wrap = document.createElement("span");
    wrap.className = "sona-emotion-sprite-wrap";
    wrap.dataset.sonaEmotion = name;

    const img = document.createElement("img");
    img.className = "sona-emotion-sprite";
    img.alt = `${ACTIVE_SITE.label} ${name
      .replace(`${ACTIVE_SITE.prefix}_`, "")
      .replaceAll("_", " ")}`;
    img.title = name;
    img.width = 128;
    img.height = 128;
    img.decoding = "async";
    img.loading = "lazy";
    img.src = spriteUrl(name);

    wrap.appendChild(img);
    return wrap;
  }

  function spriteUrl(name) {
    return ext.runtime.getURL(`assets/${ACTIVE_SITE.prefix}/${settings.style}/${name}.png`);
  }

  function restoreSprites() {
    document.querySelectorAll(".sona-emotion-sprite-wrap[data-sona-emotion]").forEach((wrap) => {
      wrap.replaceWith(document.createTextNode(`<${wrap.dataset.sonaEmotion} />`));
    });
  }

  function refreshRenderedSprites() {
    document.querySelectorAll(".sona-emotion-sprite-wrap[data-sona-emotion]").forEach((wrap) => {
      const image = wrap.querySelector(".sona-emotion-sprite");
      if (image) image.src = spriteUrl(wrap.dataset.sonaEmotion);
    });
  }

  async function loadSettings() {
    const stored = await ext.storage.local.get(STORAGE_KEY);
    const activeSettings = stored[STORAGE_KEY]?.[ACTIVE_SITE.prefix];
    settings = {
      enabled: activeSettings?.enabled !== false,
      style: activeSettings?.style || DEFAULT_STYLE,
    };
  }

  function replaceTextNode(node) {
    if (shouldSkipNode(node)) return;

    const text = node.nodeValue;
    if (!text || !text.includes(TEXT_HINT)) return;

    TAG_RE.lastIndex = 0;
    let match = TAG_RE.exec(text);
    if (!match) return;

    const frag = document.createDocumentFragment();
    let cursor = 0;

    while (match) {
      const [raw, name] = match;
      if (match.index > cursor) {
        frag.appendChild(document.createTextNode(text.slice(cursor, match.index)));
      }

      frag.appendChild(EMOTIONS.has(name) ? emotionImage(name) : document.createTextNode(raw));
      cursor = match.index + raw.length;
      match = TAG_RE.exec(text);
    }

    if (cursor < text.length) {
      frag.appendChild(document.createTextNode(text.slice(cursor)));
    }

    node.replaceWith(frag);
  }

  function textNodesUnder(root) {
    const nodes = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue || shouldSkipNode(node)) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      nodes.push(node);
    }
    return nodes;
  }

  function locateTextOffset(nodes, offset, preferPrevious = false) {
    let cursor = 0;
    for (const node of nodes) {
      const next = cursor + node.nodeValue.length;
      if (offset < next || (offset === next && (preferPrevious || node.nodeValue.length === 0))) {
        return { node, offset: offset - cursor };
      }
      cursor = next;
    }

    const last = nodes[nodes.length - 1];
    return last ? { node: last, offset: last.nodeValue.length } : null;
  }

  function replaceSplitTextTags(root) {
    if (!root || root.nodeType !== Node.ELEMENT_NODE || root.matches(SKIP_SELECTOR)) {
      return;
    }

    const text = root.textContent;
    if (!text || !text.includes(TEXT_HINT)) return;

    const nodes = textNodesUnder(root);
    if (nodes.length < 2) return;

    const combined = nodes.map((node) => node.nodeValue).join("");
    TAG_RE.lastIndex = 0;
    const matches = [...combined.matchAll(TAG_RE)];
    if (!matches.length) return;

    observer?.disconnect();
    try {
      for (let i = matches.length - 1; i >= 0; i -= 1) {
        const match = matches[i];
        const [raw, name] = match;
        if (!EMOTIONS.has(name)) continue;

        const start = locateTextOffset(nodes, match.index);
        const end = locateTextOffset(nodes, match.index + raw.length, true);
        if (!start || !end) continue;

        const range = document.createRange();
        range.setStart(start.node, start.offset);
        range.setEnd(end.node, end.offset);
        range.deleteContents();
        range.insertNode(emotionImage(name));
      }
    } finally {
      observe();
    }
  }

  function scan(root) {
    if (!root || !settings.enabled) return;

    if (root.nodeType === Node.TEXT_NODE) {
      replaceTextNode(root);
      return;
    }

    if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) {
      return;
    }

    if (root.nodeType === Node.ELEMENT_NODE && root.matches(SKIP_SELECTOR)) {
      return;
    }

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue || !node.nodeValue.includes(TEXT_HINT)) {
          return NodeFilter.FILTER_REJECT;
        }
        return shouldSkipNode(node) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      },
    });

    const nodes = [];
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      nodes.push(node);
    }
    nodes.forEach(replaceTextNode);
    replaceSplitTextTags(root);
  }

  function observe() {
    if (!observer) return;

    observer.observe(document.documentElement, {
      childList: true,
      characterData: true,
      subtree: true,
    });
  }

  function scheduleFullScan() {
    if (!settings.enabled || pendingScanFrame !== null) return;

    pendingScanFrame = requestAnimationFrame(() => {
      pendingScanFrame = null;
      scan(document.body);
    });

    clearTimeout(pendingScanTimer);
    pendingScanTimer = setTimeout(() => {
      pendingScanTimer = null;
      scan(document.body);
    }, 250);
  }

  async function start() {
    await loadSettings();
    scan(document.body);

    observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") {
          scan(mutation.target);
          if (mutation.target.parentElement) {
            scan(mutation.target.parentElement);
          }
        } else {
          for (const node of mutation.addedNodes) {
            scan(node);
          }
        }
      }
      scheduleFullScan();
    });

    observe();
    ext.storage.onChanged.addListener(async (changes, areaName) => {
      if (areaName !== "local" || !changes[STORAGE_KEY]) return;

      const previousSettings = settings;
      await loadSettings();

      if (!settings.enabled) {
        restoreSprites();
        return;
      }

      if (previousSettings.style !== settings.style) {
        refreshRenderedSprites();
      }
      scan(document.body);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
