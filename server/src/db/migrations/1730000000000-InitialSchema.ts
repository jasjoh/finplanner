import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Placeholder initial migration to verify the migration pipeline.
 * Application tables will be added in Phase 2.
 * 1730000000000 is just a nice round timestamp to start with.
 */
export class InitialSchema1730000000000 implements MigrationInterface {
  name = "InitialSchema1730000000000";

  public async up(_queryRunner: QueryRunner): Promise<void> {
    // No-op: pipeline verification only
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // No-op
  }
}
