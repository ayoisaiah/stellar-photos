import { html } from "lit";

import "./local-settings";
import "./smithsonian-settings";
import "./unsplash-settings";

import type { TemplateResult } from "lit";

function hasSourceSettings(sourceId: string): boolean {
  return (
    sourceId === "unsplash" ||
    sourceId === "smithsonian" ||
    sourceId === "local"
  );
}

function renderSourceSettings(sourceId: string): TemplateResult | null {
  if (sourceId === "unsplash") return html`<stellar-unsplash-settings />`;
  if (sourceId === "smithsonian") {
    return html`<stellar-smithsonian-settings />`;
  }
  if (sourceId === "local") return html`<stellar-local-settings />`;

  return null;
}

export { hasSourceSettings, renderSourceSettings };
