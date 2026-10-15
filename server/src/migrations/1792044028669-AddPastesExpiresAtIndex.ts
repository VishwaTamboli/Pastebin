import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPastesExpiresAtIndex1792044028669 implements MigrationInterface {
    name = 'AddPastesExpiresAtIndex1792044028669'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE INDEX "idx_pastes_expires_at" ON "pastes" ("expires_at") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."idx_pastes_expires_at"`);
    }

}
