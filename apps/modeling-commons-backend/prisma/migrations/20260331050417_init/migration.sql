-- CreateEnum
CREATE TYPE "ModelVisibility" AS ENUM ('public', 'private', 'unlisted');

-- CreateEnum
CREATE TYPE "SystemRole" AS ENUM ('admin', 'moderator', 'user');

-- CreateEnum
CREATE TYPE "UserKind" AS ENUM ('student', 'teacher', 'researcher', 'other');

-- CreateEnum
CREATE TYPE "AuthorRole" AS ENUM ('owner', 'contributor');

-- CreateEnum
CREATE TYPE "PermissionLevel" AS ENUM ('read', 'write', 'admin');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "systemRole" "SystemRole" NOT NULL DEFAULT 'user',
    "userKind" "UserKind" NOT NULL DEFAULT 'other',
    "isProfilePublic" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "role" TEXT,
    "banned" BOOLEAN,
    "banReason" TEXT,
    "banExpires" TIMESTAMPTZ(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMPTZ(3),
    "refreshTokenExpiresAt" TIMESTAMPTZ(3),
    "scope" TEXT,
    "idToken" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "impersonatedBy" TEXT,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3),
    "userId" TEXT,

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Model" (
    "id" TEXT NOT NULL,
    "latestVersionId" TEXT,
    "parentModelId" TEXT,
    "parentVersionId" TEXT,
    "visibility" "ModelVisibility" NOT NULL DEFAULT 'public',
    "isEndorsed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Model_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelVersion" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "previewImage" BYTEA,
    "nlogoxFileId" TEXT NOT NULL,
    "netlogoVersion" TEXT,
    "infoTab" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalizedAt" TIMESTAMP(3),

    CONSTRAINT "ModelVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelVersionFile" (
    "id" TEXT NOT NULL,
    "modelVersionId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,

    CONSTRAINT "ModelVersionFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelVersionTag" (
    "modelVersionId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModelVersionTag_pkey" PRIMARY KEY ("modelVersionId","tagId")
);

-- CreateTable
CREATE TABLE "File" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "blob" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelAdditionalFile" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "taggedVersionId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModelAdditionalFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelAuthor" (
    "modelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "AuthorRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModelAuthor_pkey" PRIMARY KEY ("modelId","userId")
);

-- CreateTable
CREATE TABLE "ModelPermission" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "granteeUserId" TEXT,
    "permissionLevel" "PermissionLevel" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModelPermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Verification_userId_idx" ON "Verification"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Model_latestVersionId_key" ON "Model"("latestVersionId");

-- CreateIndex
CREATE INDEX "Model_parentModelId_idx" ON "Model"("parentModelId");

-- CreateIndex
CREATE INDEX "Model_parentVersionId_idx" ON "Model"("parentVersionId");

-- CreateIndex
CREATE INDEX "ModelVersion_modelId_idx" ON "ModelVersion"("modelId");

-- CreateIndex
CREATE UNIQUE INDEX "ModelVersion_modelId_versionNumber_key" ON "ModelVersion"("modelId", "versionNumber");

-- CreateIndex
CREATE INDEX "ModelVersionFile_modelVersionId_idx" ON "ModelVersionFile"("modelVersionId");

-- CreateIndex
CREATE INDEX "ModelVersionFile_fileId_idx" ON "ModelVersionFile"("fileId");

-- CreateIndex
CREATE INDEX "ModelVersionTag_tagId_idx" ON "ModelVersionTag"("tagId");

-- CreateIndex
CREATE INDEX "ModelAdditionalFile_modelId_idx" ON "ModelAdditionalFile"("modelId");

-- CreateIndex
CREATE INDEX "ModelAdditionalFile_taggedVersionId_idx" ON "ModelAdditionalFile"("taggedVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE INDEX "ModelAuthor_userId_idx" ON "ModelAuthor"("userId");

-- CreateIndex
CREATE INDEX "ModelPermission_modelId_idx" ON "ModelPermission"("modelId");

-- CreateIndex
CREATE INDEX "ModelPermission_granteeUserId_idx" ON "ModelPermission"("granteeUserId");

-- CreateIndex
CREATE UNIQUE INDEX "ModelPermission_modelId_granteeUserId_key" ON "ModelPermission"("modelId", "granteeUserId");

-- CreateIndex
CREATE INDEX "Event_actorId_idx" ON "Event"("actorId");

-- CreateIndex
CREATE INDEX "Event_resourceType_resourceId_idx" ON "Event"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "Event_type_idx" ON "Event"("type");

-- CreateIndex
CREATE INDEX "Event_processedAt_idx" ON "Event"("processedAt");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Verification" ADD CONSTRAINT "Verification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Model" ADD CONSTRAINT "Model_latestVersionId_fkey" FOREIGN KEY ("latestVersionId") REFERENCES "ModelVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Model" ADD CONSTRAINT "Model_parentModelId_fkey" FOREIGN KEY ("parentModelId") REFERENCES "Model"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Model" ADD CONSTRAINT "Model_parentVersionId_fkey" FOREIGN KEY ("parentVersionId") REFERENCES "ModelVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelVersion" ADD CONSTRAINT "ModelVersion_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "Model"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelVersion" ADD CONSTRAINT "ModelVersion_nlogoxFileId_fkey" FOREIGN KEY ("nlogoxFileId") REFERENCES "File"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelVersionFile" ADD CONSTRAINT "ModelVersionFile_modelVersionId_fkey" FOREIGN KEY ("modelVersionId") REFERENCES "ModelVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelVersionFile" ADD CONSTRAINT "ModelVersionFile_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelVersionTag" ADD CONSTRAINT "ModelVersionTag_modelVersionId_fkey" FOREIGN KEY ("modelVersionId") REFERENCES "ModelVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelVersionTag" ADD CONSTRAINT "ModelVersionTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelAdditionalFile" ADD CONSTRAINT "ModelAdditionalFile_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "Model"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelAdditionalFile" ADD CONSTRAINT "ModelAdditionalFile_taggedVersionId_fkey" FOREIGN KEY ("taggedVersionId") REFERENCES "ModelVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelAdditionalFile" ADD CONSTRAINT "ModelAdditionalFile_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelAuthor" ADD CONSTRAINT "ModelAuthor_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "Model"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelAuthor" ADD CONSTRAINT "ModelAuthor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelPermission" ADD CONSTRAINT "ModelPermission_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "Model"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelPermission" ADD CONSTRAINT "ModelPermission_granteeUserId_fkey" FOREIGN KEY ("granteeUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
