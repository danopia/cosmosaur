import { serveWebsocket } from "@cloudydeno/ddp/server";

import { getInterface, setDefaultDatabase } from "@danopia/cosmosaur-server/registry";
import { openAutomaticDatabase } from "@danopia/cosmosaur-server/storage/auto";

console.debug('Loading server database...');
setDefaultDatabase(await openAutomaticDatabase());

console.debug('Loading server modules...');
setTimeout(async () => {

  console.debug('Waiting for server startup...');
  for (const func of getInterface().startupFuncs) {
    await func();
  }

  console.debug('Application loaded.');
  Deno.serve((req, connInfo) => {

    if (req.url.endsWith('/websocket')) {
      return serveWebsocket(req, connInfo, getInterface().ddpInterface);
    }

    return new Response('', { status: 404 });
  });
});
