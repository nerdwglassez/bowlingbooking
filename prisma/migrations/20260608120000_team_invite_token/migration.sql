-- Migration 9: team invite tokens (magic-link staff onboarding)

CREATE TABLE "TeamInviteToken" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "invited_by_user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "personal_message" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamInviteToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TeamInviteToken_token_hash_key" ON "TeamInviteToken"("token_hash");
CREATE INDEX "TeamInviteToken_user_id_idx" ON "TeamInviteToken"("user_id");

ALTER TABLE "TeamInviteToken" ADD CONSTRAINT "TeamInviteToken_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeamInviteToken" ADD CONSTRAINT "TeamInviteToken_invited_by_user_id_fkey" FOREIGN KEY ("invited_by_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
