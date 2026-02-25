import { join } from "path";
import { DataSource } from "typeorm";

const defaultDatabaseUrl = "postgresql://localhost:5432/finplanner";

const dirName = import.meta.dirname;
const migrationExt = dirName.includes("dist") ? "js" : "ts";
export const appDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL ?? defaultDatabaseUrl,
  synchronize: false,
  migrations: [join(dirName, "migrations", "**", `*.${migrationExt}`)],
  migrationsTableName: "migrations",
});
