import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddBookingCode20261117130228 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'bookings',
      new TableColumn({
        name: 'booking_code',
        type: 'varchar',
        length: '12',
        isNullable: true,
        isUnique: true,
      }),
    );

    // Créer un index unique pour les recherches rapides
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_bookings_booking_code" ON "bookings" ("booking_code") WHERE "booking_code" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_bookings_booking_code"`);
    await queryRunner.dropColumn('bookings', 'booking_code');
  }
}
