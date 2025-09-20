import sift from "sift";
import type { Collection, Cursor, DocumentFields, FindOpts, HasId, ObserveCallbacks, ObserveChangesCallbacks, ObserverHandle } from "@cloudydeno/ddp/livedata/types.ts";

import { getRandomStream, type Database } from "../registry.ts";
import {
  type PublicationEvent,
  type PublishStream,
  type Subscribable,
  symbolSubscribable,
} from "../publishable.ts";
import { AsyncStorageCursor } from "./async-base.ts";

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

  find(selector: Record<string, unknown> = {}, opts: FindOpts = {}): Cursor<Tdoc> {
    return new KvDocCursor(
      () => this.#findGenerator(selector, opts),
      (signal: AbortSignal) => ReadableStream.from(this.#eventGenerator(selector, opts, signal)),
    );
  }

  insert(): never {
    throw new Error(`Not implemented`);
  }
  async insertAsync(doc: OptionalId<Tdoc>, callback?: (err: null, newId: string | null) => void): Promise<string> {
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

class KvDocCursor<Tdoc extends HasId> extends AsyncStorageCursor<Tdoc> implements Cursor<Tdoc>, Iterable<Tdoc>, Subscribable {

  constructor(
    findGenerator: () => AsyncGenerator<Tdoc>,
    private readonly subscribable: (signal: AbortSignal) => PublishStream,
  ) {
    super(findGenerator);
  }

  [symbolSubscribable](signal: AbortSignal): PublishStream {
    return this.subscribable(signal);
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
