ALTER TABLE "scenarios" ADD COLUMN "slug" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "scenarios" ADD COLUMN "grader" text DEFAULT 'deterministic' NOT NULL;--> statement-breakpoint
ALTER TABLE "scenarios" ADD COLUMN "criteria" text[] DEFAULT '{}' NOT NULL;