import type * as types from '../../shared/meteor-types/mongo.d.ts';
import { getDatabase } from "@danopia/cosmosaur-server/registry";
import { AnonymousCollection } from "@cloudydeno/ddp/livedata/collections/anonymous.ts";
import { HasId, Collection } from "@cloudydeno/ddp/livedata/types.ts";
// import { EntityHandle, ApiKindEntity } from "jsr:@dist-app/stdlib@0.1.5/engine/types";
// import sift from "https://esm.sh/sift@17.1.3";

// const collections = new Map<string, MongoCollection<any>>();


// function getCollection(name: string) {
//   return collections.get(name) as any;
// }

// class MongoCollection<T extends Document, U = T> implements types.Mongo.Collection<T,U> {
//   constructor(
//     private readonly collectionName: string | null,
//   ) {
//     if (collectionName == null) {
//       throw new Error(`TODO: anonymous collections`);
//     }
//     if (collections.has(collectionName)) {
//       throw new Error(`Double creation of collection ${collectionName}`);
//     }
//     collections.set(collectionName, this);
//   }

//   static getCollection = getCollection;

//   allow<Fn extends types.Mongo.Transform<T> = undefined>(options: { insert?: ((userId: string, doc: types.Mongo.DispatchTransform<Fn, T, U>) => Promise<boolean> | boolean) | undefined; update?: ((userId: string, doc: types.Mongo.DispatchTransform<Fn, T, U>, fieldNames: string[], modifier: any) => Promise<boolean> | boolean) | undefined; remove?: ((userId: string, doc: types.Mongo.DispatchTransform<Fn, T, U>) => Promise<boolean> | boolean) | undefined; fetch?: string[] | undefined; transform?: Fn | undefined; }): boolean {
//     throw new Error("Method not implemented.");
//   }
//   createCappedCollectionAsync(byteSize?: number, maxDocuments?: number): Promise<void> {
//     throw new Error("Method not implemented.");
//   }
//   createIndex(indexSpec: IndexSpecification, options?: CreateIndexesOptions): void {
//     throw new Error("Method not implemented.");
//   }
//   createIndexAsync(indexSpec: IndexSpecification, options?: CreateIndexesOptions): Promise<void> {
//     throw new Error("Method not implemented.");
//   }
//   deny<Fn extends types.Mongo.Transform<T> = undefined>(options: { insert?: ((userId: string, doc: types.Mongo.DispatchTransform<Fn, T, U>) => Promise<boolean> | boolean) | undefined; update?: ((userId: string, doc: types.Mongo.DispatchTransform<Fn, T, U>, fieldNames: string[], modifier: any) => Promise<boolean> | boolean) | undefined; remove?: ((userId: string, doc: types.Mongo.DispatchTransform<Fn, T, U>) => Promise<boolean> | boolean) | undefined; fetch?: string[] | undefined; transform?: Fn | undefined; }): boolean {
//     throw new Error("Method not implemented.");
//   }
//   dropCollectionAsync(): Promise<void> {
//     throw new Error("Method not implemented.");
//   }
//   dropIndexAsync(indexName: string): Promise<void> {
//     throw new Error("Method not implemented.");
//   }
//   find(selector?: unknown, options?: unknown): types.Mongo.Cursor<T, U> /*| types.Mongo.Cursor<T, types.Mongo.DispatchTransform<O["transform"], T, U>> */{
//     throw new Error("Method not implemented.");
//   }
//   findOne(selector?: unknown, options?: unknown): U /*| types.Mongo.DispatchTransform<O["transform"], T, U> | undefined */{
//     throw new Error("Method not implemented.");
//   }
//   findOneAsync(selector?: unknown, options?: unknown): Promise<U | undefined> /*| Promise<types.Mongo.DispatchTransform<O["transform"], T, U> | undefined> */{
//     throw new Error("Method not implemented.");
//   }
//   countDocuments(selector?: string | types.Mongo.ObjectID | types.Mongo.Selector<T> | undefined, options?: CountDocumentsOptions): Promise<number> {
//     throw new Error("Method not implemented.");
//   }
//   estimatedDocumentCount(options?: EstimatedDocumentCountOptions): Promise<number> {
//     throw new Error("Method not implemented.");
//   }
//   insert(doc: types.Mongo.OptionalId<T>, callback?: Function): string {
//     throw new Error("Method not implemented.");
//   }
//   insertAsync(doc: types.Mongo.OptionalId<T>, callback?: Function): Promise<string> {
//     throw new Error("Method not implemented.");
//   }
//   rawCollection(): types.Mongo.Collection<T, T> {
//     throw new Error("Method not implemented.");
//   }
//   rawDatabase(): Db {
//     throw new Error("Method not implemented.");
//   }
//   remove(selector: string | types.Mongo.ObjectID | types.Mongo.Selector<T>, callback?: Function): number {
//     throw new Error("Method not implemented.");
//   }
//   removeAsync(selector: string | types.Mongo.ObjectID | types.Mongo.Selector<T>, callback?: Function): Promise<number> {
//     throw new Error("Method not implemented.");
//   }
//   update(selector: string | types.Mongo.ObjectID | types.Mongo.Selector<T>, modifier: types.Mongo.Modifier<T>, options?: { multi?: boolean | undefined; upsert?: boolean | undefined; arrayFilters?: { [identifier: string]: any; }[] | undefined; } | undefined, callback?: Function): number {
//     throw new Error("Method not implemented.");
//   }
//   updateAsync(selector: string | types.Mongo.ObjectID | types.Mongo.Selector<T>, modifier: types.Mongo.Modifier<T>, options?: { multi?: boolean | undefined; upsert?: boolean | undefined; arrayFilters?: { [identifier: string]: any; }[] | undefined; } | undefined, callback?: Function): Promise<number> {
//     throw new Error("Method not implemented.");
//   }
//   upsert(selector: string | types.Mongo.ObjectID | types.Mongo.Selector<T>, modifier: types.Mongo.Modifier<T>, options?: { multi?: boolean | undefined; } | undefined, callback?: Function): { numberAffected?: number | undefined; insertedId?: string | undefined; } {
//     throw new Error("Method not implemented.");
//   }
//   upsertAsync(selector: string | types.Mongo.ObjectID | types.Mongo.Selector<T>, modifier: types.Mongo.Modifier<T>, options?: { multi?: boolean | undefined; } | undefined, callback?: Function): Promise<{ numberAffected?: number | undefined; insertedId?: string | undefined; }> {
//     throw new Error("Method not implemented.");
//   }
//   _createCappedCollection(byteSize?: number, maxDocuments?: number): void {
//     throw new Error("Method not implemented.");
//   }
//   _ensureIndex(indexSpec: IndexSpecification, options?: CreateIndexesOptions): void {
//     throw new Error("Method not implemented.");
//   }
//   _dropCollection(): Promise<void> {
//     throw new Error("Method not implemented.");
//   }
//   _dropIndex(indexName: string): void {
//     throw new Error("Method not implemented.");
//   }

//   // static getCollection<
//   //   TCollection extends MongoCollection<any, any> = MongoCollection<Document>
//   // >(name: string): MongoCollection<any, any> {
//   //   return collections.get(name) as TCollection;
//   // }




//   // find(
// //     filter: Record<string,unknown>,
// //     // TODO: projection, sort, etc
// //     ...args: unknown[]
// //   ) {
// //     console.log(`find`, this.collectionName, [filter, ...args]);
// //     const engine = EngineStorage.getStore();
// //     if (!engine) throw new Error(`No EntityEngine found in async context`);

// //     const query = new CollectionQuery(engine, this.collectionName);
// //     if (filter) query.filters.push(sift(filter));
// //     return query;
// //   }

// //   async findOneAsync(
// //     filter: {_id?: string} & Record<string,unknown>,
// //     // TODO: projection, sort, etc
// //     ...args: unknown[]
// //   ) {
// //     const engine = EngineStorage.getStore();
// //     if (!engine) throw new Error(`No EntityEngine found in async context`);

// //     const apiCoords = CollectionEntityApiMapping.get(this.collectionName);
// //     if (!apiCoords) throw new Error(`Unknown collection "${this.collectionName}"`);

// //     if (typeof filter?._id == 'string') {
// //       const entity = await engine.getEntity<ApiKindEntity>(
// //         apiCoords.apiVersion,
// //         apiCoords.kind,
// //         filter._id);
// //       if (!entity) return null;
// //       const doc = {
// //         ...(entity.spec as Record<string,unknown>),
// //         _id: entity.metadata.name,
// //       };
// //       // Check that the document matches any other fields too
// //       if (!sift(filter)(doc)) return null;
// //       return doc;
// //     } else {
// //       throw new Error(`TODO: find by filter`);
// //     }
// //   }

// //   async updateAsync(
// //     filter: {_id?: string} & Record<string,unknown>,
// //     operations: Record<string,unknown>,
// //   ) {
// //     const engine = EngineStorage.getStore();
// //     if (!engine) throw new Error(`No EntityEngine found in async context`);

// //     const apiCoords = CollectionEntityApiMapping.get(this.collectionName);
// //     if (!apiCoords) throw new Error(`Unknown collection "${this.collectionName}"`);

// //     let handle: EntityHandle<ApiKindEntity> | null = null;
// //     if (typeof filter?._id == 'string') {
// //       handle = engine.getEntityHandle<ApiKindEntity>(
// //         apiCoords.apiVersion,
// //         apiCoords.kind,
// //         filter._id);
// //     } else {
// //       throw new Error(`TODO: find by filter`);
// //     }

// //     // const entity = await handle.get();
// //     // if (!entity) return null;
// //     // const doc = {
// //     //   ...(entity.spec as Record<string,unknown>),
// //     //   _id: entity.metadata.name,
// //     // };

// //     // // Check that the document matches any other fields too
// //     // if (!sift(filter)(doc)) return null;

// //     let updatedCount = 0;
// //     await handle.mutate(entity => {
// //       const spec = entity.spec as Record<string,unknown>;
// //       const doc = {
// //         ...spec,
// //         _id: entity.metadata.name,
// //       };

// //       // Check that the document matches any other fields too
// //       if (!sift(filter)(doc)) return Symbol.for('no-op');

// //       console.log(`update`, this.collectionName, doc, operations);

// //       for (const [opName, opData] of Object.entries(operations)) {
// //         switch (opName) {
// //           case '$set': {
// //             for (const [key, value] of Object.entries(opData as Record<string,unknown>)) {
// //               if (key.includes('.')) throw new Error(`TODO: nested update key "${key}"`);
// //               spec[key] = value;
// //             }
// //             break;
// //           };
// //           default: throw new Error(`TODO: unhandled update op "${opName}"`);
// //         }
// //       }

// //       updatedCount++;
// //     });

// //     return updatedCount;
// //   }

// //   async insertAsync(doc: {_id?: string} & Record<string,unknown>) {
// //     const engine = EngineStorage.getStore();
// //     if (!engine) throw new Error(`No EntityEngine found in async context`);

// //     const {_id, userId, ...spec} = doc;
// //     const random = RandomStorage.getStore() ?? new RandomStream(`${Math.random()}`);
// //     const name = _id ?? random.getStream(`/collection/${this.collectionName}`).id();
// //     console.log(`insert`, this.collectionName, name, doc);

// //     const apiCoords = CollectionEntityApiMapping.get(this.collectionName);
// //     if (!apiCoords) throw new Error(`Unknown collection "${this.collectionName}"`);
// //     await engine.insertEntity<ApiKindEntity>({
// //       apiVersion: apiCoords.apiVersion,
// //       kind: apiCoords.kind,
// //       metadata: { name },
// //       spec,
// //     });
// //     return name;
// //   }
// }

class MongoCollectionRedirector {
  constructor(name?: string | null) {
    if (!name) {
      const anonColl = new AnonymousCollection();
      return anonColl.getApi();
    }
    const database = getDatabase();
    if (!database) throw new Error(`No Database is registered`);
    return database.newCollection(name);
  }
  static getCollection(name: string): Collection<HasId> | null {
    const database = getDatabase();
    if (!database) throw new Error(`No Database is registered`);
    return database.getCollection(name);
  }
}

export const Mongo: {
    Collection: typeof MongoCollectionRedirector;
}/*: typeof types.Mongo*/ = {

  Collection: MongoCollectionRedirector,

  // get Collection(): CollectionFactory {
  //   const inst = getCollectionFactory();
  //   if (!inst) throw new Error(`No CollectionFactory is registered`);
  //   return inst;
  // }
  // Collection: MongoCollection,
  // setConnectionOptions: undefined,
  // Cursor: undefined,
  // ObjectID: undefined,


}// satisfies Partial<typeof types.Mongo> as unknown as typeof types.Mongo;
