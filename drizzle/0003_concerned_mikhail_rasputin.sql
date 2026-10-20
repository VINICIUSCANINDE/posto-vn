CREATE TABLE "organization" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"document" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Todo o conteúdo existente pertence à primeira empresa; nada além do vínculo é alterado.
INSERT INTO "organization" ("id", "name") VALUES ('empresa-principal', 'Empresa principal');--> statement-breakpoint
-- O DEFAULT preenche as linhas atuais e cobre o código anterior até o deploy; a migração seguinte o remove.
ALTER TABLE "entries" ADD COLUMN "organization_id" text DEFAULT 'empresa-principal' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "organization_id" text DEFAULT 'empresa-principal';--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "entries_org_kind_idx" ON "entries" USING btree ("organization_id","kind");
