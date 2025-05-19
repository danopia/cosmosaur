import type { Meteor } from './meteor-types/meteor.d.ts';

export class MeteorError extends Error implements Meteor.Error {
  constructor(
    public readonly error: string | number,
    public readonly reason?: string,
    public readonly details?: string,
  ) {
    super(`${reason} [${error}]`);
  }
};

export class MeteorTypedError extends Error implements Meteor.TypedError {
  constructor(
    message: string,
    public readonly errorType: string,
  ) {
    super(message);
  }
};
