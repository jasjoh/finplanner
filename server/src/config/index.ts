/**
 * Server configuration. Port and other non-secret defaults.
 * DATABASE_URL is read in db/dataSource.ts (default: postgresql://localhost:5432/finplanner).
 */
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 5001;

export const config = {
  port,
};
