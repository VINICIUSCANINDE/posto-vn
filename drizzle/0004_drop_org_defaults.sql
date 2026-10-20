-- Remove o DEFAULT de transição da 0003: daqui em diante toda gravação informa a empresa explicitamente.
ALTER TABLE "entries" ALTER COLUMN "organization_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "organization_id" DROP DEFAULT;
