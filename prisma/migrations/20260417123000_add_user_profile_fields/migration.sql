-- Add profile fields to User table
ALTER TABLE "User"
ADD COLUMN "gender" TEXT,
ADD COLUMN "profileImage" TEXT;
