#!/usr/bin/env -S deno run --allow-read --allow-env

if (Deno.args[0] == 'build') {

} else {
  throw die `Empty or unrecognized command. Currently implemented: 'build'`;
}

function die(template: TemplateStringsArray, ...stuff: unknown[]) {
  console.error(`\ncosmosaur:`, String.raw(template, ...stuff.map(x => JSON.stringify(x))), '\n');
  Deno.exit(1);
}
