ALTER TABLE public.properties
  ADD COLUMN market text NOT NULL DEFAULT 'india',
  ADD COLUMN country text NOT NULL DEFAULT 'India',
  ADD COLUMN region text,
  ADD COLUMN postal_code text,
  ADD COLUMN currency text NOT NULL DEFAULT 'INR',
  ADD COLUMN time_zone text,
  ADD COLUMN asset_category text;
ALTER TABLE public.profiles
  ADD COLUMN market_preference text,
  ADD COLUMN preferred_countries text[] NOT NULL DEFAULT '{}',
  ADD COLUMN preferred_regions text,
  ADD COLUMN preferred_asset_types text[] NOT NULL DEFAULT '{}',
  ADD COLUMN budget_min numeric,
  ADD COLUMN budget_max numeric,
  ADD COLUMN budget_currency text;
CREATE INDEX properties_market_country_idx ON public.properties(market, country);