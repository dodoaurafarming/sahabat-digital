-- AlterTable
ALTER TABLE `message` ADD COLUMN `hiddenByStudent` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `hiddenByTeacher` BOOLEAN NOT NULL DEFAULT false;
