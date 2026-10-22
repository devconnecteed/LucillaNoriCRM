-- AlterTable
ALTER TABLE "CourseType" ADD COLUMN "lessonPriceCents" INTEGER;
ALTER TABLE "CourseType" ADD COLUMN "packagePriceCents" INTEGER;

-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "courseTypeId" TEXT NOT NULL,
    "studentId" TEXT,
    "prospectFirstName" TEXT NOT NULL,
    "prospectLastName" TEXT NOT NULL,
    "prospectEmail" TEXT NOT NULL,
    "prospectPhone" TEXT,
    "lessons" INTEGER NOT NULL,
    "lessonMinutes" INTEGER NOT NULL DEFAULT 60,
    "lines" JSONB NOT NULL,
    "discountPct" REAL NOT NULL DEFAULT 0,
    "vatRate" REAL NOT NULL DEFAULT 0,
    "subtotalCents" INTEGER NOT NULL,
    "discountCents" INTEGER NOT NULL,
    "vatCents" INTEGER NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "notes" TEXT,
    "validUntil" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "tokenHash" TEXT,
    "sentAt" DATETIME,
    "viewedAt" DATETIME,
    "acceptedAt" DATETIME,
    "acceptedName" TEXT,
    "acceptedIp" TEXT,
    "declinedAt" DATETIME,
    "declineReason" TEXT,
    "editionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Quote_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Quote_courseTypeId_fkey" FOREIGN KEY ("courseTypeId") REFERENCES "CourseType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Quote_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Quote_number_key" ON "Quote"("number");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_tokenHash_key" ON "Quote"("tokenHash");
