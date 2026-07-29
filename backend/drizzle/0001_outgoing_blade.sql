CREATE TABLE "favorites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"entity_id" uuid NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporter_id" uuid,
	"entity_id" uuid NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"reason" varchar(255) NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "featured" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "reviewed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "ratings" ADD COLUMN "is_dislike" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "ratings" ADD COLUMN "voter_id" varchar(255);