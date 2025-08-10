import { Cursor, HasId, ObserveCallbacks, ObserveChangesCallbacks, ObserverHandle } from "@cloudydeno/ddp/livedata/types.ts";
import { Subscribable, SubscriptionEvent, symbolSubscribable } from "@danopia/cosmosaur-server/publishable";

export abstract class AsyncStorageCursor<Tdoc extends HasId> implements Cursor<Tdoc>, Iterable<Tdoc> {

  constructor(
    private readonly findGenerator: () => AsyncGenerator<Tdoc>,
    // private readonly subscribable: () => ReadableStream<SubscriptionEvent>,
  ) {}

  // [symbolSubscribable](): ReadableStream<SubscriptionEvent> {
  //   return this.subscribable();
  // }

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
