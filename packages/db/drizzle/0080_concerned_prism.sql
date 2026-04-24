CREATE TABLE "app_feedback" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" text,
	"rating" integer NOT NULL,
	"comment" text,
	"platform" text NOT NULL,
	"app_version" text,
	"source" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app_feedback" ADD CONSTRAINT "app_feedback_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "app_feedback_created_at_idx" ON "app_feedback" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "app_feedback_user_idx" ON "app_feedback" USING btree ("user_id");