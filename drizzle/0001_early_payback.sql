CREATE TABLE "source_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"interview_id" uuid NOT NULL,
	"url" text NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "source_chunks" ADD CONSTRAINT "source_chunks_interview_id_interviews_id_fk" FOREIGN KEY ("interview_id") REFERENCES "public"."interviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "source_chunks_interview_url_idx" ON "source_chunks" USING btree ("interview_id","url");--> statement-breakpoint
CREATE INDEX "source_chunks_interview_idx" ON "source_chunks" USING btree ("interview_id");--> statement-breakpoint
CREATE INDEX "source_chunks_fts_idx" ON "source_chunks" USING gin (to_tsvector('english', "title" || ' ' || "content"));