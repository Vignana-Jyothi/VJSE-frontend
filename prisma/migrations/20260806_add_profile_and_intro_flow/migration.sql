-- Add profile fields to User
ALTER TABLE "User" ADD COLUMN "phone" TEXT;
ALTER TABLE "User" ADD COLUMN "year" TEXT;
ALTER TABLE "User" ADD COLUMN "branch" TEXT;
ALTER TABLE "User" ADD COLUMN "profileCompleted" BOOLEAN NOT NULL DEFAULT false;

-- Add approval tracking to Lead
ALTER TABLE "Lead" ADD COLUMN "approvedByVolunteerId" INTEGER;
ALTER TABLE "Lead" ADD COLUMN "approvedAt" DATETIME;

-- Add intro flow tracking to ConnectionRequest
ALTER TABLE "ConnectionRequest" ADD COLUMN "sourcerResponse" TEXT;
ALTER TABLE "ConnectionRequest" ADD COLUMN "sourcerRespondedAt" DATETIME;
ALTER TABLE "ConnectionRequest" ADD COLUMN "mentorNotifiedAt" DATETIME;
ALTER TABLE "ConnectionRequest" ADD COLUMN "sourcerInviteToken" TEXT;
