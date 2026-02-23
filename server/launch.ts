import * as harness from "./harness.ts";

await harness.connectDefaultBackend();

console.debug('Checking for built Meteor bundle...');
if (Deno.args[1] == "--build-path") {
  await harness.openBuild(Deno.args[2]);
}

console.debug('Loading server modules...');
await import(new URL(Deno.args[0], `file://${Deno.cwd()}/`).toString());

await harness.runStartup();

const serveExport: Deno.ServeDefaultExport = harness.serveViaExport();
export default serveExport;
