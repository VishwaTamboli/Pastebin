import { MigrationInterface, QueryRunner } from "typeorm";

export class AddVisibilityToPastes1791975987486 implements MigrationInterface {
    name = 'AddVisibilityToPastes1791975987486'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "pastes" ADD "visibility" character varying(16) NOT NULL DEFAULT 'public'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "pastes" DROP COLUMN "visibility"`);
    }

}
