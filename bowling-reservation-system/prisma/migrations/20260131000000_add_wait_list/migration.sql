-- CreateTable
CREATE TABLE "wait_list_entries" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "start_time" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "num_lanes" INTEGER NOT NULL DEFAULT 1,
    "notify_sms" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "claim_token" TEXT,
    "claim_expires_at" TIMESTAMP(3),
    "notified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wait_list_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "wait_list_entries_claim_token_key" ON "wait_list_entries"("claim_token");

-- CreateIndex
CREATE INDEX "wait_list_entries_user_id_idx" ON "wait_list_entries"("user_id");

-- CreateIndex
CREATE INDEX "wait_list_entries_date_start_time_status_idx" ON "wait_list_entries"("date", "start_time", "status");

-- CreateIndex
CREATE INDEX "wait_list_entries_claim_token_idx" ON "wait_list_entries"("claim_token");

-- AddForeignKey
ALTER TABLE "wait_list_entries" ADD CONSTRAINT "wait_list_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
