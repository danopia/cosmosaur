import type {
  DocumentFields,
  HasId,
  ObserveChangesCallbacks,
  ObserverHandle,
  PartialCollectionApi,
  UpdateOpts,
  UpsertOpts,
  UpsertResult,
} from "@cloudydeno/ddp/livedata/types.ts";
import {
  AnonymousCollection,
  AnonymousCollectionApi,
} from "@cloudydeno/ddp/livedata/collections/anonymous.ts";
import { Cursor } from "@cloudydeno/ddp/livedata/facades.ts";
import type { EJSONable } from "@cloudydeno/ejson";

import type { Database } from "../types.ts";

export class AnonymousDatabase implements Database {
  constructor(
  ) {}
  #collectionMap = new Map<string, AnonymousCollection>();
  newCollection<Tdoc extends HasId>(name: string): PartialCollectionApi<Tdoc> {
    if (this.#collectionMap.has(name)) throw new Error(`Collection ${name} already defined`);
    const coll = new AnonymousCollection();
    this.#collectionMap.set(name, coll);
    // return new UpdatableAnonymousCollectionApi<Tdoc>(coll);
    return coll.getApi<Tdoc>();
  }
  getCollection<Tdoc extends HasId>(name: string): PartialCollectionApi<Tdoc> | null {
    const coll = this.#collectionMap.get(name);
    if (!coll) throw new Error(`Collection ${name} not defined`);
    // return new UpdatableAnonymousCollectionApi<Tdoc>(coll);
    return coll.getApi<Tdoc>();
  }
}

// Cursor.prototype.observeChanges = function <T>(callbacks: ObserveChangesCallbacks<T>, options?: { nonMutatingCallbacks?: boolean | undefined; }): ObserverHandle/*<T>*/ {
//     return this.observe({
//       added: callbacks.added ? ({_id,...fields}) => {
//         callbacks.added?.(_id, fields);
//       } : undefined,
//       changed: callbacks.changed ? ({_id,...fields}) => {
//         callbacks.changed?.(_id, fields);
//       } : undefined,
//       removed: callbacks.removed ? ({_id}) => {
//         callbacks.removed?.(_id);
//       } : undefined,
//     });
//   }


// export class UpdatableAnonymousCollectionApi<T extends HasId> extends AnonymousCollectionApi<T> {
//   override update(selector: Record<string, unknown>, modifier: Record<string, unknown>, options?: UpdateOpts): number {
//     const keys = Object.keys(modifier);
//     const allOps = keys.every(x => x[0] == '$');
//     const someOps = keys.some(x => x[0] == '$');
//     if (someOps && !allOps) throw new Error(`Mixture of update ops and fields`);
//     if (!someOps) throw new Error(`TODO: update with only fields`);

//     let numberAffected = 0;
//     for (const original of new Cursor(this.find(selector))) {
//       let isAffected = false;
//       let mutable = structuredClone(original) as EJSONable;

//       for (const [opName, opArg] of Object.entries(modifier)) {
//         switch (opName) {

//           case '$set': {
//             const setMap = opArg as Record<string,EJSONable>;
//             if (Object.keys(setMap).some(x => x.includes('.'))) throw new Error(`TODO: no deep keys yet`);
//             mutable = {...mutable, ...setMap};
//             isAffected = true;
//           } break;

//           // https://www.mongodb.com/docs/manual/reference/operator/update/addToSet/
//           case '$addToSet': {
//             const fieldMap = opArg as Record<string,EJSONable>;
//             for (const [field, value] of Object.entries(fieldMap)) {
//               if (Object.keys(value ?? {}).some(x => x[0] == '$')) throw new Error(`TODO embedded operators`);
//               let docPiece = mutable;
//               const fieldLabels = field.split('.');
//               const listLabel = fieldLabels.pop();
//               if (!listLabel) throw new Error(`no labels in addToSet somehow`);
//               for (const label of fieldLabels) {
//                 const piece = docPiece[label] ??= {};
//                 if (typeof piece !== 'object') throw new Error(`expected object at "${label}"`);
//                 docPiece = piece as EJSONable;
//               }
//               // if (field.includes('.')) throw new Error(`TODO: no deep keys yet: ${field}`);
//               const existingValue = docPiece[listLabel] ??= [];
//               if (!Array.isArray(existingValue)) throw new Error(`addToSet to non-array`);
//               if (!existingValue.includes(value)) {
//                 existingValue.push(value);
//                 isAffected = true;
//               }
//             }
//           } break;

//           default:
//             throw new Error(`TODO: Unimplemented update operator "${opName}"`);
//         }
//       }

//       if (isAffected) {
//         const {_id, ...fields} = mutable as T;
//         const keysBefore = new Set(Object.keys(original));
//         const keysAfter = new Set(Object.keys(mutable));
//         this.liveColl.changeDocument(_id, fields as DocumentFields, [...keysBefore.difference(keysAfter)]);
//         numberAffected++;
//       }
//       if (!options?.multi) break;
//     }
//     return numberAffected;
//   }

//   override upsert(_selector: Record<string, unknown>, _modifier: Record<string, unknown>, _options?: UpsertOpts): UpsertResult {
//     throw new Error("TODO: Method 'upsert' not implemented.");
//   }
// }
