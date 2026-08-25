import { html } from "lit";

import "./unsplash-settings";

import type { TemplateResult } from "lit";

const sourceSettingsRenderers: ReadonlyMap<string, () => TemplateResult> =
  new Map([["unsplash", () => html`<stellar-unsplash-settings />`]]);

export function renderSourceSettings(sourceId: string): TemplateResult | null {
  return sourceSettingsRenderers.get(sourceId)?.() ?? null;
}
