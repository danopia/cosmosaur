import { serveDir } from "@std/http/file-server";

import { serveWebsocket } from "@cloudydeno/ddp/server";

import type { MeteorBuildMeta } from "../shared/types.ts";
import { getInterface, setDefaultDatabase } from "./registry.ts";
import { openAutomaticDatabase } from "./storage/detection.ts";
import { renderHtml } from "./build-html.ts";

console.debug('Loading server database...');
setDefaultDatabase(await openAutomaticDatabase());

console.debug('Loading server modules...');
await import(new URL(Deno.args[0], `file://${Deno.cwd()}/`).toString());

console.debug('Waiting for server startup...');
for (const func of getInterface().startupFuncs) {
  await func();
}

const buildPath = Deno.args[1] == "--build-path"
  ? new URL(`${Deno.args[2]}/`, `file://${Deno.cwd()}/`).toString()
  : null;
const buildMeta = buildPath
  ? await loadBuildMeta(buildPath)
  : null;
console.log('buildMeta:', buildMeta);

console.debug('Application loaded.');
export default {
  async fetch(req, connInfo) {

    if (req.url.endsWith('/websocket')) {
      const { response } = serveWebsocket(req, connInfo, getInterface().ddpInterface);
      return response;
    }

    if (buildPath && buildMeta) {
      const staticResp = await serveDir(req, {
        fsRoot: new URL('bundle/programs/web.browser/', buildPath).pathname,
      });
      if (staticResp.status != 404) {
        return staticResp;
      }

      const html = renderHtml({
        buildMeta,
        cssUrl: `${buildMeta['web.browser'].hashes.css}.css`,
        jsUrl: `${buildMeta['web.browser'].hashes.js}.js`,
        rootUrl: new URL('/', req.url).toString(),
        gitCommitHash: Deno.env.get('DENO_DEPLOYMENT_ID'),
      });
      return new Response(html, {
        headers: {
          'content-type': 'text/html; charset=utf-8',
        },
      });
    }

    return new Response('', { status: 404 });
  },
} satisfies Deno.ServeDefaultExport as Deno.ServeDefaultExport;

async function loadBuildMeta(buildPath: string): Promise<MeteorBuildMeta> {
  const build: MeteorBuildMeta = {
    "server": JSON.parse(await Deno.readTextFile(new URL('bundle/programs/server/config.json', buildPath))),
    "web.browser": {
      html: {
        body: await Deno.readTextFile(new URL('bundle/programs/web.browser/body.html', buildPath)),
        head: await Deno.readTextFile(new URL('bundle/programs/web.browser/head.html', buildPath)),
      },
      // Will be filled in by the readDir() loop below:
      hashes: { css: '', js: '' },
    },
  };

  for await (const item of Deno.readDir(new URL('bundle/programs/web.browser', buildPath))) {
    if (item.name.endsWith('.js')) {
      build['web.browser'].hashes.js = item.name.split('.')[0];
    }
    if (item.name.endsWith('.css')) {
      build['web.browser'].hashes.css = item.name.split('.')[0];
    }
  }

  return build;
}
