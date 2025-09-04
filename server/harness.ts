import { serveWebsocket } from "@cloudydeno/ddp/server";

import { getInterface, setDefaultDatabase } from "./registry.ts";
import { openAutomaticDatabase } from "./storage/detection.ts";

export async function connectDefaultDatabase() {
  console.debug('Loading server database...');
  setDefaultDatabase(await openAutomaticDatabase());
}

export async function runStartup() {
  console.debug('Waiting for server startup...');
  for (const func of getInterface().startupFuncs) {
    await func();
  }
  console.debug('Application loaded.');
}

export function serveHandler(req: Request, connInfo: Deno.ServeHandlerInfo): Response {
  if (req.url.endsWith('/websocket')) {
    return serveWebsocket(req, connInfo, getInterface().ddpInterface);
  }

  return new Response('', { status: 404 });
}

export function serveViaListen(): Deno.HttpServer<Deno.NetAddr> {
  return Deno.serve(serveHandler);
}

export function serveViaExport(): Deno.ServeDefaultExport {
  return {
    fetch: serveHandler,
  };
}
