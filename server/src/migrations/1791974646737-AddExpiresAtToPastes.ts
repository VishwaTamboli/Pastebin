import { MigrationInterface, QueryRunner } from "typeorm";

export class AddExpiresAtToPastes1791974646737 implements MigrationInterface {
    name = 'AddExpiresAtToPastes1791974646737'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "pastes" ADD "expires_at" TIMESTAMP`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "pastes" DROP COLUMN "expires_at"`);
    }

}
