// import {sift} from "npm:sift";
import sift from "https://esm.sh/sift@17.1.3";

import type { Collection, Cursor, DocumentFields, FindOpts, HasId, ObserveCallbacks, ObserveChangesCallbacks, ObserverHandle } from "@cloudydeno/ddp/livedata/types.ts";
import { getRandom, getRandomStream, withRandom, type Database } from "@danopia/cosmosaur-server/registry";
import { Random, RandomStream } from "@cloudydeno/ddp/random";
import { Subscribable, SubscriptionEvent, symbolSubscribable } from "@danopia/cosmosaur-server/publishable";

// TODO: use KvRealtimeContext (originally from dist-app-deno) to provide actual events

export class KvDocDatabase implements Database {
  constructor(
    private readonly kv: Deno.Kv,
    private readonly prefix: Deno.KvKeyPart[],
  ) {}
  #collectionMap = new Map<string, KvDocCollection<HasId>>();
  newCollection<Tdoc extends HasId>(name: string): Collection<Tdoc> {
    if (this.#collectionMap.has(name)) throw new Error(`Collection ${name} already defined`);
    const coll = new KvDocCollection<Tdoc>(this.kv, this.prefix, name);
    this.#collectionMap.set(name, coll);
    return coll;
  }
  getCollection<Tdoc extends HasId>(name: string): Collection<Tdoc> | null {
    const coll = this.#collectionMap.get(name);
    if (!coll) throw new Error(`Collection ${name} not defined`);
    return coll as KvDocCollection<Tdoc>;
  }
}

type OptionalId<T extends Record<string,unknown>> = T & { _id?: string };

export class KvDocCollection<Tdoc extends HasId> implements Collection<Tdoc> {

  constructor(
    private readonly kv: Deno.Kv,
    private readonly prefix: Deno.KvKeyPart[],
    private readonly name: string,
  ) {}

  async *#findGenerator(selector: Record<string,unknown>, opts: FindOpts): AsyncGenerator<Tdoc> {
    const siftFunc = sift(selector);
    // if (opts.sort) throw new Error(`TODO: find sorting`);
    for await (const doc of this.kv.list({
      prefix: [...this.prefix, 'coll', this.name, 'docs'],
    })) {
      const fields = doc.value as Tdoc;
      if (siftFunc(fields)) {
        yield makeReturnDoc<Tdoc>(fields, opts);
      }
    }
  }

  async *#eventGenerator(selector: Record<string,unknown>, opts: FindOpts): AsyncGenerator<SubscriptionEvent> {
    // TODO: use a kv realtime system to manage emitting events
    for await (const {_id, ...fields} of this.#findGenerator(selector, opts)) {
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
    for await (const doc of this.#findGenerator(selector, opts)) {
      return doc;
    }
    return null;
  }

  find(selector: Record<string, unknown> = {}, opts: FindOpts = {}): Cursor<Tdoc> {
    return new KvDocCursor(
      () => this.#findGenerator(selector, opts),
      () => ReadableStream.from(this.#eventGenerator(selector, opts)),
    );
  }

  insert(): never {
    throw new Error(`Not implemented`);
  }
  async insertAsync(doc: OptionalId<Tdoc>, callback?: Function): Promise<string> {
    const random = getRandomStream(`/collection/${this.name}`);
    const newId = doc._id ?? random.id();
    const key = [...this.prefix, 'coll', this.name, 'docs', newId];
    const result = await this.kv
      .atomic()
      .check({
        key,
        versionstamp: null,
      })
      .set(key, {
        ...doc,
        _id: newId,
      })
      .commit();
    if (!result.ok) throw new Error(
      `Document _id ${JSON.stringify(newId)} already exists in ${JSON.stringify(this.name)}`);
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

/** Clones a document using the 'fields' subset. */
export function makeReturnDoc<Tdoc extends HasId>(original: Tdoc, opts: FindOpts): Tdoc {
  // const cloned = EJSON.clone(original);

  const fieldsSpec = (opts?.fields ?? {}) as Record<keyof Tdoc, boolean|undefined>;
  const subset: Partial<Tdoc> = {};
  let includeOthers = true;
  for (const pair of Object.entries(fieldsSpec)) {
    if (pair[1] === true) {
      includeOthers = false;
      if (pair[0] in original) {
        subset[pair[0] as keyof Tdoc] = structuredClone(original[pair[0] as keyof Tdoc]);
      }
    }
  }
  if (includeOthers) {
    for (const pair of Object.entries<unknown>(original)) {
      if (pair[0] in fieldsSpec) continue;
      subset[pair[0] as keyof Tdoc] = structuredClone(pair[1]) as Tdoc[keyof Tdoc];
    }
    if (!('_id' in fieldsSpec)) {
      subset['_id'] = original['_id'];
    }
  }
  return subset as Tdoc; // TODO: this is a lie once fields is supplied
}

class KvDocCursor<Tdoc extends HasId> implements Cursor<Tdoc>, Iterable<Tdoc>, Subscribable {

  constructor(
    private readonly findGenerator: () => AsyncGenerator<Tdoc>,
    private readonly subscribable: () => ReadableStream<SubscriptionEvent>,
  ) {}

  [symbolSubscribable](): ReadableStream<SubscriptionEvent> {
    return this.subscribable();
  }

  async countAsync(applySkipLimit?: boolean): Promise<number> {
    let count = 0;
    for await (const _ of this.findGenerator()) {
      count++;
    }
    return count;
  }
  async fetchAsync(): Promise<Tdoc[]> {
    return await Array.fromAsync(this);
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
    return this.findGenerator();
  }

  // sync API not available for this async storage
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

// export const kvCollectionFactory: CollectionFactory = {}
