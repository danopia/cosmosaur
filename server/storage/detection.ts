import type { Database } from "../registry.ts";

async function denoKvDetection(required: boolean) {
  if (required && !Deno.openKv) throw new Error(
    `'deno-kv' storage was requested but no database URL was provided.`
  );

  if (Deno.openKv) {
    console.debug('Loading KV driver...');
    const { KvDocDatabase } = await import('./impl-deno-kv.ts');

    console.debug('Opening KV database...');
    const kv = await Deno.openKv();
    return new KvDocDatabase(kv, ['database']);
  }
}

async function mongodbDetection(required: boolean) {
  const mongoUrl = Deno.env.get('MONGODB_URL')
    ?? Deno.args.find(x =>
      x.startsWith('mongodb+srv://')
      || x.startsWith('mongodb://'));

  if (required && !mongoUrl) throw new Error(
    `'mongodb' storage was requested but no database URL was provided.`
  );

  if (mongoUrl) {
    console.debug('Loading MongoDB driver...');
    const { MongoClient } = await import('mongodb');
    const { MongoStorageDatabase } = await import('./impl-mongodb.ts');

    console.debug('Opening MongoDB database...');
    const driver = await MongoClient.connect(mongoUrl);
    return new MongoStorageDatabase(driver.db());
  }
}

const driverList = [{
  name: 'mongodb',
  openFunc: mongodbDetection,
}, {
  name: 'deno-kv',
  openFunc: denoKvDetection,
}];

export async function startDetectedDriver(): Promise<Database> {
  for (const driver of driverList) {
    const storage = await driver.openFunc(false);
    if (storage) return storage;
  }

  throw new Error(`No database driver is available to connect. Provide a MongoDB URL, or add the --unstable-kv flag.`);
}

export async function startSpecificDriver(explicitStorage: string): Promise<Database> {
  const driver = driverList.find(x => x.name == explicitStorage);
  if (!driver) throw new Error(
    `Requested storage driver ${JSON.stringify(explicitStorage)} is not registered.`
  );

  const storage = await driver.openFunc(true);
  if (storage) return storage;

  throw new Error(
    `BUG: Requested storage driver ${JSON.stringify(explicitStorage)} failed to return a Database.`
  );
}

/** If --storage=<driver> is passed, uses specifically that driver. Otherwise detects an available driver */
export async function openAutomaticDatabase(): Promise<Database> {

  const explicitStorage = Deno.args
    .find(x => x
      .startsWith('--storage='))
    ?.split('=')[1];

  if (explicitStorage) {
    console.debug('Using provided storage driver:', explicitStorage);
    return await startSpecificDriver(explicitStorage);

  } else {
    console.debug('Detecting an available storage driver...');
    return await startDetectedDriver();
  }
}
