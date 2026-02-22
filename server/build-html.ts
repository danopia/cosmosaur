import { getBackend } from "./registry.ts";
import type { RuntimeConfig } from "./types.ts";

type RenderOpts = {
  // cssUrl: string;
  // jsUrl: string;
  gitCommitHash?: string;
  rootUrl?: string;
  // autoupdateVersion?: string;
  // publicSettings?: Record<string, unknown>;
  // buildMeta: MeteorBuildMeta;
  extraRuntimeConfig?: Partial<RuntimeConfig>;
};

// TODO: use a given Backend instance for configuring the response
export function renderHtml(opts: RenderOpts): string {
  const backend = getBackend();
  if (!backend.meteorBuild) throw new Error(
    `Cannot serve HTML without meteorBuild on Backend`);
  const { buildMeta } = backend.meteorBuild;

  const cssUrl = `${buildMeta['web.browser'].hashes.css}.css`;
  const jsUrl = `${buildMeta['web.browser'].hashes.js}.js`;

  const renderedRuntime = {
    ...backend.runtimeConfig,
    // "gitCommitHash": opts.gitCommitHash,
    // "ROOT_URL": opts.rootUrl,
    // "ROOT_URL_PATH_PREFIX": "",
    // "reactFastRefreshEnabled": false,
    "PUBLIC_SETTINGS": backend.settings.public,
    ...opts.extraRuntimeConfig,
  };

  return `<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" type="text/css" class="__meteor-css__" href="${cssUrl}?meteor_css_resource=true" />
  ${buildMeta['web.browser'].html.head}
</head>
<body>
  ${buildMeta['web.browser'].html.body}
  <script type="text/javascript">
  __meteor_runtime_config__ = ${JSON
    .stringify(renderedRuntime, null, 1)
    .replaceAll('\n', '\n   ')}
  </script>
  <script type="text/javascript" src="${jsUrl}?meteor_js_resource=true"></script>
</body>
</html>`;
}
