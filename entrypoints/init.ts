import { defineUnlistedScript } from "wxt/utils/define-unlisted-script";

import { registerStellarApp } from "../src/ts/init";

export default defineUnlistedScript(() => {
  registerStellarApp();
});
