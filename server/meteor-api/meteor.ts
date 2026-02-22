import type { PublicationHandler, PublishStream } from '@cloudydeno/ddp/server';
import type * as types from '../../shared/meteor-types/meteor.d.ts';
import type * as mongoTypes from '../../shared/meteor-types/mongo.d.ts';
import { MeteorError, MeteorTypedError } from "../../shared/various-api.ts";
import { getBackend, getSession, withRandom, withSession } from '../registry.ts';
import type { EJSONableProperty } from '../../shared/meteor-types/ejson.d.ts';
import { type ObservableCursor, type Publishable, subscribeTo } from '../publishable.ts';
import { MongoCollection } from "meteor/mongo";

export const Meteor: typeof types.Meteor = {

  // DDP
  methods(methods) {
    const iface = getBackend().ddpInterface;
    for (const [name, impl] of Object.entries(methods)) {
      iface.addMethod(name, async (socket, params, random) => {
        const result = await withSession(socket, () =>
          withRandom(random, () =>
            impl.apply({
              connection: socket,
              isSimulation: false,
              userId: socket.userId,
              unblock: () => "TODO",
              setUserId: (userId: string | null) => socket.setUserId(userId),
            }, params)));
        console.log('method', name, 'result:', result);
        return result;
      });
    }
  },

  publish(
    name: string | null,
    impl: (
      this: types.Subscription,
      ...args: EJSONableProperty[]
    ) => void | Publishable | Promise<void | Publishable>
  ) {
    const iface = getBackend().ddpInterface;
    const handler: PublicationHandler = async (sub, params) => {
      try {
        // const context = socketContexts.get(sub.connection);
        // if (!context) throw new Error(`missing socket context`);
        // const result = await CollectionDriverStorage.run(context.collectionDriver, () => impl.apply(sub, params));
        const result = await withSession(sub.connection, () => impl.apply(sub, params));
        // console.log('publish', name, 'result:', result);

        if (result) {
          const items = Array.isArray(result) ? result : [result];
          const outStreams = items.map<PublishStream>(item => subscribeTo(item, sub.signal));
          return outStreams;
        }
      } catch (err) {
        console.error(`Publication ${JSON.stringify(name)} sub crashed:`, err);
      }
    };
    if (name == null) {
      iface.addDefaultPublication(impl.name, handler);
    } else {
      iface.addPublication(name, handler);
    }
  },
  // subscribe: undefined,
  // call: undefined,
  // callAsync: undefined,
  // apply: undefined,
  // applyAsync: undefined,
  // reconnect: undefined,
  // disconnect: undefined,
  // status: undefined,

  onConnection(cb) {
    const iface = getBackend().ddpInterface;
    iface.onConnection(cb);
  },

  makeErrorType(name: string, constructor: Function): types.Meteor.ErrorConstructor {
    const errorClass = class extends Error {
      errorType: string;
      constructor(message: string) {
        super(message);

        // Ensure we get a proper stack trace in most Javascript environments
        if (Error.captureStackTrace) {
          // V8 environments (Chrome and Node.js)
          Error.captureStackTrace(this, errorClass);
        } else {
          // Borrow the .stack property of a native Error object.
          this.stack = new Error().stack;
        }
        // Safari magically works.

        constructor.apply(this, arguments);

        this.errorType = name;
      };
    };

    return errorClass as unknown as types.Meteor.ErrorConstructor;
  },

  // user: undefined,
  // userAsync: undefined,
  userId: () => getSession()?.userId ?? null,
  setInterval: undefined,
  setTimeout: undefined,
  clearInterval: undefined,
  clearTimeout: undefined,
  defer: cb => setTimeout(cb, 1),
  startup(func: () => void | Promise<void>) {
    getBackend().startupFuncs.push(func);
  },
  // wrapAsync: undefined,
  // bindEnvironment: undefined,

  isClient: false,
  isCordova: false,
  isServer: true,
  isProduction: true,
  isDevelopment: false,
  isModern: true,
  isTest: false,
  isAppTest: false,
  isPackageTest: false,
  // gitCommitHash: undefined,

  // _debug: undefined,

  // release: '',
  // meteorRelease: '',
  // settings: undefined,
  // users: undefined,
  Error: MeteorError,
  TypedError: MeteorTypedError,
  // absoluteUrl: {
  //   defaultOptions: undefined
  // },
  // EnvironmentVariable: undefined,

  // Auth
  // loginWithMeteorDeveloperAccount: undefined,
  // loginWithFacebook: undefined,
  // loginWithGithub: undefined,
  // loginWithGoogle: undefined,
  // loginWithMeetup: undefined,
  // loginWithTwitter: undefined,
  // loginWithWeibo: undefined,
  // loginWithPassword: undefined,
  // loginWithToken: undefined,
  // loggingIn: undefined,
  // loggingOut: undefined,
  // logout: undefined,
  // logoutOtherClients: undefined,

  _noYieldsAllowed(f) {
    const result = f();
    if (Meteor._isPromise(result)) {
      throw new Error("function is a promise when calling Meteor._noYieldsAllowed");
    }
    return result
  },
  _isPromise(r: unknown): boolean {
    return r ? typeof (r as Promise<unknown>).then === 'function' : false;
  },

} satisfies Partial<typeof types.Meteor> as unknown as typeof types.Meteor;



// import { type ApiKindEntity } from "jsr:@dist-app/stdlib@0.1.5/engine/types";
// import { emitToSub, renderEventStream, filterEventStream } from "jsr:@dist-app/stdlib@0.1.5/ddp/server/livedata";
// import { type ServerSentPacket, type DocumentFields } from "jsr:@dist-app/stdlib@0.1.5/ddp/types";

// import { DistInterface, getEngineOrThrow, EngineStorage, CollectionQuery, CollectionEntityApiMapping, RandomStorage } from "./registry.ts";

// class MeteorObject {

//   methods(methodMap: Record<string, (...args: unknown[]) => unknown>) {
//     for (const [name, handler] of Object.entries(methodMap)) {
//       DistInterface.addMethod(name, async (socket, params, random) => {

//         const engine = getEngineOrThrow(socket);
//         const result = await EngineStorage.run(engine, () =>
//           RandomStorage.run(random, () => handler.apply(null, params)));
//         console.log('method', name, 'result:', result);
//         return result;
//         // const choresApi = new ChoreListApi(engine);
//       });
//     }
//   };
//   publish(name: string, handler: (...args: unknown[]) => unknown) {
//     // console.log(`TODO: Meteor.publish`, args);

//   };
// }

// export const Meteor = {

// }
