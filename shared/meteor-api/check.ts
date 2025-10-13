// based on https://github.com/meteor/meteor/blob/devel/packages/check/check.d.ts

interface Matcher<T> {
  _meteorCheckMatcherBrand: void;
}

export type Pattern =
  typeof String |
  typeof Number |
  typeof Boolean |
  typeof Object |
  typeof Function |
  (new (...args: unknown[]) => unknown) |
  undefined | null | string | number | boolean |
  [Pattern] |
  {[key: string]: Pattern} |
  Matcher<unknown>;

export type PatternMatch<T extends Pattern> =
  T extends Matcher<infer U> ? U :
  T extends typeof String ? string :
  T extends typeof Number ? number :
  T extends typeof Boolean ? boolean :
  T extends typeof Object ? object :
  // deno-lint-ignore ban-types
  T extends typeof Function ? Function :
  T extends undefined | null | string | number | boolean ? T :
  T extends new (...args: unknown[]) => infer U ? U :
  T extends [Pattern] ? PatternMatch<T[0]>[] :
  T extends {[key: string]: Pattern} ? {[K in keyof T]: PatternMatch<T[K]>} :
  unknown;


export function check<T extends Pattern>(
  value: unknown,
  pattern: T,
  options?: { throwAllErrors?: boolean },
): asserts value is PatternMatch<T> {
  if (pattern === String) {
    if (typeof value == 'string') return;
  } else if (pattern === Number) {
    if (typeof value == 'number') return;
  } else {
    console.log(`TODO: check`, [value, pattern]);
  }
  throw new Error(`check() failed on "${typeof value}"`);
}
