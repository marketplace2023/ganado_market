CREATE TABLE "reservas_anuncio" (
	"id" serial PRIMARY KEY NOT NULL,
	"anuncio_id" integer NOT NULL,
	"solicitud_id" uuid NOT NULL,
	"cantidad" integer NOT NULL,
	"precio_usd" numeric(14, 2) NOT NULL,
	"modalidad_precio" varchar(20) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"resultado" varchar(20)
);
--> statement-breakpoint
ALTER TABLE "reservas_anuncio" ADD CONSTRAINT "reservas_anuncio_anuncio_id_anuncios_id_fk" FOREIGN KEY ("anuncio_id") REFERENCES "public"."anuncios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uk_reservas_anuncio_solicitud" ON "reservas_anuncio" USING btree ("anuncio_id","solicitud_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uk_reservas_anuncio_abierta" ON "reservas_anuncio" USING btree ("anuncio_id") WHERE "reservas_anuncio"."ended_at" is null;