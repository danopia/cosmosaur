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

// TODO: use KvRealtimeContext (originally from dist-app-deno) to provide actual events

export class KvDocDatabase implements Database {
  constructor(
    private readonly kv: Deno.Kv,
    private readonly prefix: Deno.KvKeyPart[],
  ) {}
  #collectionMap = new Map<string, KvDocCollection<HasId>>();
  newCollection<Tdoc extends HasId>(name: string): PartialCollectionApi<Tdoc> {
    if (this.#collectionMap.has(name)) throw new Error(`Collection ${name} already defined`);
    const coll = new KvDocCollection<Tdoc>(this.kv, this.prefix, name);
    this.#collectionMap.set(name, coll);
    return coll;
  }
  getCollection<Tdoc extends HasId>(name: string): PartialCollectionApi<Tdoc> | null {
    const coll = this.#collectionMap.get(name);
    if (!coll) throw new Error(`Collection ${name} not defined`);
    return coll as KvDocCollection<Tdoc>;
  }
}

type OptionalId<T extends Record<string,unknown>> = T & { _id?: string };

export class KvDocCollection<Tdoc extends HasId> implements AsyncCollection<Tdoc> {

  constructor(
    private readonly kv: Deno.Kv,
    private readonly prefix: Deno.KvKeyPart[],
    private readonly name: string,
  ) {}
  get collectionName(): string | null {
    return this.name;
  }

  async *#findGenerator(selector: Record<string,unknown>, opts: FindOpts): AsyncGenerator<Tdoc> {
    const siftFunc = sift.default(selector);
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

  async *#eventGenerator(selector: Record<string,unknown>, opts: FindOpts, signal: AbortSignal): AsyncGenerator<PublicationEvent> {
    // TODO: use a kv realtime system to manage emitting events
    for await (const {_id, ...fields} of this.#findGenerator(selector, opts)) {
      yield {
        collection: this.name,
        id: _id,
        msg: 'added',
        fields: fields as DocumentFields,
      };
    }
    signal.throwIfAborted();
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

  find(selector: Record<string, unknown> = {}, opts: FindOpts = {}): PartialCursorApi<Tdoc> {
    return new KvDocCursor(
      () => this.#findGenerator(selector, opts),
      (signal: AbortSignal) => ReadableStream.from(this.#eventGenerator(selector, opts, signal)),
    );
  }

  async insertAsync(doc: OptionalId<Tdoc>): Promise<string> {
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
    return newId;
  }

  updateAsync(
    _selector: Record<string, unknown>,
    _modifier: Record<string, unknown>,
    _options?: UpdateOpts,
  ): Promise<number> {
    throw new Error("TODO: Method 'updateAsync' not implemented.");
  }

  upsertAsync(
    _selector: Record<string, unknown>,
    _modifier: Record<string, unknown>,
    _options?: UpsertOpts,
  ): Promise<UpsertResult> {
    throw new Error("TODO: Method 'upsertAsync' not implemented.");
  }

  removeAsync(
    _selector: Record<string, unknown>,
  ): Promise<number> {
    throw new Error("TODO: Method 'removeAsync' not implemented.");
  }
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

class KvDocCursor<Tdoc extends HasId> implements PartialCursorApi<Tdoc>, AsyncIterable<Tdoc>, Subscribable {

  constructor(
    private readonly findGenerator: () => AsyncGenerator<Tdoc>,
    private readonly subscribable: (signal: AbortSignal) => PublishStream,
  ) {
  }

  [Symbol.asyncIterator](): AsyncIterator<Tdoc> {
    return this.findGenerator();
  }

  [symbolSubscribable](signal: AbortSignal): PublishStream {
    return this.subscribable(signal);
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
