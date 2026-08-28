import { html } from "lit";

import "./earthview-settings";
import "./local-settings";
import "./unsplash-settings";

import type { TemplateResult } from "lit";

export function renderSourceSettings(sourceId: string): TemplateResult | null {
  if (sourceId === "unsplash") return html`<stellar-unsplash-settings />`;
  if (sourceId === "earthview") return html`<stellar-earthview-settings />`;
  if (sourceId === "local") return html`<stellar-local-settings />`;

  return null;
}
