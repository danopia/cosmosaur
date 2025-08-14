// export interface DocDriver<T extends Record<string,unknown>> {
//   findOne(selector?: Record<string,unknown>, opts?: FindOpts): T | null;
//   find(selector?: Record<string,unknown>, opts?: FindOpts): Cursor<T>;
// }
export interface FindOpts {
  fields?: Record<string, boolean>;
}

// export interface DocDriverFactory<
//   Tcoll extends DocDriver<Tdoc>,
//   Tdoc extends Record<string,unknown>,
// > {
//   forNamedCollection(name: string): Tcoll;
//   forAnonymousCollection?(): Tcoll;
// }

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
