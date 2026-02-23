// Is there a more Deno-first way to access async-local storage?
import { AsyncLocalStorage } from 'node:async_hooks';

import type { DdpSession } from "@cloudydeno/ddp/server";
import { Random, type RandomStream } from '@cloudydeno/ddp/random';
import type { Backend } from "./types.ts";

// Cache the async variable handles on globalThis so that multiple instances
// of the library won't introduce inconsistent state
const bySymbols = globalThis as unknown as {
  [symbolBackend]?: AsyncLocalStorage<Backend>;
  [symbolDefaultBackend]?: Backend;

  [symbolSession]?: AsyncLocalStorage<DdpSession>;

  [symbolRandom]?: AsyncLocalStorage<RandomStream | null>;
}

/*
 * The DDP server's method/sub surface, default can be replaced per-connection
 */

const symbolBackend = Symbol.for('cosmosaur.v1alpha1.Interface');
const symbolDefaultBackend = Symbol.for('cosmosaur.v1alpha1.DefaultBackend');
const BackendStorage = bySymbols[symbolBackend] ??= new AsyncLocalStorage;
export function getBackend(): Backend {
  const backend = BackendStorage.getStore() ?? bySymbols[symbolDefaultBackend];
  if (!backend) throw new Error(`getBackend() called outside of a backend context`);
  return backend;
}
/** Runs the given callback within the context of an arbitrary Backend. Helpful for virtual hosting. */
export const withBackend: <R>(store: Backend, callback: () => R) => R = BackendStorage.run.bind(BackendStorage);
export function setDefaultBackend(backend: Backend) {
  if (bySymbols[symbolDefaultBackend]) throw new Error(`Replacing an existing default Backend is possibly a mistake.`);
  bySymbols[symbolDefaultBackend] = backend;
}

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
  const backend = BackendStorage.getStore() ?? bySymbols[symbolDefaultBackend];
  if (backend) return backend.randomStream.getStream(name);
  return new Random(); // TODO: is this a bug, should we throw instead?
}
export const withRandom: <R>(store: RandomStream | null, callback: () => R) => R = RandomStorage.run.bind(RandomStorage);
