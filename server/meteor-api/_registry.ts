import { AsyncLocalStorage } from 'node:async_hooks';

import { CollectionDriver } from "../types.ts";
import { DdpInterface, DdpSocket } from "../ddp/mod.ts";
import { RandomStream } from "../../shared/ddp/random.ts";

export const Defaults: {
  ddpInterface: DdpInterface;
  collectionDriver: CollectionDriver | null;
} = {
  ddpInterface: new DdpInterface,
  collectionDriver: null,
};

export const socketContexts = new WeakMap<DdpSocket, {
  ddpInterface: DdpInterface;
  collectionDriver: CollectionDriver;
}>();

export const CollectionDriverStorage = new AsyncLocalStorage<CollectionDriver>();
export const RandomStorage = new AsyncLocalStorage<RandomStream|null>();

export class CollectionQuery<T> {
  constructor(
    public readonly engine: CollectionDriver,
    public readonly collectionName: string,
  ) {}
  public readonly filters = new Array<(entity: T) => boolean>;
}

// export const CollectionEntityApiMapping = new Map<string,{apiVersion: string, kind: string}>();
