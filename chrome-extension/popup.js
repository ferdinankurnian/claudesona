(() => {
  "use strict";

  const ext = typeof browser !== "undefined" ? browser : chrome;
  const STORAGE_KEY = "sonaPreferences";
  const DEFAULT_STYLE = "default";
  const MODELS = [
    {
      id: "gpt",
      label: "GPT",
      styles: [DEFAULT_STYLE],
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
      id: "claude",
      label: "Claude",
      styles: [DEFAULT_STYLE],
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
      id: "gemini",
      label: "Gemini",
      styles: [DEFAULT_STYLE],
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

  const app = document.querySelector("#app");
  let preferences = {};

  function modelById(id) {
    return MODELS.find((model) => model.id === id);
  }

  function spriteUrl(model, style, emotion) {
    return ext.runtime.getURL(`assets/${model.id}/${style}/${model.id}_${emotion}.png`);
  }

  function defaultPreferences() {
    return Object.fromEntries(
      MODELS.map((model) => [model.id, { enabled: true, style: DEFAULT_STYLE }]),
    );
  }

  function normalizeStyle(model, style) {
    return model.styles.includes(style) ? style : DEFAULT_STYLE;
  }

  async function loadPreferences() {
    const stored = await ext.storage.local.get(STORAGE_KEY);
    const defaults = defaultPreferences();
    preferences = Object.fromEntries(
      MODELS.map((model) => [
        model.id,
        {
          ...defaults[model.id],
          ...stored[STORAGE_KEY]?.[model.id],
          style: normalizeStyle(model, stored[STORAGE_KEY]?.[model.id]?.style),
        },
      ]),
    );
  }

  async function savePreferences() {
    await ext.storage.local.set({ [STORAGE_KEY]: preferences });
  }

  function showToast(message) {
    document.querySelector(".toast")?.remove();

    const toast = document.createElement("div");
    toast.className = "toast";
    toast.setAttribute("role", "status");
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add("visible"));
    setTimeout(() => {
      toast.classList.remove("visible");
      setTimeout(() => toast.remove(), 180);
    }, 3600);
  }

  function createBackButton(label, onClick) {
    const button = document.createElement("button");
    button.className = "back-button";
    button.type = "button";
    button.setAttribute("aria-label", label);
    button.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M15 5 8 12l7 7M8.5 12H21" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
      </svg>
    `;
    button.addEventListener("click", onClick);
    return button;
  }

  function createShell() {
    const view = document.createElement("section");
    view.className = "view";
    const shell = document.createElement("div");
    shell.className = "shell";
    view.appendChild(shell);
    app.replaceChildren(view);
    return shell;
  }

  function renderHome() {
    const shell = createShell();
    const brand = document.createElement("header");
    brand.className = "brand";
    brand.innerHTML = `
      <img class="brand-icon" src="icons/icon48.png" alt="">
      <div>
        <h1>claudesona</h1>
        <p class="subheading">pick a model to tune its sprites</p>
      </div>
    `;

    const grid = document.createElement("div");
    grid.className = "card-grid";
    for (const model of MODELS) {
      const modelPreferences = preferences[model.id];
      const button = document.createElement("button");
      button.className = "model-card";
      button.type = "button";
      button.innerHTML = `
        <img src="${spriteUrl(model, modelPreferences.style, model.emotions[0])}" alt="">
        <span class="card-label">
          <span>${model.label}</span>
          <span class="status-dot ${modelPreferences.enabled ? "enabled" : ""}" title="${modelPreferences.enabled ? "enabled" : "disabled"}"></span>
        </span>
      `;
      button.addEventListener("click", () => renderStyles(model.id));
      grid.appendChild(button);
    }

    shell.append(brand, grid);
  }

  function renderStyles(modelId) {
    const model = modelById(modelId);
    const shell = createShell();
    const header = document.createElement("header");
    header.className = "screen-header";

    const title = document.createElement("div");
    title.className = "screen-title";
    title.appendChild(createBackButton("Back to models", renderHome));
    title.insertAdjacentHTML("beforeend", `<h2>${model.label}</h2>`);

    const toggle = document.createElement("button");
    const enabled = preferences[model.id].enabled;
    toggle.className = `switch ${enabled ? "enabled" : ""}`;
    toggle.type = "button";
    toggle.setAttribute("role", "switch");
    toggle.setAttribute("aria-label", `Enable ${model.label} sprites`);
    toggle.setAttribute("aria-checked", String(enabled));
    toggle.addEventListener("click", async () => {
      preferences[model.id] = {
        ...preferences[model.id],
        enabled: !preferences[model.id].enabled,
      };
      await savePreferences();
      renderStyles(model.id);
      showToast(
        `${model.label} sprites ${preferences[model.id].enabled ? "enabled" : "disabled"}. Open chats update instantly; refresh once if needed.`,
      );
    });
    header.append(title, toggle);

    const grid = document.createElement("div");
    grid.className = "style-grid";
    for (const style of model.styles) {
      const selected = preferences[model.id].style === style;
      const button = document.createElement("button");
      button.className = `style-card ${selected ? "selected" : ""}`;
      button.type = "button";
      button.innerHTML = `
        <img src="${spriteUrl(model, style, model.emotions[0])}" alt="">
        <span class="card-label">
          <span>${style}</span>
          ${selected ? '<span class="selected-mark">active</span>' : ""}
        </span>
      `;
      button.addEventListener("click", () => renderStyleDetail(model.id, style));
      grid.appendChild(button);
    }

    shell.append(header, grid);
  }

  function renderStyleDetail(modelId, style) {
    const model = modelById(modelId);
    const shell = createShell();
    const header = document.createElement("header");
    header.className = "screen-header";

    const title = document.createElement("div");
    title.className = "screen-title";
    title.appendChild(createBackButton(`Back to ${model.label} styles`, () => renderStyles(model.id)));
    title.insertAdjacentHTML("beforeend", `<h2>${style}</h2>`);

    const useButton = document.createElement("button");
    useButton.className = "use-button";
    useButton.type = "button";
    useButton.textContent = preferences[model.id].style === style ? "Using" : "Use";
    useButton.addEventListener("click", async () => {
      preferences[model.id] = { ...preferences[model.id], style };
      await savePreferences();
      renderStyles(model.id);
      showToast(`${model.label} now uses ${style}. Open chats update instantly; refresh once if needed.`);
    });
    header.append(title, useButton);

    const grid = document.createElement("div");
    grid.className = "sprite-grid";
    for (const emotion of model.emotions) {
      const card = document.createElement("div");
      card.className = "sprite-card";
      card.innerHTML = `
        <img src="${spriteUrl(model, style, emotion)}" alt="${model.label} ${emotion.replaceAll("_", " ")}">
        <span title="${emotion}">${emotion.replaceAll("_", " ")}</span>
      `;
      grid.appendChild(card);
    }

    shell.append(header, grid);
  }

  loadPreferences().then(renderHome);
})();
