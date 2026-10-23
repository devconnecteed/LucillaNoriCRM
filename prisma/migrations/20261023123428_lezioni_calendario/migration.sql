-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Lesson" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "editionId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "date" DATETIME,
    "topic" TEXT,
    "durationMin" INTEGER NOT NULL DEFAULT 60,
    "location" TEXT,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "notifiedAt" DATETIME,
    CONSTRAINT "Lesson_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "CourseEdition" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Lesson" ("date", "durationMin", "editionId", "id", "number", "topic") SELECT "date", "durationMin", "editionId", "id", "number", "topic" FROM "Lesson";
DROP TABLE "Lesson";
ALTER TABLE "new_Lesson" RENAME TO "Lesson";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
