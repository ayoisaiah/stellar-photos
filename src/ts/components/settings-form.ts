import { html } from "lit";
import type { PhotoFrequency } from "../sources/photo-frequency";
import { FREQUENCIES } from "../sources/photo-frequency";

type SaveState = "idle" | "saving" | "saved" | "error";

const SAVED_RESET_DELAY_MS = 2500;

const STATUS_MESSAGES: Record<string, string> = {
  saving: "Saving…",
  saved: "Saved",
  error: "Couldn’t save this setting.",
};

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
  return STATUS_MESSAGES[saveState] ?? "";
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
