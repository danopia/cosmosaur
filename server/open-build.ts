import type { MeteorBuildMeta } from "../shared/types.ts";
import { getBackend } from "./registry.ts";

export async function openBuild(fsPath = "."): Promise<MeteorBuildMeta> {
  const backend = getBackend();

  console.debug('Checking for built Meteor bundle...');
  const buildPath = new URL(`${fsPath}/`, `file://${Deno.cwd()}/`).toString();

  const buildMeta = await loadBuildMeta(buildPath);
  console.debug('Loaded built client from', buildMeta['server'].meteorRelease);

  backend.meteorBuild = {
    buildMeta,
    rootFsPath: buildPath,
  };

  backend.ddpInterface
    .addPublication('meteor_autoupdate_clientVersions', x => {
      x.added('meteor_autoupdate_clientVersions', 'web.browser', {
        "version": Deno.env.get('DENO_DEPLOYMENT_ID'),
        "versionNonRefreshable": buildMeta['web.browser'].hashes.js, // for whole-page changes
        "versionRefreshable": buildMeta['web.browser'].hashes.css, // for CSS changes
        // "versionReplaceable": buildCommit, // for HMR
        "assets": [{
          "url": `${buildMeta['web.browser'].hashes.css}.css?meteor_css_resource=true`,
        }],
      });
      x.ready();
    });

  return buildMeta;
}

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
    "packages": [],
  };

  for await (const item of Deno.readDir(new URL('bundle/programs/web.browser', buildPath))) {
    if (item.name.endsWith('.js')) {
      build['web.browser'].hashes.js = item.name.split('.')[0];
    }
    if (item.name.endsWith('.css')) {
      build['web.browser'].hashes.css = item.name.split('.')[0];
    }
  }

  try {
    for await (const item of Deno.readDir(new URL('bundle/programs/server/packages', buildPath))) {
      if (item.name.endsWith('.js') && !item.name.endsWith('.map.js')) {
        build['packages']?.push(item.name.slice(0, -3));
      }
    }
  } catch (thrown) {
    if (!(thrown instanceof Deno.errors.NotFound)) throw thrown;
  }

  return build;
}
