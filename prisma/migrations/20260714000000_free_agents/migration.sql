-- CreateEnum
CREATE TYPE "EloTier" AS ENUM ('HIERRO', 'BRONCE', 'PLATA', 'ORO', 'PLATINO', 'ESMERALDA', 'DIAMANTE', 'MAESTRO', 'GRANMAESTRO', 'RETADOR');

-- CreateEnum
CREATE TYPE "AgeBracket" AS ENUM ('EDAD_16_17', 'EDAD_18_21', 'EDAD_22_MAS');

-- CreateEnum
CREATE TYPE "FreeAgentStatus" AS ENUM ('PUBLISHED', 'FILLED', 'HIDDEN');

-- AlterEnum
ALTER TYPE "ReportKind" ADD VALUE 'FREE_AGENT';

-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "freeAgentId" TEXT;

-- CreateTable
CREATE TABLE "FreeAgent" (
    "id" TEXT NOT NULL,
    "status" "FreeAgentStatus" NOT NULL DEFAULT 'PUBLISHED',
    "lolNick" TEXT NOT NULL,
    "discord" TEXT NOT NULL,
    "opggUrl" TEXT,
    "role" "PlayerRole" NOT NULL,
    "secondaryRole" "PlayerRole",
    "currentElo" "EloTier",
    "peakElo" "EloTier",
    "ageBracket" "AgeBracket" NOT NULL,
    "availability" TEXT NOT NULL,
    "about" TEXT,
    "playerId" TEXT,
    "manageToken" TEXT NOT NULL,
    "ipHash" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FreeAgent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FreeAgent_manageToken_key" ON "FreeAgent"("manageToken");

-- CreateIndex
CREATE INDEX "FreeAgent_status_expiresAt_idx" ON "FreeAgent"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "FreeAgent_role_idx" ON "FreeAgent"("role");

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_freeAgentId_fkey" FOREIGN KEY ("freeAgentId") REFERENCES "FreeAgent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FreeAgent" ADD CONSTRAINT "FreeAgent_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

