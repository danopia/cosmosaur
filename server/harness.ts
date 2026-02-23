import { serveDir } from "@std/http/file-server";
import { serveWebsocket } from "@cloudydeno/ddp/server";

import { getBackend, setDefaultBackend } from "./registry.ts";
import { openAutomaticDatabase } from "./storage/detection.ts";
import { newBackend } from "./backend.ts";
import { renderHtml } from "./build-html.ts";

export { openBuild } from "./open-build.ts";

/** Registers a default Backend by an autodetected Database instance. */
export async function connectDefaultBackend() {
  console.debug('Loading server database...');
  setDefaultBackend(newBackend({
    database: await openAutomaticDatabase(),
  }));
}


/** Runs all startup hooks for the current Backend in sequential order. */
export async function runStartup() {
  console.debug('Waiting for server startup...');
  for (const func of getBackend().startupFuncs) {
    await func();
  }
  console.debug('Application loaded.');
}


export async function serveHandler(req: Request, connInfo: Deno.ServeHandlerInfo): Promise<Response> {
  const backend = getBackend();

  if (req.url.endsWith('/websocket')) {
    const { response } = serveWebsocket(req, connInfo, backend.ddpInterface);
    return response;
  }

  // Extra routes when a build is loaded.
  if (backend.meteorBuild?.buildMeta) {

    // Serve static assets if they are found in our build.
    const staticResp = await serveDir(req, {
      fsRoot: new URL('bundle/programs/web.browser/', backend.meteorBuild.rootFsPath).pathname,
    });
    if (staticResp.status != 404) {
      return staticResp;
    }

    // TODO: Support for routing to any additional routes registered by the loaded backend.

    // Otherwise we serve the app's dynamic HTML.
    const html = renderHtml({
      extraRuntimeConfig: {
        ROOT_URL: new URL('/', req.url).toString(),
        ROOT_URL_PATH_PREFIX: '', // TODO: split pathname out from ROOT_URL
        gitCommitHash: Deno.env.get('DENO_DEPLOYMENT_ID'),
      }
    });

    return new Response(html, {
      headers: {
        'content-type': 'text/html; charset=utf-8',
      },
    });
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
