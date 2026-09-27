import {
  html,
  type ReactiveController,
  type ReactiveControllerHost,
  type TemplateResult,
} from "lit";
import type { PhotoFrequency } from "../sources/photo-frequency";
import { FREQUENCIES } from "../sources/photo-frequency";

type SaveState = keyof typeof STATUS_MESSAGES;

interface RadioOption<T extends string = string> {
  value: T;
  label: string;
  description?: string;
}

const SAVED_RESET_DELAY_MS = 2500;

const STATUS_MESSAGES = {
  idle: "",
  saving: "Saving…",
  saved: "Saved",
  error: "Couldn’t save this setting.",
};

class SaveStatusController implements ReactiveController {
  private timeoutId?: number;
  state: SaveState = "idle";

  constructor(private host: ReactiveControllerHost) {
    host.addController(this);
  }

  hostDisconnected(): void {
    if (this.timeoutId !== undefined) {
      window.clearTimeout(this.timeoutId);
      this.timeoutId = undefined;
    }
  }

  set(nextState: SaveState): void {
    if (this.timeoutId !== undefined) {
      window.clearTimeout(this.timeoutId);
      this.timeoutId = undefined;
    }

    this.state = nextState;
    this.host.requestUpdate();

    if (nextState === "saved") {
      this.timeoutId = window.setTimeout(() => {
        this.state = "idle";
        this.host.requestUpdate();
      }, SAVED_RESET_DELAY_MS);
    }
  }

  get message(): string {
    return STATUS_MESSAGES[this.state];
  }
}

function renderRadioGroup<T extends string>(
  name: string,
  options: readonly RadioOption<T>[],
  value: T,
  onChange: (value: T, event: Event) => void,
  disabled = false,
  labelClass = "radio-label",
): TemplateResult {
  return html`
    <div class="options">
      ${options.map(
        (opt) => html`
          <label class=${labelClass}>
            <input
              type="radio"
              name=${name}
              value=${opt.value}
              .checked=${value === opt.value}
              ?disabled=${disabled}
              @change=${(e: Event) => onChange(opt.value, e)}
            />
            <span class="control" aria-hidden="true"></span>
            <span>
              <strong>${opt.label}</strong>
              ${opt.description ? html`<small>${opt.description}</small>` : null}
            </span>
          </label>
        `,
      )}
    </div>
  `;
}

function renderFrequencySelector(
  value: PhotoFrequency,
  disabled: boolean,
  change: (event: Event) => void,
  labelClass = "radio-label",
): TemplateResult {
  return renderRadioGroup(
    "frequency",
    FREQUENCIES,
    value,
    (_, event) => change(event),
    disabled,
    labelClass,
  );
}

function readFrequency(event: Event): PhotoFrequency | undefined {
  const value = (event.currentTarget as HTMLInputElement).value;

  return FREQUENCIES.find((frequency) => frequency.value === value)?.value;
}

export type { RadioOption, SaveState };
export {
  FREQUENCIES,
  readFrequency,
  renderFrequencySelector,
  renderRadioGroup,
  SaveStatusController,
};
