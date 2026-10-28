-- CreateEnum
CREATE TYPE "EmailMode" AS ENUM ('immediate', 'daily', 'off');

-- AlterTable
ALTER TABLE "UserNotification" ADD COLUMN "emailMode" "EmailMode";

-- AlterTable
ALTER TABLE "UserNotificationPreference"
  ALTER COLUMN "email" TYPE "EmailMode"
  USING CASE WHEN "email" THEN 'immediate'::"EmailMode" ELSE 'off'::"EmailMode" END;
