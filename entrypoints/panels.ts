import { defineUnlistedScript } from "wxt/utils/define-unlisted-script";

import "../src/ts/components/history-panel";
import "../src/ts/components/photo-info";
import "../src/ts/components/settings-drawer";
import { dispatch } from "../src/ts/service-worker";

declare global {
  interface Window {
    __stellarDispatch?: typeof dispatch;
  }
}

window.__stellarDispatch = dispatch;

export default defineUnlistedScript(() => undefined);
