import { serveWebsocket } from "@cloudydeno/ddp/server";
import { Database, getInterface, withDatabase } from "@danopia/cosmosaur-server/registry";
import { KvDocDatabase } from "../server/storage/deno-kv.ts";
import { MongoStorageDatabase } from "../server/storage/mongodb.ts";
import { MongoClient } from "mongodb";

let database: Database;
if (Deno.args[0]) {
  console.debug('Opening MongoDB database...');
  const driver = await MongoClient.connect(Deno.args[0]);
  database = new MongoStorageDatabase(driver.db());
} else {
  console.debug('Opening KV database...');
  const kv = await Deno.openKv();
  database = new KvDocDatabase(kv, ['database']);
}

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
