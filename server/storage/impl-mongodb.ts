import type {
  Db as DriverDb,
  Collection as DriverCollection,
  FindCursor as DriverCursor,
  ChangeStream,
  ChangeStreamDocument,
} from "mongodb";
import sift from "sift";

import type {
AsyncCollection,
  DocumentFields,
  FindOpts,
  HasId,
  ObserveCallbacks,
  ObserveChangesCallbacks,
  ObserverHandle,
  PartialCollectionApi,
  PartialCursorApi,
  UpdateOpts,
  UpsertOpts,
  UpsertResult,
} from "@cloudydeno/ddp/livedata/types.ts";

import { getRandomStream, type Database } from "../registry.ts";
import {
  type PublicationEvent,
  type PublishStream,
  type Subscribable,
  symbolSubscribable,
} from "../publishable.ts";

type DriverWatcher = ChangeStream<DriverDoc, ChangeStreamDocument<DriverDoc>>;

export class MongoStorageDatabase implements Database {
  constructor(
    private readonly dbClient: DriverDb,
  ) {}
  #collectionMap = new Map<string, MongoStorageCollection<HasId>>();
  newCollection<Tdoc extends HasId>(name: string): PartialCollectionApi<Tdoc> {
    if (this.#collectionMap.has(name)) throw new Error(`Collection ${name} already defined`);
    const coll = new MongoStorageCollection<Tdoc>(this.dbClient, name);
    this.#collectionMap.set(name, coll);
    return coll;
  }
  getCollection<Tdoc extends HasId>(name: string): PartialCollectionApi<Tdoc> | null {
    const coll = this.#collectionMap.get(name);
    if (!coll) throw new Error(`Collection ${name} not defined`);
    return coll as MongoStorageCollection<Tdoc>;
  }
}

type OptionalId<T extends Record<string,unknown>> = T & { _id?: string };
type DriverDoc = Record<string, unknown> & {_id: string};

export class MongoStorageCollection<Tdoc extends HasId> implements AsyncCollection<Tdoc> {

  constructor(
    /*private readonly*/ dbClient: DriverDb,
    private readonly name: string,
  ) {
    this.dbCollection = dbClient.collection(name);
    this.dbWatcher = this.dbCollection.watch([], {
      fullDocument: 'updateLookup',
    });
  }
  get collectionName(): string | null {
    throw new Error("Method not implemented.");
  }
  private readonly dbCollection: DriverCollection<DriverDoc>;
  private readonly dbWatcher: DriverWatcher;

  async findOneAsync(selector: Record<string, unknown> = {}, opts: FindOpts = {}): Promise<Tdoc | null> {
    const doc = await this.dbCollection.findOne(selector, { projection: opts.fields });
    return doc as Tdoc | null;
  }

  find(selector: Record<string, unknown> = {}, opts: FindOpts = {}): MongoStorageCursor<Tdoc> {
    return new MongoStorageCursor(
      this.dbCollection,
      this.dbWatcher,
      selector,
      opts,
    );
  }

  async insertAsync(doc: OptionalId<Tdoc>): Promise<string> {
    const random = getRandomStream(`/collection/${this.name}`);
    const newId: string = doc._id ?? random.id();

    const result = await this.dbCollection.insertOne({
      ...doc,
      _id: newId,
    });
    if (!result.acknowledged) throw new Error(
      `Document insert was not acknowledged`); // TODO: not sure when this would happen

    return newId;
  }

  async updateAsync(selector: Record<string, unknown>, modifier: Record<string, unknown>, options?: UpdateOpts): Promise<number> {
    const result = options?.multi
      ? await this.dbCollection.updateMany(selector, modifier, { upsert: options.upsert })
      : await this.dbCollection.updateOne(selector, modifier, { upsert: options?.upsert });
    if (!result.acknowledged) throw new Error(
      `Document update was not acknowledged`); // TODO: not sure when this would happen
    return result.modifiedCount; // TODO: correct?
  }
  async upsertAsync(selector: Record<string, unknown>, modifier: Record<string, unknown>, options?: UpsertOpts): Promise<UpsertResult> {
    const result = options?.multi
      ? await this.dbCollection.updateMany(selector, modifier, { upsert: true })
      : await this.dbCollection.updateOne(selector, modifier, { upsert: true });
    if (!result.acknowledged) throw new Error(
      `Document upsert was not acknowledged`); // TODO: not sure when this would happen
    return {
      numberAffected: result.upsertedCount,
      insertedId: result.upsertedId ?? void 0,
    };
  }
  async removeAsync(selector: Record<string, unknown>): Promise<number> {
    if (!selector) return 0;
    const result = await this.dbCollection.deleteMany(selector);
    if (!result) throw new Error(
      `Document delete was not acknowledged`); // TODO: not sure when this would happen
    return result.deletedCount;
  }
}

class MongoStorageCursor<Tdoc extends HasId> implements PartialCursorApi<Tdoc>, AsyncIterable<Tdoc>, Subscribable {
  constructor(
    private readonly driverCollection: DriverCollection<Record<string, unknown> & {_id: string}>,
    public readonly driverWatcher: DriverWatcher,
    public readonly selector: Record<string, unknown> = {},
    public readonly opts: FindOpts = {},
  ) {
    this.driverCursor = driverCollection.find(selector, {
      projection: opts.fields,
    }) as DriverCursor<Tdoc>;
    // super(() => driverCursor[Symbol.asyncIterator]() as AsyncGenerator<Tdoc>);
    // this.driverCursor = driverCursor;
  }
  private readonly driverCursor: DriverCursor<Tdoc>;

  [Symbol.asyncIterator](): AsyncGenerator<Tdoc> {
    return this.driverCursor[Symbol.asyncIterator]();
  }

  [symbolSubscribable](signal: AbortSignal): PublishStream {
    // const listener = this.driverCollection.watch();
    return ReadableStream.from<PublicationEvent>(
      listAndWatch(this.driverCollection.collectionName, this, signal));
  }

  // Optimize count function to use server-side counting:
  async countAsync(applySkipLimit?: boolean): Promise<number> {
    return await this.driverCollection.countDocuments(this.selector, applySkipLimit ? {/*TODO*/} : {});
  }

  observeAsync(
    _callbacks: ObserveCallbacks<Tdoc>,
  ): Promise<ObserverHandle> {
    throw new Error("Method 'observeAsync' not implemented.");
  }
  observeChangesAsync(
    _callbacks: ObserveChangesCallbacks<Tdoc>,
    _options?: {
      nonMutatingCallbacks?: boolean | undefined;
    },
  ): Promise<ObserverHandle> {
    throw new Error("Method 'observeChangesAsync' not implemented.");
  }
}

async function* listAndWatch(
  collection: string,
  cursor: MongoStorageCursor<HasId>,
  // watcher: DriverWatcher,
  signal: AbortSignal,
): AsyncGenerator<PublicationEvent> {
  const watcherPipe = new TransformStream<ChangeStreamDocument<DriverDoc>,ChangeStreamDocument<DriverDoc>>();
  const watcherWriter = watcherPipe.writable.getWriter();
  const writeChange = watcherWriter.write.bind(watcherWriter);
  cursor.driverWatcher.on('change', writeChange);
  signal.addEventListener('abort', () => {
  // using _ = {[Symbol.dispose]: () => {
    console.log('listAndWatch abort');
    cursor.driverWatcher.off('change', writeChange);
    watcherWriter.close();
  });

  const presentedIds = new Set<string>;
  const siftFunc = sift.default(cursor.selector);

  for await (const {_id, ...fields} of cursor) {
    yield {
      collection,
      msg: 'added',
      id: _id,
      fields: fields as DocumentFields,
    };
    presentedIds.add(_id);
  }
  yield {
    msg: 'ready',
  };

  for await (const change of watcherPipe.readable) {
    if (change.operationType == 'insert') {
      if (!siftFunc(change.fullDocument)) continue;
      const {_id, ...fields} = change.fullDocument;
      yield {
        collection,
        msg: 'added',
        id: _id,
        fields: fields as DocumentFields,
      };
      presentedIds.add(_id);
    } else if (change.operationType == 'update') {
      if (!change.fullDocument) throw new Error(`update operator lacks fullDocument`);
      const {_id, ...fields} = change.fullDocument;
      const presentedBefore = presentedIds.has(_id);
      const presentedAfter = siftFunc(change.fullDocument);
      if (!presentedBefore && !presentedAfter) continue;
      if (presentedBefore && presentedAfter) {
        yield {
          collection,
          msg: 'changed',
          id: _id,
          fields: fields as DocumentFields,
        };
        presentedIds.add(_id);
      }
      if (presentedBefore) {
        yield {
          collection,
          msg: 'removed',
          id: _id,
        };
        presentedIds.delete(_id);
      } else {
        yield {
          collection,
          msg: 'added',
          id: _id,
          fields: fields as DocumentFields,
        };
        presentedIds.add(_id);
      }
    } else if (change.operationType == 'delete') {
      if (!presentedIds.has(change.documentKey._id)) continue;
      yield {
        collection,
        msg: 'removed',
        id: change.documentKey._id,
      };
      presentedIds.delete(change.documentKey._id);
    } else {
      console.log('TODO: Unsupported mongodb operationType', change.operationType);
    }
  }
}
