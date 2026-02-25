import { appDataSource } from "./dataSource.js";

try {
  await appDataSource.initialize();
  try {
    const executed = await appDataSource.runMigrations();
    console.log(`Ran ${executed.length} migration(s).`);
  } finally {
    await appDataSource.destroy();
  }
} catch (err) {
  console.error("Migration failed:", err);
  process.exit(1);
}
