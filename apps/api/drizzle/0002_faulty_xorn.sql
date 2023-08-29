CREATE TABLE IF NOT EXISTS "user_sessions" (
	"id" varchar PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"refresh_token_hash" varchar NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" varchar PRIMARY KEY NOT NULL,
	"given_name" varchar NOT NULL,
	"family_name" varchar NOT NULL,
	"email" varchar NOT NULL,
	"email_verified_at" timestamp,
	"email_verification_token" varchar NOT NULL,
	"username" varchar NOT NULL,
	"password_hash" varchar NOT NULL
);
--> statement-breakpoint
ALTER TABLE "queue" RENAME TO "queues";--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
