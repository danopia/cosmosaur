import type { Db as DriverDb, Collection as DriverCollection, FindCursor as DriverCursor, ChangeStream, ChangeStreamDocument } from "mongodb";
import type { Collection, Cursor, DocumentFields, FindOpts, HasId, ObserveCallbacks, ObserveChangesCallbacks, ObserverHandle } from "@cloudydeno/ddp/livedata/types.ts";

import { getRandomStream, type Database } from "../registry.ts";
import {
  type PublicationEvent,
  type PublishStream,
  type Subscribable,
  symbolSubscribable,
} from "../publishable.ts";
import { AsyncStorageCursor } from "./async-base.ts";

type DriverWatcher = ChangeStream<DriverDoc, ChangeStreamDocument<DriverDoc>>;

export class MongoStorageDatabase implements Database {
  constructor(
    private readonly dbClient: DriverDb,
  ) {}
  #collectionMap = new Map<string, MongoStorageCollection<HasId>>();
  newCollection<Tdoc extends HasId>(name: string): Collection<Tdoc> {
    if (this.#collectionMap.has(name)) throw new Error(`Collection ${name} already defined`);
    const coll = new MongoStorageCollection<Tdoc>(this.dbClient, name);
    this.#collectionMap.set(name, coll);
    return coll;
  }
  getCollection<Tdoc extends HasId>(name: string): Collection<Tdoc> | null {
    const coll = this.#collectionMap.get(name);
    if (!coll) throw new Error(`Collection ${name} not defined`);
    return coll as MongoStorageCollection<Tdoc>;
  }
}

type OptionalId<T extends Record<string,unknown>> = T & { _id?: string };
type DriverDoc = Record<string, unknown> & {_id: string};

export class MongoStorageCollection<Tdoc extends HasId> implements Collection<Tdoc> {

  constructor(
    /*private readonly*/ dbClient: DriverDb,
    private readonly name: string,
  ) {
    this.dbCollection = dbClient.collection(name);
    this.dbWatcher = this.dbCollection.watch();
  }
  private readonly dbCollection: DriverCollection<DriverDoc>;
  private readonly dbWatcher: DriverWatcher;

  // async *#findGenerator(selector: Record<string,unknown>, opts: FindOpts): AsyncGenerator<Tdoc> {
  //   this.dbCollection.find()
  //   const siftFunc = sift(selector);
  //   // if (opts.sort) throw new Error(`TODO: find sorting`);
  //   for await (const doc of this.kv.list({
  //     prefix: [...this.prefix, 'coll', this.name, 'docs'],
  //   })) {
  //     const fields = doc.value as Tdoc;
  //     if (siftFunc(fields)) {
  //       yield makeReturnDoc<Tdoc>(fields, opts);
  //     }
  //   }
  // }

  async *#eventGenerator(selector: Record<string,unknown>, opts: FindOpts): AsyncGenerator<PublicationEvent> {
    // TODO: use a kv realtime system to manage emitting events
    for await (const {_id, ...fields} of this.find(selector, opts)) {
      yield {
        collection: this.name,
        id: _id,
        msg: 'added',
        fields: fields as DocumentFields,
      };
    }
    yield {
      msg: 'ready',
    };
  }

  findOne(): never {
    throw new Error("Method 'findOne' not implemented.");
  }
  async findOneAsync(selector: Record<string, unknown> = {}, opts: FindOpts = {}): Promise<Tdoc | null> {
    const doc = await this.dbCollection.findOne(selector, { projection: opts.fields });
    return doc as Tdoc | null;
  }

  find(selector: Record<string, unknown> = {}, opts: FindOpts = {}): Cursor<Tdoc> {
    return new MongoStorageCursor(
      this.dbCollection,
      this.dbWatcher,
      selector,
      opts,
    );
  }

  insert(): never {
    throw new Error(`Not implemented`);
  }
  async insertAsync(doc: OptionalId<Tdoc>, callback?: (err: null, newId: string) => void): Promise<string> {
    const random = getRandomStream(`/collection/${this.name}`);
    const newId: string = doc._id ?? random.id();
    const result = await this.dbCollection.insertOne({
      ...doc,
      _id: newId,
    });
    if (!result.acknowledged) throw new Error(
      `Document insert was not acknowledged`); // TODO: not sure when this would happen
    callback?.(null, newId);
    return newId;
  }

  // remove(
  //   selector: Selector<Tdoc> | string,
  //   callback?: Function
  // ): number {}
  // removeAsync(
  //   selector: Selector<Tdoc> | string,
  //   callback?: Function
  // ): Promise<number> {}

  // update(
  //   selector: Selector<Tdoc> | string,
  //   modifier: Modifier<Tdoc>,
  //   options?: {
  //     multi?: boolean | undefined;
  //     upsert?: boolean | undefined;
  //     arrayFilters?: { [identifier: string]: any }[] | undefined;
  //   },
  //   callback?: Function
  // ): number {}
  // updateAsync(
  //   selector: Selector<Tdoc> | string,
  //   modifier: Modifier<Tdoc>,
  //   options?: {
  //     multi?: boolean | undefined;
  //     upsert?: boolean | undefined;
  //     arrayFilters?: { [identifier: string]: any }[] | undefined;
  //   },
  //   callback?: Function
  // ): Promise<number> {}

  // upsert(
  //   selector: Selector<Tdoc> | string,
  //   modifier: Modifier<Tdoc>,
  //   options?: {
  //     multi?: boolean | undefined;
  //   },
  //   callback?: Function
  // ): {
  //   numberAffected?: number | undefined;
  //   insertedId?: string | undefined;
  // } {}
  // upsertAsync(
  //   selector: Selector<Tdoc> | string,
  //   modifier: Modifier<Tdoc>,
  //   options?: {
  //     multi?: boolean | undefined;
  //   },
  //   callback?: Function
  // ): Promise<{
  //   numberAffected?: number | undefined;
  //   insertedId?: string | undefined;
  // }>{}
}

async function* listAndWatch(
  collection: string,
  cursor: MongoStorageCursor<HasId>,
  watcher: DriverWatcher,
  signal: AbortSignal,
): AsyncGenerator<PublicationEvent> {
  const watcherPipe = new TransformStream<ChangeStreamDocument<DriverDoc>,ChangeStreamDocument<DriverDoc>>();
  const watcherWriter = watcherPipe.writable.getWriter();
  const writeChange = watcherWriter.write.bind(watcherWriter);
  watcher.on('change', writeChange);
  signal.addEventListener('abort', () => {
  // using _ = {[Symbol.dispose]: () => {
    console.log('listAndWatch abort');
    watcher.off('change', writeChange);
    watcherWriter.close();
  });

  for await (const {_id, ...fields} of cursor) {
    yield {
      collection,
      msg: 'added',
      id: _id,
      fields: fields as DocumentFields,
    };
  }
  yield {
    msg: 'ready',
  };

  for await (const change of watcherPipe.readable) {
    if (change.operationType == 'insert') {
      const {_id, ...fields} = change.fullDocument
      yield {
        collection,
        msg: 'added',
        id: _id,
        fields: fields as DocumentFields,
      };
    } else if (change.operationType == 'delete') {
      yield {
        collection,
        msg: 'removed',
        id: change.documentKey._id,
      };
    }
  }
}

class MongoStorageCursor<Tdoc extends HasId> extends AsyncStorageCursor<Tdoc> implements Cursor<Tdoc>, Iterable<Tdoc>, Subscribable {

  constructor(
    private readonly driverCollection: DriverCollection<Record<string, unknown> & {_id: string}>,
    private readonly driverWatcher: DriverWatcher,
    private readonly selector: Record<string, unknown> = {},
    private readonly opts: FindOpts = {},
  ) {
    const driverCursor = driverCollection.find(selector, {
      projection: opts.fields,
    });
    super(() => driverCursor[Symbol.asyncIterator]() as AsyncGenerator<Tdoc>);
    // this.driverCursor = driverCursor;
  }
  // private readonly driverCursor: DriverCursor<DriverDoc>;

  [symbolSubscribable](signal: AbortSignal): PublishStream {
    // const listener = this.driverCollection.watch();
    return ReadableStream.from<PublicationEvent>(
      listAndWatch(this.driverCollection.collectionName, this, this.driverWatcher, signal));
  }

  // Optimize count function to use server-side counting:
  override async countAsync(applySkipLimit?: boolean): Promise<number> {
    return await this.driverCollection.countDocuments(this.selector, applySkipLimit ? {/*TODO*/} : {});
  }

  override observeAsync(
    _callbacks: ObserveCallbacks<Tdoc>,
  ): Promise<ObserverHandle<Tdoc>> {
    throw new Error("Method 'observeAsync' not implemented.");
  }
  override observeChangesAsync(
    _callbacks: ObserveChangesCallbacks<Tdoc>,
    _options?: {
      nonMutatingCallbacks?: boolean | undefined;
    },
  ): Promise<ObserverHandle<Tdoc>> {
    throw new Error("Method 'observeChangesAsync' not implemented.");
  }
}
