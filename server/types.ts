import type { Mongo } from '../shared/meteor-types/mongo.d.ts';

type CollectionType = InstanceType<typeof Mongo.Collection>;
export type CollectionDriver = {
  [key in keyof CollectionType]: CollectionType[key] extends Function
    ? (collectionName: string, ...args: Parameters<CollectionType[key]>) => ReturnType<CollectionType[key]>
    : undefined;
}
