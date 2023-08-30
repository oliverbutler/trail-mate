ALTER TABLE "user_sessions" ADD COLUMN "caller_ip" varchar NOT NULL;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD COLUMN "caller_user_agent" varchar NOT NULL;