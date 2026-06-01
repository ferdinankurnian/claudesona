# Sona Emotion Sprites

Unofficial local Chrome extension for `claude.ai`, `chatgpt.com`, and `gemini.google.com`.

When a supported model site renders one of these literal tags in normal page text, the extension replaces it with the matching 128x128 transparent PNG on its own line.

Click the toolbar icon to open the theme picker. Each model can be enabled or disabled independently, and each model can use its own sprite theme. The bundled sprites live under `assets/<model>/<theme>/`. Chromium-based browsers discover complete theme directories automatically when the popup opens.

Tags are host-specific:

- `claude.ai` renders only `<claude_* />` tags.
- `chatgpt.com` renders only `<gpt_* />` tags.
- `gemini.google.com` renders only `<gemini_* />` tags.

Claude tags:

- `<claude_amused />`
- `<claude_concerned />`
- `<claude_curious />`
- `<claude_frustrated />`
- `<claude_happy />`
- `<claude_playful />`
- `<claude_sad />`
- `<claude_sheepish />`
- `<claude_skeptical />`
- `<claude_thoughtful />`
- `<claude_touched />`
- `<claude_uncertain />`
- `<claude_warm />`

GPT tags:

- `<gpt_caution />`
- `<gpt_coherence_seeking />`
- `<gpt_confidence />`
- `<gpt_confusion />`
- `<gpt_curiosity />`
- `<gpt_focus />`
- `<gpt_frustration />`
- `<gpt_helpfulness />`
- `<gpt_novelty_detection />`
- `<gpt_satisfaction />`
- `<gpt_surprise />`
- `<gpt_uncertainty />`
- `<gpt_urgency />`

Gemini tags:

- `<gemini_caution />`
- `<gemini_certainty />`
- `<gemini_convergence />`
- `<gemini_dissonance />`
- `<gemini_equilibrium />`
- `<gemini_generative_flow />`
- `<gemini_inquisitiveness />`
- `<gemini_perplexity />`
- `<gemini_resolution />`
- `<gemini_resonance />`
- `<gemini_saturation />`
- `<gemini_uncertainty />`
- `<gemini_vigilance />`

It skips code blocks, form fields, scripts, styles, and contenteditable regions.
