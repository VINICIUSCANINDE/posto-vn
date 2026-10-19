CREATE TABLE "workshop_counters" (
	"id" text PRIMARY KEY NOT NULL,
	"units" integer NOT NULL,
	CONSTRAINT "workshop_nonnegative" CHECK ("workshop_counters"."units" >= 0)
);
