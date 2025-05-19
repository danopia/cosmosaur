import type { MeteorBuildMeta } from "../shared/types.ts";

type RenderOpts = {
  cssUrl: string;
  jsUrl: string;
  gitCommitHash?: string;
  rootUrl: string;
  autoupdateVersion?: string;
  publicSettings?: Record<string, unknown>;
  buildMeta: MeteorBuildMeta;
};

export const renderHtml: (opts: RenderOpts) => string = opts => `<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" type="text/css" class="__meteor-css__" href="${opts.cssUrl}?meteor_css_resource=true" />
  ${opts.buildMeta['web.browser'].html.head}
</head>
<body>
  ${opts.buildMeta['web.browser'].html.body}
  <script type="text/javascript">
  __meteor_runtime_config__ = ${JSON.stringify({
    "meteorRelease": opts.buildMeta.server.meteorRelease,
    "gitCommitHash": opts.gitCommitHash,
    "meteorEnv": {
      "NODE_ENV": "production",
      "TEST_METADATA": "{}"
    },
    "DISABLE_SOCKJS": true,
    "PUBLIC_SETTINGS": opts.publicSettings ?? {},
    "ROOT_URL": opts.rootUrl,
    "ROOT_URL_PATH_PREFIX": "",
    "reactFastRefreshEnabled": false,
    "appId": opts.buildMeta.server.appId,
    "isModern": true,
    "autoupdate": {
      "versions": {
        "web.browser": {
          "version": opts.autoupdateVersion ?? opts.gitCommitHash ?? 'none',
          "versionNonRefreshable": opts.buildMeta['web.browser'].hashes.js, // for whole-page changes
          "versionRefreshable": opts.buildMeta['web.browser'].hashes.css, // for CSS changes
          // "versionReplaceable": buildCommit, // for HMR
        },
      },
    },
  }, null, 1).replaceAll('\n', '\n   ')}
  </script>
  <script type="text/javascript" src="${opts.jsUrl}?meteor_js_resource=true"></script>
</body>
</html>`;
