-- AlterTable
ALTER TABLE `user` ADD COLUMN `rejectReason` VARCHAR(191) NULL,
    ADD COLUMN `status` ENUM('PENDING', 'ACTIVE', 'REJECTED') NOT NULL DEFAULT 'ACTIVE',
    MODIFY `role` ENUM('student', 'teacher', 'admin') NOT NULL;
