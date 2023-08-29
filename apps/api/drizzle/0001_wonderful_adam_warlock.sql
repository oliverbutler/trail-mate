DO $$ BEGIN
 CREATE TYPE "status" AS ENUM('pending', 'failed', 'completed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "queue" (
	"id" serial PRIMARY KEY NOT NULL,
	"status" "status" DEFAULT 'pending' NOT NULL,
	"try_count" integer DEFAULT 0 NOT NULL,
	"max_tries" integer DEFAULT 5 NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"create_time" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"update_time" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
