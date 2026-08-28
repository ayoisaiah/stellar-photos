import type { LucideIconData } from "@lucide/icons";
import { buildLucideSvg } from "@lucide/icons/build";
import { LitElement, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators.js";
import { unsafeSVG } from "lit/directives/unsafe-svg.js";
import styles from "../../css/components/lucide-icon.css?inline";

@customElement("stellar-icon")
class LucideIcon extends LitElement {
  static override styles = unsafeCSS(styles);

  @property({ attribute: false })
  accessor icon: LucideIconData | null = null;

  override render() {
    if (!this.icon) return null;

    return unsafeSVG(
      buildLucideSvg(this.icon, {
        attributes: { "aria-hidden": "true", focusable: "false" },
      }),
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "stellar-icon": LucideIcon;
  }
}
