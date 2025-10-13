import type { PublicationHandler, PublishStream } from '@cloudydeno/ddp/server';
import type * as types from '../../shared/meteor-types/meteor.d.ts';
import { MeteorError, MeteorTypedError } from "../../shared/various-api.ts";
import { getInterface, withRandom, withSession } from '../registry.ts';
import type { EJSONableProperty } from '../../shared/meteor-types/ejson.d.ts';
import { isObservableCursor, isSubscribable, type ObservableCursor, type Publishable, type Subscribable, type PublicationEvent, symbolSubscribable } from '../publishable.ts';

export const Meteor: typeof types.Meteor = {

  // DDP
  methods(methods) {
    const iface = getInterface().ddpInterface;
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
    const iface = getInterface().ddpInterface;
    function subscribeTo(item: Subscribable | ObservableCursor<unknown>, signal: AbortSignal): PublishStream {
      if (isSubscribable(item)) {
        return item[symbolSubscribable](signal);
      } else if (isObservableCursor(item)) {
        const pipe = new TransformStream<PublicationEvent>;
        const writer = pipe.writable.getWriter();
        if (!item._getCollectionName) {
          throw new Error(`item._getCollectionName is missing`);
        }
        const collection = item._getCollectionName();
        const observer = item.observeChanges({
          added(id, fields) {
            writer.write({
              msg: 'added',
              collection, id, fields,
            });
          },
          changed(id, fields) {
            writer.write({
              msg: 'changed',
              collection, id, fields,
            });
          },
          removed(id) {
            writer.write({
              msg: 'removed',
              collection, id,
            });
          },
        }, { signal: signal });
        signal.addEventListener('abort', () => {
          observer.stop();
          writer.close();
        });
        return pipe.readable;
      } else {
        throw new Error(`Publication returned non-cursor: ${(item as object).constructor.name ?? item}`);
      }

      // if (item instanceof CollectionQuery) {
      //   const stream = context.collectionDriver.find()
      //   outStreams.push(
      //     renderEventStream(
      //       filterEventStream(stream, entity => item.filters.every(filter => filter({
      //         ...(entity.spec as Record<string,unknown>),
      //         _id: entity.metadata.name,
      //       }))),
      //       item.collectionName,
      //       (x) => x._id,
      //       ({_id, ...rest}) => rest,
      //     ));
      //   continue;
      // }
      // throw new Error(`published weird thing`);
    }
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
    const iface = getInterface().ddpInterface;
    iface.onConnection(cb);
  },

  // makeErrorType: undefined,
  // user: undefined,
  // userAsync: undefined,
  // userId: undefined,
  setInterval: undefined,
  setTimeout: undefined,
  clearInterval: undefined,
  clearTimeout: undefined,
  defer: undefined,
  startup(func: () => void | Promise<void>) {
    getInterface().startupFuncs.push(func);
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
