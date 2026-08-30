// biome-ignore assist/source/organizeImports: Side-effect and type imports are grouped separately per AGENTS.md.
import { html } from "lit";

import "./frequency-settings";
import "./local-settings";
import "./smithsonian-settings";
import "./unsplash-settings";

import { EARTHVIEW_SETTINGS_KEY } from "../sources/earthview";

import type { TemplateResult } from "lit";

function renderSourceSettings(sourceId: string): TemplateResult | null {
  if (sourceId === "unsplash") return html`<stellar-unsplash-settings />`;
  if (sourceId === "earthview") {
    return html`<stellar-frequency-settings
      .settingsKey=${EARTHVIEW_SETTINGS_KEY}
    />`;
  }
  if (sourceId === "smithsonian") {
    return html`<stellar-smithsonian-settings />`;
  }
  if (sourceId === "local") return html`<stellar-local-settings />`;

  return null;
}

export { renderSourceSettings };
