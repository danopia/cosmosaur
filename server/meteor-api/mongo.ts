import type { HasId, OptionalId, PartialCursorApi } from "@cloudydeno/ddp/livedata/types.ts";
import { Collection, Cursor } from "@cloudydeno/ddp/livedata/facades.ts";
import { AnonymousCollection } from "@cloudydeno/ddp/livedata/collections/anonymous.ts";

import { getDatabase, getRandomStream } from "../registry.ts";
import { isSubscribable, type PublishStream, symbolSubscribable } from "../publishable.ts";

// https://github.com/meteor/meteor/blob/4b61fbf9b1e2364e0b6ab99fd67e2b82cf673a94/packages/mongo/mongo.d.ts#L62
interface CollectionProps {
  // /**
  //  * The server connection that will manage this collection. Uses the default connection if not specified. Pass the return value of calling `DDP.connect` to specify a different
  //  * server. Pass `null` to specify no connection. Unmanaged (`name` is null) collections cannot specify a connection.
  //  */
  // connection?: DDP.DDPStatic | null;
  /** The method of generating the `_id` fields of new documents in this collection.  Possible values:
   * - **`'STRING'`**: random strings
   * - **`'MONGO'`**:  random [`Mongo.ObjectID`](#mongo_object_id) values
   *
   * The default id generation technique is `'STRING'`.
   */
  idGeneration?: 'STRING' /*| 'MONGO'*/;
  // /**
  //  * An optional transformation function. Documents will be passed through this function before being returned from `fetch` or `findOne`, and before being passed to callbacks of
  //  * `observe`, `map`, `forEach`, `allow`, and `deny`. Transforms are *not* applied for the callbacks of `observeChanges` or to cursors returned from publish functions.
  //  */
  // transform?: (doc: T) => U;
  /** Set to `false` to skip setting up the mutation methods that enable insert/update/remove from client code. Default `true`. */
  defineMutationMethods?: boolean;
}

class MongoCollection<T extends HasId> extends Collection<T> {
  constructor(name: string | null | undefined, opts: CollectionProps = {}) {
    if (name) {
      const database = getDatabase();
      if (!database) throw new Error(`No Database is registered`);
      const coll = database.newCollection<T>(name);
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
      if (opts.defineMutationMethods != false) {
        // TODO: register methods
      }
      return;
    }
    const anonColl = new AnonymousCollection();
    super(anonColl.getApi<T>());
  }
  // Not currently implemented due to shared namespacing
  static getCollection(_name: string): MongoCollection<HasId> | null {
    throw new Error(`getCollection is not currently implemented due to its implied global namespace`);
  //   const database = getDatabase();
  //   if (!database) throw new Error(`No Database is registered`);
  //   const coll = database.getCollection(name);
  //   if (!coll) throw new Error(`No Database is registered`);
  //   return new super(coll);
  }

  // Synchronize IDs of inserted documents via DDP shared seed system
  // This isn't quite right - insert id sync is supposed to be for local simulation/prediction
  // Oh well.
  private withRandomId(doc: OptionalId<T>): T {
    const collRandom = getRandomStream('/collection/' + this);
    return {
      ...doc,
      _id: collRandom.id(),
    } as T;
  }
  override insert(doc: OptionalId<T>): string {
    return super.insert(doc._id ? doc : this.withRandomId(doc));
  }
  override insertAsync(doc: OptionalId<T>): Promise<string> {
    return super.insertAsync(doc._id ? doc : this.withRandomId(doc));
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
