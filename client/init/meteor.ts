import { DDP } from "@cloudydeno/ddp/client";
import { MeteorApi } from "../meteor-api/meteor.ts";

// globalThis.__meteor_runtime_config__.ROOT_URL
const connection = DDP.connect(new URL('/', window.location.href).toString());
connection.subscribe('meteor_autoupdate_clientVersions', []);

export const Meteor = new MeteorApi(connection);
