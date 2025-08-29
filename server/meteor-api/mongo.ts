import type { Collection, HasId } from "@cloudydeno/ddp/livedata/types.ts";
import { AnonymousCollection } from "@cloudydeno/ddp/livedata/collections/anonymous.ts";

import { getDatabase } from "../registry.ts";

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
} = {

  Collection: MongoCollectionRedirector,

  // setConnectionOptions: undefined,

  // Cursor: undefined,

  // ObjectID: undefined,

}
