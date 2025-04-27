// Fetch reviews for the given product ID, joining with unified_profiles to get reviewer details
const { data: reviews, error } = await supabase
  .from('product_reviews')
  .select(`
    *,
    unified_profiles!inner (
        id,
        first_name,
        last_name,
        avatar_url
    )
  `)
  .eq('product_id', productId)
  .order('created_at', { ascending: false }); 