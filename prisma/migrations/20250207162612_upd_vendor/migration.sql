/*
  Warnings:

  - Added the required column `vendorId` to the `Lead` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AreaType" AS ENUM ('Kitchen', 'Utility', 'Other');

-- CreateEnum
CREATE TYPE "WorkType" AS ENUM ('Cabinate', 'Hardware', 'Finish');

-- CreateEnum
CREATE TYPE "AdditionalItemsList" AS ENUM ('Counter_top', 'Appliances', 'Sink');

-- AlterEnum
ALTER TYPE "TransactionName" ADD VALUE 'VENDOR_PAYMENT';

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "additionalItemsCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "expectedHandoverDate" TIMESTAMP(3),
ADD COLUMN     "init" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "receiveCash" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "receiveOnline" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "totalExp" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "vendorId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "fullName" TEXT,
ADD COLUMN     "otp" TEXT;

-- CreateTable
CREATE TABLE "AdditionalItems" (
    "id" SERIAL NOT NULL,
    "category" "AdditionalItemsList" NOT NULL,
    "prodName" TEXT NOT NULL,
    "custPrice" DOUBLE PRECISION NOT NULL,
    "landingPrice" DOUBLE PRECISION,
    "model" TEXT,
    "make" TEXT,
    "leadId" INTEGER NOT NULL,

    CONSTRAINT "AdditionalItems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProvidedItems" (
    "id" SERIAL NOT NULL,
    "category" "WorkType" NOT NULL,
    "area" "AreaType" NOT NULL,
    "brand" TEXT NOT NULL,
    "remark" TEXT,
    "leadId" INTEGER NOT NULL,

    CONSTRAINT "ProvidedItems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreExpNotes" (
    "id" SERIAL NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "transactionName" "TransactionName" NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "StoreExpNotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vendor" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "mobileNo" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "TotalCharge" DOUBLE PRECISION NOT NULL,
    "GivenCharge" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdditionalItems" ADD CONSTRAINT "AdditionalItems_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProvidedItems" ADD CONSTRAINT "ProvidedItems_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreExpNotes" ADD CONSTRAINT "StoreExpNotes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
