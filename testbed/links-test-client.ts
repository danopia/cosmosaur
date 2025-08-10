// import { DDP } from "@cloudydeno/ddp/client";
import { DDP } from "../../../cloudydeno/ddp/src/client/mod.ts";

using conn = DDP.connect('http://localhost:8000');
await conn.subscribe('links').liveReady.waitForValue(true);
console.log(conn.getCollection('links').findOne());
