-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "pinnedAt" TIMESTAMP(3),
ADD COLUMN     "pinnedById" TEXT;
