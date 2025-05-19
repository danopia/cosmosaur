
export type MeteorBuildMeta = {
  'web.browser': {
    hashes: {
      js: string;
      css: string;
    };
    html: {
      body: string;
      head: string;
    };
  };
  'server': {
    meteorRelease: string;
    appId: string;
    clientArchs: Array<"web.browser">;
  };
};
