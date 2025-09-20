import type { Meteor } from "../shared/meteor-types/meteor.d.ts";

import type { ObserveChangesCallbacks } from "@cloudydeno/ddp/livedata/types.ts";
import type { PublishStream, PublicationEvent } from "@cloudydeno/ddp/server";

export type { PublishStream, PublicationEvent };

export type Publishable =
  | Subscribable
  | Subscribable[]
  | ObservableCursor<unknown>
  | ObservableCursor<unknown>[]

export const symbolSubscribable = Symbol.for('cosmosaur.v1alpha1.Subscribable');
export type Subscribable = {
  [symbolSubscribable]: (signal: AbortSignal) => PublishStream;
};
export function isSubscribable(given: unknown): given is Subscribable {
  if (!given) return false;
  const thing = given as Subscribable;
  if (!thing[symbolSubscribable]) return false;
  if (typeof thing[symbolSubscribable] != 'function') return false;
  return true;
}

// export type ObservableCursor<T> = Pick<typesMongo.Mongo.Cursor<T>, 'observeChangesAsync'>;
export type ObservableCursor<T> = {
  _getCollectionName?(): string; // Not typed in official types
  observeChanges(
    callbacks: ObserveChangesCallbacks<T>,
    options?: {
      nonMutatingCallbacks?: boolean | undefined;
      /** Non-standard option to improve integration with modern JS */
      signal?: AbortSignal;
    },
  ): Meteor.LiveQueryHandle;
};
export function isObservableCursor<T>(given: unknown): given is ObservableCursor<T> {
  if (!given) return false;
  const thing = given as ObservableCursor<T>;
  if (!thing.observeChanges) return false;
  if (typeof thing.observeChanges != 'function') return false;
  if (!thing._getCollectionName) return false;
  if (typeof thing._getCollectionName != 'function') return false;
  return true;
}
