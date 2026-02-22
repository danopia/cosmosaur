import type { HasId, ObserverHandle, PartialCollectionApi } from "@cloudydeno/ddp/livedata/types.ts";
import type { DdpInterface, DdpSession } from "@cloudydeno/ddp/server";
import type { Hook } from "meteor/callback-hook";
import type { MongoCollection } from "./meteor-api/mongo.ts";
import type { MeteorBuildMeta } from "../shared/types.ts";
import type { MeteorError } from "../shared/various-api.ts";

export type LoginResult = {
  type?: string;
  error?: MeteorError;
  userId?: string;
  stampedLoginToken?: StampedLoginToken;
  options?: Record<string,unknown>;
};
export type LoginAttempt = {
  type: string;
  allowed: boolean;
  methodName: string;
  methodArguments: unknown[];
  error?: MeteorError;
  user?: UserDoc;
};
export type StampedLoginToken = {
  token: string;
  when: Date;
};
export type HashedLoginToken = {
  hashedToken: string;
  when: Date;
};
export type LoginHandler = (arg: unknown) => Promise<undefined | LoginResult>;

export interface Database {
  newCollection<Tdoc extends HasId>(name: string): PartialCollectionApi<Tdoc>;
  getCollection<Tdoc extends HasId>(name: string): PartialCollectionApi<Tdoc> | null;
};

export interface MeteorBuild {
  rootFsPath: string;
  buildMeta: MeteorBuildMeta;
};

export interface MeteorSettings extends Record<string,unknown> {
  public: Record<string,unknown>;
  packages?: Record<string,Record<string,unknown>>;
};

interface RuntimeAutoupdate {
  versions?: {
    'web.browser'?: {
      version?: string;
      versionNonRefreshable?: string;
      versionRefreshable?: string;
    };
  };
};

export interface RuntimeConfig extends Record<string,unknown> {
  appId?: string;
  ACCOUNTS_CONNECTION_URL?: string;
  autoupdate?: RuntimeAutoupdate;
  DISABLE_SOCKJS?: boolean;
  gitCommitHash?: string;
  isModern?: boolean;
  meteorRelease?: string;
  meteorEnv?: Record<string,string>;
  PUBLIC_SETTINGS?: Record<string,unknown>;
  reactFastRefreshEnabled?: boolean;
  ROOT_URL_PATH_PREFIX?: string;
  ROOT_URL?: string;
  // TODO: more? from types maybe?
};

export interface UserDoc {
  _id: string;
  username?: string;
  emails?: { address: string; verified: boolean; }[];
  createdAt?: Date;
  profile?: Record<string,unknown>;
  services?: Record<string,unknown> & {
    password?: {
      argon2?: string;
      bcrypt?: string;
    };
    twoFactorAuthentication?: {
      secret?: string;
      type?: 'otp';
    }
  };
}

/**
 * A Backend represents the identity and state of one Meteor server identity.
 * Most apps only need to use one Backend. The default Backend is ready to use for this purpose.
 * Creating multiple Backends lets you "virtual host", or run multiple Meteor servers within one process.
 */
export interface Backend {
  ddpInterface: DdpInterface;
  startupFuncs: Array<() => void | Promise<void>>;
  database: Database;
  namedCollections: Map<string, MongoCollection<HasId>>;
  // userIdMap: WeakMap<DdpSession, string>;
  meteorBuild?: MeteorBuild;
  runtimeConfig: RuntimeConfig;
  // packages: Map<string, Record<string, unknown>>;
  settings: Record<string,unknown> & {
    public: Record<string,unknown>;
    packages?: Record<string,Record<string,unknown>>;
  };

  packages: {
    'accounts-base'?: AccountsBasePackage;
    'accounts-password'?: AccountsPasswordPackage;
    'accounts-2fa'?: Accounts2faPackage;
  };

  // loginHandlers: Map<string, LoginHandler>;
  // loginTokenMap: WeakMap<DdpSession, string>;
  // onLoginHook: Hook;
  // onLoginFailureHook: Hook;
  // onLogoutHook: Hook;
}

export interface AccountsBaseConfig {
  // sendVerificationEmail?: boolean;
  // forbidClientAccountCreation?: boolean;
  // restrictCreationByEmailDomain?: string | Function;
  // loginExpiration?: number;
  // loginExpirationInDays?: number;
  // oauthSecretKey?: string;
  // passwordResetTokenExpiration?: number;
  // passwordResetTokenExpirationInDays?: number;
  // passwordEnrollTokenExpiration?: number;
  // passwordEnrollTokenExpirationInDays?: number;
  ambiguousErrorMessages?: boolean;
  // bcryptRounds?: number;
  // argon2Enabled?: string | false;
  // argon2Type?: string;
  // argon2TimeCost?: number;
  // argon2MemoryCost?: number;
  // argon2Parallelism?: number;
  defaultFieldSelector?: { [key: string]: 0 | 1 };
  // collection?: string;
  // loginTokenExpirationHours?: number;
  // tokenSequenceLength?: number;
  // clientStorage?: 'session' | 'local';
}
export interface AccountsBasePackage {
  config: AccountsBaseConfig;
  loginHandlers: Map<string, LoginHandler>;
  loginTokenMap: WeakMap<DdpSession, string>;
  userObservers: WeakMap<DdpSession, ObserverHandle | symbol>;
  onLoginHook: Hook;
  onLoginFailureHook: Hook;
  onLogoutHook: Hook;
}

export interface AccountsPasswordConfig {
  // sendVerificationEmail?: boolean;
  // forbidClientAccountCreation?: boolean;
  // restrictCreationByEmailDomain?: string | Function;
  // loginExpiration?: number;
  // loginExpirationInDays?: number;
  // oauthSecretKey?: string;
  // passwordResetTokenExpiration?: number;
  // passwordResetTokenExpirationInDays?: number;
  // passwordEnrollTokenExpiration?: number;
  // passwordEnrollTokenExpirationInDays?: number;
  // ambiguousErrorMessages?: boolean;
  bcryptRounds?: number;
  argon2Enabled?: string | boolean;
  argon2Type?: string;
  argon2TimeCost?: number;
  argon2MemoryCost?: number;
  argon2Parallelism?: number;
  // defaultFieldSelector?: { [key: string]: 0 | 1 };
  // collection?: string;
  // loginTokenExpirationHours?: number;
  // tokenSequenceLength?: number;
  // clientStorage?: 'session' | 'local';
}
export interface AccountsPasswordPackage {
  config: AccountsPasswordConfig;
}

export interface Accounts2faPackage {
  config: null;
}
