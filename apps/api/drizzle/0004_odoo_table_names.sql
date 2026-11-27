ALTER TABLE "public"."users" RENAME TO "res_users";
--> statement-breakpoint
ALTER TABLE "public"."roles" RENAME TO "res_groups";
--> statement-breakpoint
ALTER TABLE "public"."users_to_roles" RENAME TO "res_groups_users_rel";
--> statement-breakpoint
ALTER TABLE "public"."settings" RENAME TO "ir_config_parameter";
--> statement-breakpoint
ALTER TABLE "public"."anuncio_media" RENAME TO "product_image";
--> statement-breakpoint
ALTER TABLE "public"."consultas" RENAME TO "crm_lead";
--> statement-breakpoint
ALTER TABLE "public"."favoritos" RENAME TO "product_wishlist";
--> statement-breakpoint
ALTER TABLE "public"."especies" RENAME TO "livestock_species";
--> statement-breakpoint
ALTER TABLE "public"."razas" RENAME TO "livestock_breed";
--> statement-breakpoint
ALTER TABLE "public"."fincas" RENAME TO "livestock_farm";
--> statement-breakpoint
ALTER TABLE "public"."anuncios" RENAME TO "livestock_listing";
--> statement-breakpoint
ALTER TABLE "public"."reservas_anuncio" RENAME TO "livestock_listing_reservation";
--> statement-breakpoint
ALTER TABLE "public"."solicitudes" RENAME TO "livestock_purchase_request";
--> statement-breakpoint
ALTER TABLE "public"."solicitud_contactos" RENAME TO "livestock_purchase_request_contact";
--> statement-breakpoint
ALTER TABLE "public"."password_resets" RENAME TO "livestock_password_reset";
--> statement-breakpoint
ALTER TABLE "public"."subastas" RENAME TO "livestock_auction";
--> statement-breakpoint
ALTER TABLE "public"."subasta_lotes" RENAME TO "livestock_auction_lot";
--> statement-breakpoint
ALTER TABLE "public"."pujas" RENAME TO "livestock_auction_bid";
--> statement-breakpoint
ALTER TABLE "public"."servicios" RENAME TO "livestock_service";
--> statement-breakpoint
ALTER TABLE "public"."denuncias" RENAME TO "livestock_listing_report";
--> statement-breakpoint
ALTER TABLE "public"."audit_log" RENAME TO "livestock_audit_log";
