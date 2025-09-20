import { serveWebsocket } from "@cloudydeno/ddp/server";

import { getInterface, setDefaultDatabase } from "./registry.ts";
import { openAutomaticDatabase } from "./storage/detection.ts";

console.debug('Loading server database...');
setDefaultDatabase(await openAutomaticDatabase());

console.debug('Loading server modules...');
await import(new URL(Deno.args[0], `file://${Deno.cwd()}/`).toString());

console.debug('Waiting for server startup...');
for (const func of getInterface().startupFuncs) {
  await func();
}

console.debug('Application loaded.');
export default {
  fetch(req, connInfo) {

    if (req.url.endsWith('/websocket')) {
      const { response } = serveWebsocket(req, connInfo, getInterface().ddpInterface);
      return response;
    }

    return new Response('', { status: 404 });
  },
} satisfies Deno.ServeDefaultExport;
