CREATE TABLE "audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"admin_id" integer,
	"admin_name" varchar(100) NOT NULL,
	"admin_email" varchar(255) NOT NULL,
	"action" varchar(40) NOT NULL,
	"entity_type" varchar(30) NOT NULL,
	"entity_id" integer,
	"summary" varchar(500) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "denuncias" (
	"id" serial PRIMARY KEY NOT NULL,
	"anuncio_id" integer NOT NULL,
	"user_id" integer,
	"motivo" varchar(30) NOT NULL,
	"detalle" text DEFAULT '' NOT NULL,
	"status" varchar(20) DEFAULT 'pendiente' NOT NULL,
	"resolved_by" integer,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "denuncias" ADD CONSTRAINT "denuncias_anuncio_id_anuncios_id_fk" FOREIGN KEY ("anuncio_id") REFERENCES "public"."anuncios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "denuncias" ADD CONSTRAINT "denuncias_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "denuncias" ADD CONSTRAINT "denuncias_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_audit_created" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ix_audit_entity" ON "audit_log" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "ix_denuncias_status" ON "denuncias" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "uk_denuncias_user_anuncio" ON "denuncias" USING btree ("anuncio_id","user_id");