import { html } from "lit";

import "./earthview-settings";
import "./local-settings";
import "./unsplash-settings";

import type { TemplateResult } from "lit";

const sourceSettingsRenderers: ReadonlyMap<string, () => TemplateResult> =
  new Map([
    ["unsplash", () => html`<stellar-unsplash-settings />`],
    ["earthview", () => html`<stellar-earthview-settings />`],
    ["local", () => html`<stellar-local-settings />`],
  ]);

export function renderSourceSettings(sourceId: string): TemplateResult | null {
  return sourceSettingsRenderers.get(sourceId)?.() ?? null;
}
