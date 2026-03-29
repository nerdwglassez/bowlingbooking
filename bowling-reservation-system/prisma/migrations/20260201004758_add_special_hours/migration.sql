-- CreateTable
CREATE TABLE "special_hours" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "open_time" TEXT,
    "close_time" TEXT,
    "is_closed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "special_hours_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "special_hours_date_key" ON "special_hours"("date");

-- CreateIndex
CREATE INDEX "special_hours_date_idx" ON "special_hours"("date");
