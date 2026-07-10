-- AlterEnum
ALTER TYPE "RosterStatus" ADD VALUE 'STAFF';

-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "foundedYear" INTEGER;

