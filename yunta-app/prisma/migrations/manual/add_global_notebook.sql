-- Migration: add_global_notebook
-- Run this in Supabase SQL Editor before deploying

CREATE TABLE IF NOT EXISTS "global_notebook" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "key" TEXT NOT NULL DEFAULT 'GLOBAL',
    "content" TEXT NOT NULL DEFAULT '',
    "lastEditedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "global_notebook_pkey" PRIMARY KEY ("id")
);

-- Unique constraint on key
CREATE UNIQUE INDEX IF NOT EXISTS "global_notebook_key_key" ON "global_notebook"("key");

-- Insert the initial row
INSERT INTO "global_notebook" ("id", "key", "content", "lastEditedById", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'GLOBAL', '', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
