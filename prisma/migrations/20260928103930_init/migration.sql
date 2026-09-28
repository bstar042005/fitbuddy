-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "deviceId" TEXT,
    "hostelBlock" TEXT NOT NULL DEFAULT 'Hostel Block 4',
    "department" TEXT NOT NULL DEFAULT 'General',
    "weightKg" REAL,
    "fitPoints" INTEGER NOT NULL DEFAULT 0,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "highestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastActiveDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "WorkoutSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "exercise" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastRepAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalReps" INTEGER NOT NULL DEFAULT 0,
    "goodReps" INTEGER NOT NULL DEFAULT 0,
    "moderateReps" INTEGER NOT NULL DEFAULT 0,
    "poorReps" INTEGER NOT NULL DEFAULT 0,
    "formScore" REAL NOT NULL DEFAULT 0,
    "avgTempoMs" REAL NOT NULL DEFAULT 0,
    "avgConfidence" REAL NOT NULL DEFAULT 0,
    "fatigueLevel" TEXT NOT NULL DEFAULT 'none',
    CONSTRAINT "WorkoutSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Rep" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "exercise" TEXT NOT NULL,
    "confidence" REAL NOT NULL DEFAULT 1,
    "romDeg" REAL NOT NULL,
    "tempoMs" REAL NOT NULL,
    "swayDeg" REAL NOT NULL,
    "peakVel" REAL NOT NULL,
    "score" REAL NOT NULL,
    "quality" TEXT NOT NULL,
    "cues" TEXT NOT NULL DEFAULT '[]',
    "calibrated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Rep_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "WorkoutSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Rep_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Calibration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "exercise" TEXT NOT NULL,
    "romDeg" REAL NOT NULL,
    "romStd" REAL NOT NULL,
    "tempoMs" REAL NOT NULL,
    "tempoStd" REAL NOT NULL,
    "swayDeg" REAL NOT NULL,
    "swayStd" REAL NOT NULL,
    "peakVel" REAL NOT NULL,
    "velStd" REAL NOT NULL,
    "samples" INTEGER NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Calibration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ActivityEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "detail" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActivityEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MealLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "items" TEXT NOT NULL DEFAULT '[]',
    "calories" REAL NOT NULL,
    "protein" REAL NOT NULL,
    "carbs" REAL NOT NULL,
    "fats" REAL NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'rules',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MealLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DeviceConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "deviceId" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'WORKOUT',
    "sedentaryAlertMins" INTEGER NOT NULL DEFAULT 45,
    "postureAlertSecs" INTEGER NOT NULL DEFAULT 60,
    "challengeType" TEXT NOT NULL DEFAULT 'arm_circles',
    "challengeTarget" INTEGER NOT NULL DEFAULT 10,
    "strictFormMode" BOOLEAN NOT NULL DEFAULT false,
    "hapticFeedback" BOOLEAN NOT NULL DEFAULT true,
    "hapticIntensity" INTEGER NOT NULL DEFAULT 2,
    "confirmPulses" BOOLEAN NOT NULL DEFAULT true,
    "firmwareVersion" TEXT NOT NULL DEFAULT 'unknown',
    "batteryLevel" INTEGER,
    "lastSeenAt" DATETIME,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_deviceId_key" ON "User"("deviceId");

-- CreateIndex
CREATE INDEX "WorkoutSession_userId_lastRepAt_idx" ON "WorkoutSession"("userId", "lastRepAt");

-- CreateIndex
CREATE INDEX "Rep_userId_createdAt_idx" ON "Rep"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Calibration_userId_exercise_key" ON "Calibration"("userId", "exercise");

-- CreateIndex
CREATE INDEX "ActivityEvent_userId_type_createdAt_idx" ON "ActivityEvent"("userId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "MealLog_userId_createdAt_idx" ON "MealLog"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceConfig_deviceId_key" ON "DeviceConfig"("deviceId");
