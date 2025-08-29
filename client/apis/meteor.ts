import type { DdpConnection } from "@cloudydeno/ddp/client";
import { MeteorError, MeteorTypedError } from '../../shared/various-api.ts';
import { EJSONableProperty } from "@cloudydeno/ejson";

export class MeteorApi {

  constructor(
    private readonly connection: DdpConnection,
  ) {}

  // DDP
  readonly methods = () => Promise.reject(new Error(`TODO: simulation with methods()`));
  readonly publish = () => Promise.reject(new Error(`TODO: simulation with publish()`));
  readonly call = () => Promise.reject(new Error(`Use callAsync instead`));
  readonly callAsync = (name: string, params: EJSONableProperty[]) => this.connection.callMethod(name, params);
  readonly apply = () => Promise.reject(new Error(`Use applyAsync instead`));
  readonly applyAsync = (name: string, ...params: EJSONableProperty[]) => this.connection.callMethod(name, params);
  // reconnect: undefined;
  // disconnect: undefined;
  status: undefined;
  subscribe: undefined;
  // onConnection: undefined;

  // makeErrorType: undefined;
  // user: undefined;
  // userAsync: undefined;
  // userId: undefined;
  setInterval: undefined;
  setTimeout: undefined;
  clearInterval: undefined;
  clearTimeout: undefined;
  defer: undefined;
  startup: undefined;
  // wrapAsync: undefined;
  // bindEnvironment: undefined;

  isClient: false;
  isCordova: false;
  isServer: true;
  isProduction: true;
  isDevelopment: false;
  isModern: true;
  isTest: false;
  isAppTest: false;
  isPackageTest: false;
  // gitCommitHash: undefined;

  // _debug: undefined;

  // release: '';
  // meteorRelease: '';
  // settings: undefined;
  // users: undefined;
  Error: MeteorError;
  TypedError: MeteorTypedError;
  // absoluteUrl: {
  //   defaultOptions: undefined
  // };
  // EnvironmentVariable: undefined;

  // Auth
  // loginWithMeteorDeveloperAccount: undefined;
  // loginWithFacebook: undefined;
  // loginWithGithub: undefined;
  // loginWithGoogle: undefined;
  // loginWithMeetup: undefined;
  // loginWithTwitter: undefined;
  // loginWithWeibo: undefined;
  // loginWithPassword: undefined;
  // loginWithToken: undefined;
  // loggingIn: undefined;
  // loggingOut: undefined;
  // logout: undefined;
  // logoutOtherClients: undefined;
}
