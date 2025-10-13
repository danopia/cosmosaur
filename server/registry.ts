import { AsyncLocalStorage } from 'node:async_hooks';

import { DdpInterface, type DdpSession } from "@cloudydeno/ddp/server";
import { Random, type RandomStream } from '@cloudydeno/ddp/random';
import type { HasId, PartialCollectionApi } from '@cloudydeno/ddp/livedata/types.ts';

// Cache the async variable handles on globalThis so that multiple instances
// of the library won't introduce inconsistent state
const bySymbols = globalThis as unknown as {
  [symbolInterface]?: AsyncLocalStorage<Backend>;
  [symbolDefaultInterface]?: Backend;

  [symbolSession]?: AsyncLocalStorage<DdpSession>;

  [symbolRandom]?: AsyncLocalStorage<RandomStream | null>;

  [symbolDatabase]?: AsyncLocalStorage<Database>;
  [symbolDefaultDatabase]?: Database;
}

/*
 * The DDP server's method/sub surface, default can be replaced per-connection
 */

type Backend = {
  ddpInterface: DdpInterface;
  startupFuncs: Array<() => void | Promise<void>>;
}
export function newInterface(): Backend {
  return {
    ddpInterface: new DdpInterface,
    startupFuncs: [],
  };
}

const symbolDefaultInterface = Symbol.for('cosmosaur.v1alpha1.DefaultInterface');
const defaultInterface = bySymbols[symbolDefaultInterface] ??= newInterface();

const symbolInterface = Symbol.for('cosmosaur.v1alpha1.Interface');
const InterfaceStorage = bySymbols[symbolInterface] ??= new AsyncLocalStorage;
export function getInterface(): Backend {
  return InterfaceStorage.getStore() ?? defaultInterface;
}
export const withInterface: <R>(store: Backend, callback: () => R) => R = InterfaceStorage.run.bind(InterfaceStorage);

/*
 * The DDP session of the current call, for accessing connection metadata
 */

const symbolSession = Symbol.for('cosmosaur.v1alpha1.Session');
const SessionStorage = bySymbols[symbolSession] ??= new AsyncLocalStorage;
export function getSession(): DdpSession | null {
  return SessionStorage.getStore() ?? null;
}
export const withSession: <R>(store: DdpSession, callback: () => R) => R = SessionStorage.run.bind(SessionStorage);

/*
 * Seeded random for the current method call, if provided by the client
 */
const symbolRandom = Symbol.for('cosmosaur.v1alpha1.Random');
const RandomStorage = bySymbols[symbolRandom] ??= new AsyncLocalStorage;
export function getRandom(): RandomStream | null {
  return RandomStorage.getStore() ?? null;
}
export function getRandomStream(name: string): Random {
  const random = getRandom();
  if (random) return random.getStream(name);
  return new Random();
}
export const withRandom: <R>(store: RandomStream | null, callback: () => R) => R = RandomStorage.run.bind(RandomStorage);

/*
 * The backing database context. Typically a backend database on servers and a DDP client on clients.
 */

export type Database = {
  newCollection<Tdoc extends HasId>(name: string): PartialCollectionApi<Tdoc>;
  getCollection<Tdoc extends HasId>(name: string): PartialCollectionApi<Tdoc> | null;
};

const symbolDefaultDatabase = Symbol.for('cosmosaur.v1alpha1.DefaultDatabase');

const symbolDatabase = Symbol.for('cosmosaur.v1alpha1.Database');
const DatabaseStorage = bySymbols[symbolDatabase] ??= new AsyncLocalStorage;
export function getDatabase(): Database | null {
  return DatabaseStorage.getStore() ?? bySymbols[symbolDefaultDatabase] ?? null;
}
export const withDatabase: <R>(store: Database, callback: () => R) => R = DatabaseStorage.run.bind(DatabaseStorage);
// enterWith isn't very strong, it seems to leave after the block, so has limited usage
// export const setDatabase: (store: Database) => void = DatabaseStorage.enterWith.bind(DatabaseStorage);
export function setDefaultDatabase(database: Database) {
  if (bySymbols[symbolDefaultDatabase]) throw new Error(`Replacing an existing default Database is possibly a mistake.`);
  bySymbols[symbolDefaultDatabase] = database;
}
