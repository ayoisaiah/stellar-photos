import { defineBackground } from "wxt/utils/define-background";

import { startServiceWorker } from "../src/ts/service-worker";

export default defineBackground(() => {
  startServiceWorker();
});
