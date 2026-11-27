CREATE TABLE "roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(50) NOT NULL,
	"description" varchar(255) NOT NULL,
	CONSTRAINT "uk_roles_name" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" varchar(255) NOT NULL,
	"name" varchar(100) NOT NULL,
	"phone" varchar(20),
	"document_type" varchar(10),
	"document_number" varchar(20),
	"status" varchar(20) DEFAULT 'activo' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uk_users_email" UNIQUE("email"),
	CONSTRAINT "uk_users_document" UNIQUE("document_number")
);
--> statement-breakpoint
CREATE TABLE "users_to_roles" (
	"user_id" integer NOT NULL,
	"role_id" integer NOT NULL,
	CONSTRAINT "users_to_roles_user_id_role_id_pk" PRIMARY KEY("user_id","role_id")
);
--> statement-breakpoint
CREATE TABLE "especies" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(60) NOT NULL,
	"name" varchar(60) NOT NULL,
	"icon" varchar(30) DEFAULT 'beef' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "uk_especies_slug" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "razas" (
	"id" serial PRIMARY KEY NOT NULL,
	"especie_id" integer NOT NULL,
	"slug" varchar(80) NOT NULL,
	"name" varchar(80) NOT NULL,
	"proposito" varchar(20),
	CONSTRAINT "uk_razas_slug" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" varchar(60) PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fincas" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_id" integer NOT NULL,
	"name" varchar(120) NOT NULL,
	"slug" varchar(140) NOT NULL,
	"estado" varchar(40) NOT NULL,
	"municipio" varchar(120) NOT NULL,
	"direccion" varchar(255),
	"hectareas" numeric(12, 2),
	"descripcion" text,
	"whatsapp" varchar(20) NOT NULL,
	"rif" varchar(20),
	"hierro" varchar(60),
	"logo_url" varchar(500),
	"cover_url" varchar(500),
	"verificacion" varchar(20) DEFAULT 'pendiente' NOT NULL,
	"verificada_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uk_fincas_slug" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "anuncio_media" (
	"id" serial PRIMARY KEY NOT NULL,
	"anuncio_id" integer NOT NULL,
	"url" varchar(500) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "anuncios" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_id" integer NOT NULL,
	"finca_id" integer NOT NULL,
	"especie_id" integer NOT NULL,
	"raza_id" integer,
	"title" varchar(120) NOT NULL,
	"slug" varchar(140) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"tipo" varchar(20) NOT NULL,
	"categoria_animal" varchar(20),
	"sexo" varchar(10) NOT NULL,
	"cantidad" integer DEFAULT 1 NOT NULL,
	"edad_meses" integer,
	"peso_promedio_kg" numeric(8, 2),
	"precio_usd" numeric(14, 2) NOT NULL,
	"modalidad_precio" varchar(20) NOT NULL,
	"negociable" boolean DEFAULT true NOT NULL,
	"estado" varchar(40) NOT NULL,
	"municipio" varchar(120) NOT NULL,
	"vacuna_aftosa" boolean DEFAULT false NOT NULL,
	"vacuna_brucelosis" boolean DEFAULT false NOT NULL,
	"guia_movilizacion" boolean DEFAULT false NOT NULL,
	"registro_genealogico" boolean DEFAULT false NOT NULL,
	"video_url" varchar(500),
	"status" varchar(20) DEFAULT 'borrador' NOT NULL,
	"rejection_reason" varchar(500),
	"is_featured" boolean DEFAULT false NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"whatsapp_clicks" integer DEFAULT 0 NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uk_anuncios_slug" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "consultas" (
	"id" serial PRIMARY KEY NOT NULL,
	"anuncio_id" integer NOT NULL,
	"user_id" integer,
	"name" varchar(100) NOT NULL,
	"phone" varchar(20) NOT NULL,
	"email" varchar(255),
	"message" text NOT NULL,
	"status" varchar(20) DEFAULT 'nueva' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "favoritos" (
	"user_id" integer NOT NULL,
	"anuncio_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "favoritos_user_id_anuncio_id_pk" PRIMARY KEY("user_id","anuncio_id")
);
--> statement-breakpoint
CREATE TABLE "pujas" (
	"id" serial PRIMARY KEY NOT NULL,
	"lote_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"monto_usd" numeric(14, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subasta_lotes" (
	"id" serial PRIMARY KEY NOT NULL,
	"subasta_id" integer NOT NULL,
	"anuncio_id" integer NOT NULL,
	"orden" integer DEFAULT 1 NOT NULL,
	"precio_base_usd" numeric(14, 2) NOT NULL,
	"incremento_usd" numeric(14, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subastas" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_id" integer NOT NULL,
	"finca_id" integer NOT NULL,
	"title" varchar(150) NOT NULL,
	"slug" varchar(170) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"status" varchar(20) DEFAULT 'borrador' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uk_subastas_slug" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "servicios" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"tipo" varchar(20) NOT NULL,
	"name" varchar(120) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"whatsapp" varchar(20) NOT NULL,
	"estados" text[] DEFAULT '{}' NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users_to_roles" ADD CONSTRAINT "users_to_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users_to_roles" ADD CONSTRAINT "users_to_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "razas" ADD CONSTRAINT "razas_especie_id_especies_id_fk" FOREIGN KEY ("especie_id") REFERENCES "public"."especies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fincas" ADD CONSTRAINT "fincas_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anuncio_media" ADD CONSTRAINT "anuncio_media_anuncio_id_anuncios_id_fk" FOREIGN KEY ("anuncio_id") REFERENCES "public"."anuncios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anuncios" ADD CONSTRAINT "anuncios_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anuncios" ADD CONSTRAINT "anuncios_finca_id_fincas_id_fk" FOREIGN KEY ("finca_id") REFERENCES "public"."fincas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anuncios" ADD CONSTRAINT "anuncios_especie_id_especies_id_fk" FOREIGN KEY ("especie_id") REFERENCES "public"."especies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anuncios" ADD CONSTRAINT "anuncios_raza_id_razas_id_fk" FOREIGN KEY ("raza_id") REFERENCES "public"."razas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultas" ADD CONSTRAINT "consultas_anuncio_id_anuncios_id_fk" FOREIGN KEY ("anuncio_id") REFERENCES "public"."anuncios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultas" ADD CONSTRAINT "consultas_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favoritos" ADD CONSTRAINT "favoritos_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favoritos" ADD CONSTRAINT "favoritos_anuncio_id_anuncios_id_fk" FOREIGN KEY ("anuncio_id") REFERENCES "public"."anuncios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pujas" ADD CONSTRAINT "pujas_lote_id_subasta_lotes_id_fk" FOREIGN KEY ("lote_id") REFERENCES "public"."subasta_lotes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pujas" ADD CONSTRAINT "pujas_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subasta_lotes" ADD CONSTRAINT "subasta_lotes_subasta_id_subastas_id_fk" FOREIGN KEY ("subasta_id") REFERENCES "public"."subastas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subasta_lotes" ADD CONSTRAINT "subasta_lotes_anuncio_id_anuncios_id_fk" FOREIGN KEY ("anuncio_id") REFERENCES "public"."anuncios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subastas" ADD CONSTRAINT "subastas_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subastas" ADD CONSTRAINT "subastas_finca_id_fincas_id_fk" FOREIGN KEY ("finca_id") REFERENCES "public"."fincas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "servicios" ADD CONSTRAINT "servicios_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_fincas_owner" ON "fincas" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "ix_anuncio_media_anuncio" ON "anuncio_media" USING btree ("anuncio_id");--> statement-breakpoint
CREATE INDEX "ix_anuncios_status" ON "anuncios" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ix_anuncios_estado" ON "anuncios" USING btree ("estado");--> statement-breakpoint
CREATE INDEX "ix_anuncios_especie" ON "anuncios" USING btree ("especie_id");--> statement-breakpoint
CREATE INDEX "ix_anuncios_owner" ON "anuncios" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "ix_anuncios_finca" ON "anuncios" USING btree ("finca_id");--> statement-breakpoint
CREATE INDEX "ix_consultas_anuncio" ON "consultas" USING btree ("anuncio_id");--> statement-breakpoint
CREATE INDEX "ix_pujas_lote" ON "pujas" USING btree ("lote_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uk_subasta_lotes" ON "subasta_lotes" USING btree ("subasta_id","anuncio_id");