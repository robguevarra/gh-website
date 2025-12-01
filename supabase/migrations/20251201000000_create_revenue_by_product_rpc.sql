-- Create function to get revenue by product (including products with 0 sales)
create or replace function public.get_revenue_by_product(
  p_start_date timestamp with time zone default null,
  p_end_date timestamp with time zone default null,
  p_source_platform text default null -- 'shopify' or 'xendit' (though currently all products are shopify_products)
)
returns table (
  product_identifier text,
  product_name text,
  source_platform text,
  total_revenue numeric,
  units_sold bigint,
  average_transaction_value numeric
)
language plpgsql
security definer
as $$
begin
  return query
  select
    sp.id as product_identifier,
    sp.title as product_name,
    'shopify'::text as source_platform,
    coalesce(sum(eoi.price_at_purchase * eoi.quantity), 0) as total_revenue,
    coalesce(sum(eoi.quantity), 0) as units_sold,
    case 
      when count(eo.id) > 0 then coalesce(sum(eoi.price_at_purchase * eoi.quantity), 0) / count(eo.id)
      else 0
    end as average_transaction_value
  from
    public.shopify_products sp
    left join public.ecommerce_order_items eoi on sp.id = eoi.product_id
    left join public.ecommerce_orders eo on eoi.order_id = eo.id 
      and eo.order_status = 'paid' -- Only count paid orders
      and (p_start_date is null or eo.created_at >= p_start_date)
      and (p_end_date is null or eo.created_at <= p_end_date)
  where
    -- Optional: filter by source platform if we had multiple product tables, 
    -- but for now we just return 'shopify' for all shopify_products.
    -- If p_source_platform is 'xendit', we might return nothing or handle it differently if xendit products existed separately.
    (p_source_platform is null or p_source_platform = 'shopify')
  group by
    sp.id,
    sp.title
  order by
    total_revenue desc,
    units_sold desc;
end;
$$;

-- Grant access to authenticated users (admins)
grant execute on function public.get_revenue_by_product to authenticated;
