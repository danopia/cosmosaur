import { DdpInterface } from "@cloudydeno/ddp/server";

import type { Backend, Database, MeteorBuild, MeteorSettings } from "./types.ts";
import { AnonymousDatabase } from "./storage/impl-anonymous.ts";
import { RandomStream } from "@cloudydeno/ddp/random";
// import { Hook } from "meteor/callback-hook";

export function newBackend(opts: {
  ddpInterface?: DdpInterface;
  database?: Database;
  meteorBuild?: MeteorBuild;
  rootUrl?: string;
  settings?: MeteorSettings;
} = {}): Backend {
  const database = opts.database ?? new AnonymousDatabase;
  return {
    ddpInterface: opts.ddpInterface ?? new DdpInterface,
    meteorBuild: opts.meteorBuild,
    database,
    namedCollections: new Map,
    // userIdMap: new WeakMap,
    startupFuncs: [],
    packages: {},
    runtimeConfig: {
      ROOT_URL: opts.rootUrl ?? Deno.env.get('ROOT_URL') ?? 'http://localhost:3000',
      ROOT_URL_PATH_PREFIX: Deno.env.get('ROOT_URL_PATH_PREFIX') ?? '',
      DISABLE_SOCKJS: (Deno.env.get('DISABLE_SOCKJS') ?? 'true') == 'true',
      isModern: true,
    },
    settings: opts.settings ?? {
      public: {},
    },
    randomStream: new RandomStream('server'),

    // // accounts-base
    // loginHandlers: new Map,
    // loginTokenMap: new Map,
    // onLoginHook: new Hook({
    //   bindEnvironment: false,
    //   debugPrintExceptions: 'onLogin callback',
    // }),
    // onLoginFailureHook: new Hook({
    //   bindEnvironment: false,
    //   debugPrintExceptions: 'onLoginFailure callback',
    // }),
    // onLogoutHook: new Hook({
    //   bindEnvironment: false,
    //   debugPrintExceptions: 'onLogout callback',
    // }),
  };
}
