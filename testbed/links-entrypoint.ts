import { serveWebsocket } from "@cloudydeno/ddp/server";
import { getInterface, withDatabase } from "@danopia/cosmosaur-server/registry";
import { KvDocDatabase } from "../server/storage/deno-kv.ts";

console.debug('Opening KV database...');
const kv = await Deno.openKv();

const database = new KvDocDatabase(kv, ['database']);
await withDatabase(database, async () => {

  console.debug('Loading server modules...');
  await import('./links-demo/server/main.ts');

  console.debug('Waiting for server startup...');
  for (const func of getInterface().startupFuncs) {
    await func();
  }

  console.debug('Application loaded.');
});

Deno.serve((req, connInfo) => {

  if (req.url.endsWith('/websocket')) {
    return serveWebsocket(req, connInfo, getInterface().ddpInterface);
  }

  return new Response('', { status: 404 });
});
