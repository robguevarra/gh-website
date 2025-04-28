-- Add collection_handles column to store an array of Shopify collection handles
ALTER TABLE public.shopify_products
ADD COLUMN collection_handles TEXT[] NULL;

-- Add a comment describing the new column
COMMENT ON COLUMN public.shopify_products.collection_handles IS 'Array of handles for Shopify collections this product belongs to.';

-- Add a GIN index for efficient querying of the collection_handles array
-- GIN indexes are well-suited for array containment operations (@>, <@, &&)
CREATE INDEX idx_products_collection_handles ON public.shopify_products USING gin (collection_handles); 