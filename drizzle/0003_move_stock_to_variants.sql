-- Hand-added: carry each product's stock over as a single "One size" variant before dropping product_stock.
INSERT INTO "product_variants" ("product_id", "size", "sku", "stock")
SELECT p."id", 'One size', upper(p."slug") || '-OS', coalesce(s."quantity", 0)
FROM "products" p LEFT JOIN "product_stock" s ON s."product_id" = p."id"
ON CONFLICT DO NOTHING;--> statement-breakpoint
DROP TABLE "product_stock" CASCADE;
