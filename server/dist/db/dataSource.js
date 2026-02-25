import { DataSource } from "typeorm";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));
/**
 * Default for local dev. Override with DATABASE_URL.
 * @see docs/technical-design.md Section 10
 */
const defaultDatabaseUrl = "postgresql://localhost:5432/finplanner";
const migrationExt = __dirname.includes("dist") ? "js" : "ts";
export const appDataSource = new DataSource({
    type: "postgres",
    url: process.env.DATABASE_URL ?? defaultDatabaseUrl,
    synchronize: false,
    migrations: [join(__dirname, "migrations", "**", `*.${migrationExt}`)],
    migrationsTableName: "migrations",
});
//# sourceMappingURL=dataSource.js.map