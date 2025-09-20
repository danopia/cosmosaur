import { serveWebsocket } from "@cloudydeno/ddp/server";

import { getInterface, setDefaultDatabase } from "@danopia/cosmosaur-server/registry";
import { openAutomaticDatabase } from "@danopia/cosmosaur-server/storage/auto";

setDefaultDatabase(await openAutomaticDatabase());

console.debug('Loading server modules...');
await import('./links-demo/server/main.ts');

console.debug('Waiting for server startup...');
for (const func of getInterface().startupFuncs) {
  await func();
}

console.debug('Application loaded.');
Deno.serve((req, connInfo) => {

  if (req.url.endsWith('/websocket')) {
    const { response } = serveWebsocket(req, connInfo, getInterface().ddpInterface);
    return response;
  }

  return new Response('', { status: 404 });
});
