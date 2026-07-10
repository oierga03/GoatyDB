-- CreateIndex
CREATE UNIQUE INDEX "AwardEdition_awardDefinitionId_title_key" ON "AwardEdition"("awardDefinitionId", "title");

-- CreateIndex
CREATE UNIQUE INDEX "AwardRecipient_awardEditionId_playerId_key" ON "AwardRecipient"("awardEditionId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "Division_competitionEditionId_name_key" ON "Division"("competitionEditionId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Group_divisionId_name_key" ON "Group"("divisionId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "RosterMembership_playerId_teamEntryId_key" ON "RosterMembership"("playerId", "teamEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamEntry_teamId_divisionId_key" ON "TeamEntry"("teamId", "divisionId");

