import type { HasId, OptionalId, PartialCursorApi } from "@cloudydeno/ddp/livedata/types.ts";
import { Collection, Cursor } from "@cloudydeno/ddp/livedata/facades.ts";
import { AnonymousCollection } from "@cloudydeno/ddp/livedata/collections/anonymous.ts";

import { getBackend, getRandomStream } from "../registry.ts";
import { isSubscribable, type PublishStream, symbolSubscribable } from "../publishable.ts";

// https://github.com/meteor/meteor/blob/4b61fbf9b1e2364e0b6ab99fd67e2b82cf673a94/packages/mongo/mongo.d.ts#L62
interface CollectionProps {
  // /**
  //  * The server connection that will manage this collection. Uses the default connection if not specified. Pass the return value of calling `DDP.connect` to specify a different
  //  * server. Pass `null` to specify no connection. Unmanaged (`name` is null) collections cannot specify a connection.
  //  */
  // TODO: connection?: DdpClient;
  /** The method of generating the `_id` fields of new documents in this collection.  Possible values:
   * - **`'STRING'`**: random strings
   * - **`'MONGO'`**:  random [`Mongo.ObjectID`](#mongo_object_id) values
   *
   * The default id generation technique is `'STRING'`.
   */
  idGeneration?: 'STRING' /*| 'MONGO'*/;
  // idGenerator?: () => string;
  // /**
  //  * An optional transformation function. Documents will be passed through this function before being returned from `fetch` or `findOne`, and before being passed to callbacks of
  //  * `observe`, `map`, `forEach`, `allow`, and `deny`. Transforms are *not* applied for the callbacks of `observeChanges` or to cursors returned from publish functions.
  //  */
  // transform?: (doc: T) => U;
  /** Set to `false` to skip setting up the mutation methods that enable insert/update/remove from client code. Default `true`. */
  defineMutationMethods?: boolean;
}

export class MongoCollection<T extends HasId> extends Collection<T> {
  constructor(name: string | null | undefined, opts: CollectionProps = {}) {
    if (name) {
      const backend = getBackend();
      if (backend.namedCollections.has(name)) {
        throw new Error(`Double definition of collection "${name}"`);
      }
      const coll = backend.database.newCollection<T>(name);
      super(coll, class MongoCursor<T extends HasId> extends Cursor<T> {
        constructor(backingApi: PartialCursorApi<T>) {
          super(backingApi);
          if (isSubscribable(backingApi)) {
            this[symbolSubscribable] = backingApi[symbolSubscribable].bind(backingApi);
          }
        }
        _getCollectionName(): string {
          return name;
        }
        [symbolSubscribable]: undefined | ((signal: AbortSignal) => PublishStream);
      });
      backend.namedCollections.set(name, this);
      if (opts.defineMutationMethods != false) {
        // TODO: register methods
        backend.ddpInterface.addMethod(`/${name}/insert`, (_session, _params) => {
          throw new Error(`TODO: automatic insert method`);
        });
        backend.ddpInterface.addMethod(`/${name}/update`, (_session, _params) => {
          throw new Error(`TODO: automatic update method`);
        });
        backend.ddpInterface.addMethod(`/${name}/remove`, (_session, _params) => {
          throw new Error(`TODO: automatic remove method`);
        });
      }
      return;
    }
    const anonColl = new AnonymousCollection();
    super(anonColl.getApi<T>());
  }
  static getCollection<Tdoc extends HasId>(name: string): MongoCollection<Tdoc> | null {
    const backend = getBackend();
    const coll = backend.namedCollections.get(name);
    if (!coll) throw new Error(`Collection "${name}" is not registered yet`);
    return coll as MongoCollection<Tdoc>;
  }
  static ensureCollection<Tdoc extends HasId>(name: string): MongoCollection<Tdoc> {
    const backend = getBackend();
    const coll = backend.namedCollections.get(name);
    if (coll) return coll as MongoCollection<Tdoc>;
    return new this(name);
  }

  override insert(doc: OptionalId<T>): string {
    return super.insert(doc);
  }
  override insertAsync(doc: OptionalId<T>): Promise<string> {
    return super.insertAsync(doc);
  }
}

export const Mongo: {
  Collection: {
    new<T extends HasId>(name?: string | null): Collection<T>;
  };
  Cursor: typeof Cursor;
} = {

  Collection: MongoCollection,

  // setConnectionOptions: undefined,

  Cursor: Cursor,

  // ObjectID: undefined,

}
