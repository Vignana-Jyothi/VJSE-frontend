-- AlterTable: Add rejectionCount and isBlocked to User
ALTER TABLE "User" ADD COLUMN "rejectionCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "isBlocked" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: Add inviteToken and inviteAccepted to Lead
ALTER TABLE "Lead" ADD COLUMN "inviteToken" TEXT;
ALTER TABLE "Lead" ADD COLUMN "inviteAccepted" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable: SourcerRejectionLog
CREATE TABLE "SourcerRejectionLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sourcerId" INTEGER NOT NULL,
    "leadId" INTEGER NOT NULL,
    "connectionId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SourcerRejectionLog_sourcerId_fkey" FOREIGN KEY ("sourcerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SourcerRejectionLog_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SourcerRejectionLog_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "ConnectionRequest" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
