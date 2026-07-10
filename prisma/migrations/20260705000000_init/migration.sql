-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "PlayerRole" AS ENUM ('TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT', 'FLEX', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "PlayerStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'RETIRED');

-- CreateEnum
CREATE TYPE "TeamStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DISBANDED');

-- CreateEnum
CREATE TYPE "SplitStatus" AS ENUM ('UPCOMING', 'ACTIVE', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TeamEntryResult" AS ENUM ('CHAMPION', 'RUNNER_UP', 'SEMIFINALIST', 'QUARTERFINALIST', 'PLAYOFFS', 'GROUP_STAGE', 'PARTICIPATED', 'WITHDRAWN', 'DISQUALIFIED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "TeamEntryStatus" AS ENUM ('ACTIVE', 'ELIMINATED', 'WITHDRAWN', 'DISQUALIFIED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "RosterStatus" AS ENUM ('STARTER', 'SUBSTITUTE', 'SIXTH', 'COACH', 'MANAGER', 'ANALYST', 'INACTIVE');

-- CreateEnum
CREATE TYPE "AwardScopeType" AS ENUM ('SPLIT', 'DIVISION', 'MATCHDAY', 'OTHER');

-- CreateEnum
CREATE TYPE "AwardCategory" AS ENUM ('MVP', 'EXECUTOR', 'ASSISTANT', 'ALL_PRO', 'PERFORMANCE', 'CUSTOM');

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "primaryRole" "PlayerRole" NOT NULL DEFAULT 'UNKNOWN',
    "status" "PlayerStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerAlias" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),

    CONSTRAINT "PlayerAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "status" "TeamStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamAlias" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),

    CONSTRAINT "TeamAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Season" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),

    CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Split" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sequenceNumber" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "status" "SplitStatus" NOT NULL DEFAULT 'UPCOMING',

    CONSTRAINT "Split_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Competition" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "organizer" TEXT,
    "region" TEXT,
    "game" TEXT NOT NULL DEFAULT 'League of Legends',
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Competition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitionEdition" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "splitId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "SplitStatus" NOT NULL DEFAULT 'UPCOMING',

    CONSTRAINT "CompetitionEdition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Division" (
    "id" TEXT NOT NULL,
    "competitionEditionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Division_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Group" (
    "id" TEXT NOT NULL,
    "divisionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamEntry" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "divisionId" TEXT NOT NULL,
    "groupId" TEXT,
    "entryName" TEXT,
    "finalPosition" INTEGER,
    "finalResult" "TeamEntryResult" NOT NULL DEFAULT 'UNKNOWN',
    "status" "TeamEntryStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RosterMembership" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "teamEntryId" TEXT NOT NULL,
    "role" "PlayerRole" NOT NULL DEFAULT 'UNKNOWN',
    "rosterStatus" "RosterStatus" NOT NULL DEFAULT 'STARTER',
    "isCaptain" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3),
    "leftAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RosterMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AwardDefinition" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "scopeType" "AwardScopeType" NOT NULL,
    "category" "AwardCategory" NOT NULL,
    "description" TEXT,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "displayPriority" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AwardDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AwardEdition" (
    "id" TEXT NOT NULL,
    "awardDefinitionId" TEXT NOT NULL,
    "splitId" TEXT,
    "divisionId" TEXT,
    "title" TEXT NOT NULL,
    "awardedAt" TIMESTAMP(3),
    "imageUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AwardEdition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AwardRecipient" (
    "id" TEXT NOT NULL,
    "awardEditionId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "teamEntryId" TEXT,
    "placement" INTEGER NOT NULL DEFAULT 1,
    "citation" TEXT,

    CONSTRAINT "AwardRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Player_slug_key" ON "Player"("slug");

-- CreateIndex
CREATE INDEX "Player_primaryRole_idx" ON "Player"("primaryRole");

-- CreateIndex
CREATE INDEX "PlayerAlias_playerId_idx" ON "PlayerAlias"("playerId");

-- CreateIndex
CREATE INDEX "PlayerAlias_alias_idx" ON "PlayerAlias"("alias");

-- CreateIndex
CREATE UNIQUE INDEX "Team_slug_key" ON "Team"("slug");

-- CreateIndex
CREATE INDEX "TeamAlias_teamId_idx" ON "TeamAlias"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "Season_name_key" ON "Season"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Split_slug_key" ON "Split"("slug");

-- CreateIndex
CREATE INDEX "Split_seasonId_idx" ON "Split"("seasonId");

-- CreateIndex
CREATE UNIQUE INDEX "Competition_slug_key" ON "Competition"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "CompetitionEdition_slug_key" ON "CompetitionEdition"("slug");

-- CreateIndex
CREATE INDEX "CompetitionEdition_splitId_idx" ON "CompetitionEdition"("splitId");

-- CreateIndex
CREATE UNIQUE INDEX "CompetitionEdition_competitionId_splitId_key" ON "CompetitionEdition"("competitionId", "splitId");

-- CreateIndex
CREATE INDEX "Division_competitionEditionId_idx" ON "Division"("competitionEditionId");

-- CreateIndex
CREATE INDEX "Group_divisionId_idx" ON "Group"("divisionId");

-- CreateIndex
CREATE INDEX "TeamEntry_teamId_idx" ON "TeamEntry"("teamId");

-- CreateIndex
CREATE INDEX "TeamEntry_divisionId_idx" ON "TeamEntry"("divisionId");

-- CreateIndex
CREATE INDEX "TeamEntry_groupId_idx" ON "TeamEntry"("groupId");

-- CreateIndex
CREATE INDEX "RosterMembership_playerId_idx" ON "RosterMembership"("playerId");

-- CreateIndex
CREATE INDEX "RosterMembership_teamEntryId_idx" ON "RosterMembership"("teamEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "AwardDefinition_slug_key" ON "AwardDefinition"("slug");

-- CreateIndex
CREATE INDEX "AwardEdition_awardDefinitionId_idx" ON "AwardEdition"("awardDefinitionId");

-- CreateIndex
CREATE INDEX "AwardEdition_splitId_idx" ON "AwardEdition"("splitId");

-- CreateIndex
CREATE INDEX "AwardEdition_divisionId_idx" ON "AwardEdition"("divisionId");

-- CreateIndex
CREATE INDEX "AwardRecipient_awardEditionId_idx" ON "AwardRecipient"("awardEditionId");

-- CreateIndex
CREATE INDEX "AwardRecipient_playerId_idx" ON "AwardRecipient"("playerId");

-- CreateIndex
CREATE INDEX "AwardRecipient_teamEntryId_idx" ON "AwardRecipient"("teamEntryId");

-- AddForeignKey
ALTER TABLE "PlayerAlias" ADD CONSTRAINT "PlayerAlias_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamAlias" ADD CONSTRAINT "TeamAlias_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Split" ADD CONSTRAINT "Split_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionEdition" ADD CONSTRAINT "CompetitionEdition_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionEdition" ADD CONSTRAINT "CompetitionEdition_splitId_fkey" FOREIGN KEY ("splitId") REFERENCES "Split"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Division" ADD CONSTRAINT "Division_competitionEditionId_fkey" FOREIGN KEY ("competitionEditionId") REFERENCES "CompetitionEdition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_divisionId_fkey" FOREIGN KEY ("divisionId") REFERENCES "Division"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamEntry" ADD CONSTRAINT "TeamEntry_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamEntry" ADD CONSTRAINT "TeamEntry_divisionId_fkey" FOREIGN KEY ("divisionId") REFERENCES "Division"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamEntry" ADD CONSTRAINT "TeamEntry_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RosterMembership" ADD CONSTRAINT "RosterMembership_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RosterMembership" ADD CONSTRAINT "RosterMembership_teamEntryId_fkey" FOREIGN KEY ("teamEntryId") REFERENCES "TeamEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AwardEdition" ADD CONSTRAINT "AwardEdition_awardDefinitionId_fkey" FOREIGN KEY ("awardDefinitionId") REFERENCES "AwardDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AwardEdition" ADD CONSTRAINT "AwardEdition_splitId_fkey" FOREIGN KEY ("splitId") REFERENCES "Split"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AwardEdition" ADD CONSTRAINT "AwardEdition_divisionId_fkey" FOREIGN KEY ("divisionId") REFERENCES "Division"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AwardRecipient" ADD CONSTRAINT "AwardRecipient_awardEditionId_fkey" FOREIGN KEY ("awardEditionId") REFERENCES "AwardEdition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AwardRecipient" ADD CONSTRAINT "AwardRecipient_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AwardRecipient" ADD CONSTRAINT "AwardRecipient_teamEntryId_fkey" FOREIGN KEY ("teamEntryId") REFERENCES "TeamEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

