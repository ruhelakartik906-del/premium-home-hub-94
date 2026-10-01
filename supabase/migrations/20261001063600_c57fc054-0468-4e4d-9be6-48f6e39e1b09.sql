CREATE OR REPLACE FUNCTION public.properties_fx() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c record;
BEGIN
  IF NEW.market = 'india' THEN NEW.country_code := 'IN'; NEW.country := 'India'; NEW.currency := 'INR'; END IF;
  IF NEW.market NOT IN ('india','international') THEN RAISE EXCEPTION 'Invalid market'; END IF;
  SELECT * INTO c FROM public.countries WHERE code = NEW.country_code;
  IF NOT FOUND THEN RAISE EXCEPTION 'Please choose a supported country'; END IF;
  IF NEW.market = 'international' THEN
    IF NEW.country_code = 'IN' THEN RAISE EXCEPTION 'International listings need a country other than India'; END IF;
    IF coalesce(trim(NEW.region),'') = '' OR coalesce(trim(NEW.city),'') = '' OR coalesce(trim(NEW.currency),'') = '' THEN
      RAISE EXCEPTION 'International listings need a region, city and currency';
    END IF;
  END IF;
  NEW.country := c.name;
  IF NEW.currency = c.currency AND c.inr_rate IS NOT NULL THEN NEW.price_in_inr := round(NEW.price * c.inr_rate);
  ELSIF NEW.currency = 'INR' THEN NEW.price_in_inr := NEW.price;
  ELSE NEW.price_in_inr := (SELECT round(NEW.price * x.inr_rate) FROM public.countries x WHERE x.currency = NEW.currency AND x.inr_rate IS NOT NULL LIMIT 1);
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.properties_fx() FROM PUBLIC, anon, authenticated;