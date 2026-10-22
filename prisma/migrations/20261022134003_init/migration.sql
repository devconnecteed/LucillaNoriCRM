-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT,
    "role" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" DATETIME
);

-- CreateTable
CREATE TABLE "Invite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "usedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Invite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "teacherId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "birthDate" DATETIME,
    "address" TEXT,
    "emergencyContact" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "adminNotes" TEXT,
    "goals" TEXT,
    "experience" TEXT,
    "preferences" TEXT,
    "leadSource" TEXT,
    "bridalInfo" JSONB,
    "physicalNotes" TEXT,
    "isMinor" BOOLEAN NOT NULL DEFAULT false,
    "guardianName" TEXT,
    "guardianEmail" TEXT,
    "guardianPhone" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Student_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Student_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TeacherNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TeacherNote_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ConsentRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "recordedById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ConsentRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CourseType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "durationLessons" INTEGER,
    "durationHours" REAL,
    "prerequisites" TEXT,
    "objectives" TEXT,
    "program" TEXT,
    "mode" TEXT NOT NULL DEFAULT 'INDIVIDUAL',
    "certificateEnabled" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "CourseEdition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courseTypeId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "minAttendancePct" INTEGER NOT NULL DEFAULT 80,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CourseEdition_courseTypeId_fkey" FOREIGN KEY ("courseTypeId") REFERENCES "CourseType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CourseEdition_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Lesson" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "editionId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "date" DATETIME,
    "topic" TEXT,
    "durationMin" INTEGER NOT NULL DEFAULT 60,
    CONSTRAINT "Lesson_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "CourseEdition" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Enrollment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "editionId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Enrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Enrollment_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "CourseEdition" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lessonId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "present" BOOLEAN NOT NULL,
    "note" TEXT,
    CONSTRAINT "Attendance_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Attendance_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QuestionnaireTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "courseTypeId" TEXT,
    "phase" TEXT NOT NULL,
    "audience" TEXT NOT NULL DEFAULT 'STUDENT',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "sourceFile" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "QuestionnaireTemplate_courseTypeId_fkey" FOREIGN KEY ("courseTypeId") REFERENCES "CourseType" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TemplateVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "content" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "authorId" TEXT,
    "publishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TemplateVersion_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "QuestionnaireTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TemplateVersion_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Assignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "versionId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "lessonId" TEXT,
    "assignedById" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "availableFrom" DATETIME,
    "dueAt" DATETIME,
    "maxAttempts" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "openedAt" DATETIME,
    CONSTRAINT "Assignment_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "TemplateVersion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Assignment_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Assignment_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Response" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assignmentId" TEXT NOT NULL,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "respondentId" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "submittedAt" DATETIME,
    "autoScore" REAL,
    "maxScore" REAL,
    "manualScore" REAL,
    "scoreNote" TEXT,
    "teacherFeedback" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Response_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Certificate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Attestato di partecipazione',
    "courseTitle" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "periodFrom" DATETIME,
    "periodTo" DATETIME,
    "hours" REAL,
    "issuedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issuedById" TEXT NOT NULL,
    "overrideReason" TEXT,
    "revokedAt" DATETIME,
    "revokeReason" TEXT,
    CONSTRAINT "Certificate_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "sentAt" DATETIME,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "data" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Invite_tokenHash_key" ON "Invite"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "Student_userId_key" ON "Student"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CourseType_slug_key" ON "CourseType"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Enrollment_studentId_editionId_key" ON "Enrollment"("studentId", "editionId");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_lessonId_enrollmentId_key" ON "Attendance"("lessonId", "enrollmentId");

-- CreateIndex
CREATE UNIQUE INDEX "TemplateVersion_templateId_version_key" ON "TemplateVersion"("templateId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "Response_assignmentId_attempt_key" ON "Response"("assignmentId", "attempt");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_number_key" ON "Certificate"("number");
