import { appDataSource } from "./dataSource.js";
async function run() {
    await appDataSource.initialize();
    try {
        const executed = await appDataSource.runMigrations();
        console.log(`Ran ${executed.length} migration(s).`);
    }
    finally {
        await appDataSource.destroy();
    }
}
run().catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
});
//# sourceMappingURL=runMigrations.js.map