import * as harness from "@danopia/cosmosaur-server/harness";

await harness.connectDefaultBackend();

await harness.openBuild(new URL('links-demo/meteor-build', import.meta.url).toString())

console.debug('Loading server modules...');
await import('./links-demo/server/main.ts');

await harness.runStartup();

harness.serveViaListen();
