import { AsyncLocalStorage } from 'node:async_hooks';

import { DdpInterface, type DdpSession } from "@cloudydeno/ddp/server";
import { Random, type RandomStream } from '@cloudydeno/ddp/random';
import type { Collection, HasId } from '@cloudydeno/ddp/livedata/types.ts';

// Cache the async variable handles on globalThis so that multiple instances
// of the library won't introduce inconsistent state
const bySymbols = globalThis as unknown as {
  [symbolInterface]?: AsyncLocalStorage<Backend>;
  [symbolSession]?: AsyncLocalStorage<DdpSession>;
  [symbolRandom]?: AsyncLocalStorage<RandomStream | null>;
  [symbolDatabase]?: AsyncLocalStorage<Database>;
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

const symbolInterface = Symbol.for('cosmosaur.v1alpha1.Interface');
const defaultInterface = newInterface();
const InterfaceStorage = bySymbols[symbolInterface] ??= new AsyncLocalStorage;
export function getInterface(): Backend {
  return InterfaceStorage.getStore() ?? defaultInterface;
}
export const withInterface = InterfaceStorage.run.bind(InterfaceStorage);

/*
 * The DDP session of the current call, for accessing connection metadata
 */

const symbolSession = Symbol.for('cosmosaur.v1alpha1.Session');
const SessionStorage = bySymbols[symbolSession] ??= new AsyncLocalStorage;
export function getSession(): DdpSession | null {
  return SessionStorage.getStore() ?? null;
}
export const withSession = SessionStorage.run.bind(SessionStorage);

/*
 * Seeded random for the current method call, if provided by the client
 */
const symbolRandom = Symbol.for('cosmosaur.v1alpha1.Random');
const RandomStorage = bySymbols[symbolRandom] ??= new AsyncLocalStorage;
export function getRandom() {
  return RandomStorage.getStore();
}
export function getRandomStream(name: string) {
  const random = getRandom();
  if (random) return random.getStream(name);
  return new Random();
}
export const withRandom = RandomStorage.run.bind(RandomStorage);

/*
 * The backing database context. Typically a backend database on servers and a DDP client on clients.
 */

export type Database = {
  newCollection<Tdoc extends HasId>(name: string): Collection<Tdoc>;
  getCollection<Tdoc extends HasId>(name: string): Collection<Tdoc> | null;
};

const symbolDatabase = Symbol.for('cosmosaur.v1alpha1.Database');
const DatabaseStorage = bySymbols[symbolDatabase] ??= new AsyncLocalStorage;
export function getDatabase() {
  return DatabaseStorage.getStore();
}
export const withDatabase = DatabaseStorage.run.bind(DatabaseStorage);
export const setDatabase = DatabaseStorage.enterWith.bind(DatabaseStorage);
