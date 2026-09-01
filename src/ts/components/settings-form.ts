import { html } from "lit";

import type { PhotoFrequency } from "../sources/photo-frequency";

type SaveState = "idle" | "saving" | "saved" | "error";

const SAVED_RESET_DELAY_MS = 2500;

const FREQUENCIES: readonly {
  value: PhotoFrequency;
  label: string;
  description: string;
}[] = [
  {
    value: "newtab",
    label: "Every new tab",
    description: "Load a new photo whenever you open a tab",
  },
  {
    value: "every15minutes",
    label: "Every 15 minutes",
    description: "Keep the same photo for 15 minutes",
  },
  {
    value: "everyhour",
    label: "Every hour",
    description: "Keep the same photo for 1 hour",
  },
  {
    value: "everyday",
    label: "Every 24 hours",
    description: "Keep the same photo for 24 hours",
  },
];

function renderFrequencySelector(
  value: PhotoFrequency,
  disabled: boolean,
  change: (event: Event) => void,
  labelClass = "radio-label",
) {
  return html`
    <div class="options">
      ${FREQUENCIES.map(
        (frequency) => html`
          <label class=${labelClass}>
            <input
              type="radio"
              name="frequency"
              value=${frequency.value}
              .checked=${value === frequency.value}
              ?disabled=${disabled}
              @change=${change}
            />
            <span class="control" aria-hidden="true"></span>
            <span>
              <strong>${frequency.label}</strong>
              <small>${frequency.description}</small>
            </span>
          </label>
        `,
      )}
    </div>
  `;
}

function readFrequency(event: Event): PhotoFrequency | undefined {
  const value = (event.currentTarget as HTMLInputElement).value;

  return FREQUENCIES.find((frequency) => frequency.value === value)?.value;
}

function statusMessage(saveState: SaveState): string {
  if (saveState === "saving") return "Saving…";
  if (saveState === "saved") return "Saved";
  if (saveState === "error") return "Couldn’t save this setting.";

  return "";
}

function scheduleSavedReset(reset: () => void): number {
  return window.setTimeout(reset, SAVED_RESET_DELAY_MS);
}

export type { SaveState };
export {
  FREQUENCIES,
  readFrequency,
  renderFrequencySelector,
  scheduleSavedReset,
  statusMessage,
};
