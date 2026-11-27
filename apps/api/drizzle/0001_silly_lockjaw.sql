CREATE TABLE "password_resets" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uk_password_resets_token" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "solicitud_contactos" (
	"solicitud_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "solicitud_contactos_solicitud_id_user_id_pk" PRIMARY KEY("solicitud_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "solicitudes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"especie_id" integer,
	"title" varchar(120) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"cantidad" integer,
	"peso_min_kg" numeric(8, 2),
	"peso_max_kg" numeric(8, 2),
	"presupuesto_min_usd" numeric(14, 2),
	"presupuesto_max_usd" numeric(14, 2),
	"modalidad_precio" varchar(20),
	"estado" varchar(40),
	"urgencia" varchar(20) NOT NULL,
	"status" varchar(20) DEFAULT 'activa' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "anuncios" ADD COLUMN "desparasitado" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "password_resets" ADD CONSTRAINT "password_resets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solicitud_contactos" ADD CONSTRAINT "solicitud_contactos_solicitud_id_solicitudes_id_fk" FOREIGN KEY ("solicitud_id") REFERENCES "public"."solicitudes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solicitud_contactos" ADD CONSTRAINT "solicitud_contactos_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solicitudes" ADD CONSTRAINT "solicitudes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solicitudes" ADD CONSTRAINT "solicitudes_especie_id_especies_id_fk" FOREIGN KEY ("especie_id") REFERENCES "public"."especies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_password_resets_user" ON "password_resets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ix_solicitudes_status" ON "solicitudes" USING btree ("status","expires_at");--> statement-breakpoint
CREATE INDEX "ix_solicitudes_user" ON "solicitudes" USING btree ("user_id");