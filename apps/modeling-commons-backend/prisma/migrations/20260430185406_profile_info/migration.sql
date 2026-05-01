-- AlterTable
ALTER TABLE "User" ADD COLUMN     "affiliation" TEXT,
ADD COLUMN     "bio" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "dob" DATE,
ADD COLUMN     "socialLinks" JSONB;
