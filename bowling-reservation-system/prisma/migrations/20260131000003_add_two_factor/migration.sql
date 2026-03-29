-- AlterTable
ALTER TABLE "users" ADD COLUMN "totp_secret" TEXT,
ADD COLUMN "totp_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "totp_secret_pending" TEXT;

-- CreateTable
CREATE TABLE "two_factor_temp_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "two_factor_temp_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "two_factor_temp_tokens_token_key" ON "two_factor_temp_tokens"("token");

-- CreateIndex
CREATE INDEX "two_factor_temp_tokens_token_idx" ON "two_factor_temp_tokens"("token");

-- CreateIndex
CREATE INDEX "two_factor_temp_tokens_user_id_idx" ON "two_factor_temp_tokens"("user_id");

-- AddForeignKey
ALTER TABLE "two_factor_temp_tokens" ADD CONSTRAINT "two_factor_temp_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
