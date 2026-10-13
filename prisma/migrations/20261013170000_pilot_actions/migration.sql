CREATE TABLE "PilotAction" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "runId" TEXT NOT NULL,
  "operation" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "minute" INTEGER NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "PilotAction_runId_operation_targetId_minute_key" ON "PilotAction"("runId", "operation", "targetId", "minute");
CREATE INDEX "PilotAction_runId_minute_idx" ON "PilotAction"("runId", "minute");
