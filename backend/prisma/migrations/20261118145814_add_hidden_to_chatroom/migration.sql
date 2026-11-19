-- AlterTable
ALTER TABLE `chatroom` ADD COLUMN `hiddenByStudent` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `hiddenByTeacher` BOOLEAN NOT NULL DEFAULT false;
