import * as harness from "./harness.ts";

await harness.connectDefaultBackend();

console.debug('Checking for built Meteor bundle...');
if (Deno.args[1] == "--build-path") {
  await harness.openBuild(Deno.args[2]);
}

console.debug('Loading server modules...');
setTimeout(async () => {

  await harness.runStartup();

  harness.serveViaListen();
});
