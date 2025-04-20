-- Migration: Create Facebook Ads schema tables (Phase 4-1)

CREATE TABLE public.ad_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fb_campaign_id text UNIQUE NOT NULL,
  name text,
  objective text,
  status text,
  effective_status text,
  start_time timestamptz,
  stop_time timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ad_campaigns_fb_campaign_id ON public.ad_campaigns(fb_campaign_id);

CREATE TABLE public.ad_adsets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.ad_campaigns(id) ON DELETE CASCADE,
  fb_adset_id text UNIQUE NOT NULL,
  name text,
  status text,
  effective_status text,
  daily_budget numeric,
  lifetime_budget numeric,
  targeting_summary text,
  start_time timestamptz,
  stop_time timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ad_adsets_fb_adset_id ON public.ad_adsets(fb_adset_id);
CREATE INDEX idx_ad_adsets_campaign_id ON public.ad_adsets(campaign_id);

CREATE TABLE public.ad_ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  adset_id uuid REFERENCES public.ad_adsets(id) ON DELETE CASCADE,
  fb_ad_id text UNIQUE NOT NULL,
  name text,
  status text,
  effective_status text,
  creative_id text,
  creative_summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ad_ads_fb_ad_id ON public.ad_ads(fb_ad_id);
CREATE INDEX idx_ad_ads_adset_id ON public.ad_ads(adset_id);

CREATE TABLE public.ad_spend (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  campaign_id uuid REFERENCES public.ad_campaigns(id),
  adset_id uuid REFERENCES public.ad_adsets(id),
  ad_id uuid REFERENCES public.ad_ads(id),
  spend numeric NOT NULL,
  impressions integer,
  clicks integer,
  currency text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ad_spend_date_ad_id ON public.ad_spend(date, ad_id);

CREATE TABLE public.ad_attributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.unified_profiles(id),
  transaction_id uuid UNIQUE REFERENCES public.transactions(id),
  campaign_id uuid REFERENCES public.ad_campaigns(id),
  adset_id uuid REFERENCES public.ad_adsets(id),
  ad_id uuid REFERENCES public.ad_ads(id),
  conversion_event text NOT NULL,
  event_time timestamptz NOT NULL,
  conversion_value numeric,
  currency text,
  source_platform text NOT NULL DEFAULT 'facebook',
  fb_click_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ad_attributions_user_id ON public.ad_attributions(user_id);
CREATE INDEX idx_ad_attributions_campaign_id ON public.ad_attributions(campaign_id);
CREATE INDEX idx_ad_attributions_adset_id ON public.ad_attributions(adset_id);
CREATE INDEX idx_ad_attributions_ad_id ON public.ad_attributions(ad_id);
CREATE INDEX idx_ad_attributions_event_time ON public.ad_attributions(event_time);
