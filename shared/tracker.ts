// There is an NPM version of the Meteor Tracker.
// It is essentially a copy/paste but is more acceptable for execution than the real source.
import * as Impls from 'https://cdn.esm.sh/@edemaine/meteor-tracker@1.1.0';

// The original types are imported from Github tags.
import type { Tracker as TrackerType } from 'https://raw.githubusercontent.com/meteor/meteor/refs/tags/release/METEOR%403.3.1/packages/tracker/tracker.d.ts';
import type { ReactiveVar as ReactiveVarType } from 'https://raw.githubusercontent.com/meteor/meteor/refs/tags/release/METEOR%403.3.1/packages/reactive-var/reactive-var.d.ts';

// We wrap the NPM implementation available to use with the types.
export const Tracker = Impls.Tracker as typeof TrackerType;
export const ReactiveVar = Impls.ReactiveVar as typeof ReactiveVarType;

// TODO: These imports could be replaced by a proper TypeScript port of the latest tracker code.
// On backend, the tracker could also use AsyncResource; not sure if this helps anything though.
