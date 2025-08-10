import type { Db as DriverDb, Collection as DriverCollection, FindCursor as DriverCursor } from "mongodb";

import type { Collection, Cursor, DocumentFields, FindOpts, HasId, ObserveCallbacks, ObserveChangesCallbacks, ObserverHandle } from "@cloudydeno/ddp/livedata/types.ts";
import { getRandomStream, type Database } from "@danopia/cosmosaur-server/registry";
import { Subscribable, SubscriptionEvent, symbolSubscribable } from "@danopia/cosmosaur-server/publishable";

// TODO: use KvRealtimeContext (originally from dist-app-deno) to provide actual events

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
  }
  private readonly dbCollection: DriverCollection<DriverDoc>;

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

  async *#eventGenerator(selector: Record<string,unknown>, opts: FindOpts): AsyncGenerator<SubscriptionEvent> {
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
      selector,
      opts,
    );
  }

  insert(): never {
    throw new Error(`Not implemented`);
  }
  async insertAsync(doc: OptionalId<Tdoc>, callback?: (err: null, newId: string) => void): Promise<string> {
    const random = getRandomStream(`/collection/${this.name}`);
    const newId = doc._id ?? random.id();
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

class MongoStorageCursor<Tdoc extends HasId> implements Cursor<Tdoc>, Iterable<Tdoc>, Subscribable {

  constructor(
    private readonly driverCollection: DriverCollection<Record<string, unknown> & {_id: string}>,
    private readonly selector: Record<string, unknown> = {},
    private readonly opts: FindOpts = {},
  ) {
    this.driverCursor = driverCollection.find(selector, {
      projection: opts.fields,
    });
  }
  private readonly driverCursor: DriverCursor<DriverDoc>;

  [symbolSubscribable](): ReadableStream<SubscriptionEvent> {
    // return this.subscribable();
    throw new Error(`subscribing not implemented`);
  }

  async countAsync(applySkipLimit?: boolean): Promise<number> {
    return await this.driverCollection.countDocuments(this.selector, applySkipLimit ? {/*TODO*/} : {});
  }
  async fetchAsync(): Promise<Tdoc[]> {
    return await this.driverCursor.toArray() as Tdoc[];
  }
  async forEachAsync(callback: (doc: Tdoc, index: number, cursor: Cursor<Tdoc>) => void, thisArg?: any): Promise<void> {
    let idx = 0;
    for await (const doc of this) {
      callback.call(thisArg, doc, idx++, this);
    }
  }
  async mapAsync<M>(callback: (doc: Tdoc, index: number, cursor: Cursor<Tdoc>) => M, thisArg?: any): Promise<M[]> {
    const items = await this.fetchAsync();
    return items.map((doc, idx) => callback.call(thisArg, doc, idx, this));
  }
  observeAsync(callbacks: ObserveCallbacks<Tdoc>): Promise<ObserverHandle<Tdoc>> {
    throw new Error("Method 'observeAsync' not implemented.");
  }
  observeChangesAsync(callbacks: ObserveChangesCallbacks<Tdoc>, options?: { nonMutatingCallbacks?: boolean | undefined; }): Promise<ObserverHandle<Tdoc>> {
    throw new Error("Method 'observeChangesAsync' not implemented.");
  }
  [Symbol.asyncIterator](): AsyncIterator<Tdoc> {
    return this.driverCursor[Symbol.asyncIterator]() as AsyncIterator<Tdoc>;
  }

  count(): number {
    throw new Error("Method 'count' not implemented.");
  }
  fetch(): Tdoc[] {
    throw new Error("Method 'fetch' not implemented.");
  }
  forEach(): void {
    throw new Error("Method 'forEach' not implemented.");
  }
  map<M>(): M[] {
    throw new Error("Method 'map' not implemented.");
  }
  observe(): ObserverHandle<Tdoc> {
    throw new Error("Method 'observe' not implemented.");
  }
  observeChanges(): ObserverHandle<Tdoc> {
    throw new Error("Method 'observeChanges' not implemented.");
  }
  [Symbol.iterator](): Iterator<Tdoc> {
    throw new Error("Method 'iterator' not implemented.");
  }
}
