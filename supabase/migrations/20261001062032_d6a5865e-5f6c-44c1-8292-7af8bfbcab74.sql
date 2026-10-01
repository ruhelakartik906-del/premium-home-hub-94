CREATE TABLE public.countries (
  code text PRIMARY KEY,
  name text NOT NULL,
  currency text NOT NULL,
  inr_rate numeric,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.countries TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.countries TO authenticated;
GRANT ALL ON public.countries TO service_role;
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads countries" ON public.countries FOR SELECT USING (true);
CREATE POLICY "Admins manage countries" ON public.countries FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

INSERT INTO public.countries(code,name,currency,inr_rate) VALUES
('IN','India','INR',1),('AE','United Arab Emirates','AED',22.7),('GB','United Kingdom','GBP',106),('US','United States','USD',83.5),('SG','Singapore','SGD',62),('CH','Switzerland','CHF',94),
('FR','France','EUR',90),('DE','Germany','EUR',90),('IT','Italy','EUR',90),('ES','Spain','EUR',90),('PT','Portugal','EUR',90),('NL','Netherlands','EUR',90),('BE','Belgium','EUR',90),('IE','Ireland','EUR',90),('AT','Austria','EUR',90),('GR','Greece','EUR',90),('MC','Monaco','EUR',90),('CY','Cyprus','EUR',90),('MT','Malta','EUR',90),('LU','Luxembourg','EUR',90),('FI','Finland','EUR',90),
('SE','Sweden','SEK',8),('NO','Norway','NOK',7.8),('DK','Denmark','DKK',12),('PL','Poland','PLN',21),('CZ','Czechia','CZK',3.6),('HU','Hungary','HUF',0.23),('TR','Türkiye','TRY',2.5),
('CA','Canada','CAD',61),('MX','Mexico','MXN',4.6),('BR','Brazil','BRL',15),('AR','Argentina','ARS',0.09),('CL','Chile','CLP',0.09),('CO','Colombia','COP',0.02),
('AU','Australia','AUD',55),('NZ','New Zealand','NZD',50),('JP','Japan','JPY',0.56),('CN','China','CNY',11.5),('HK','Hong Kong','HKD',10.7),('KR','South Korea','KRW',0.062),('TW','Taiwan','TWD',2.6),
('TH','Thailand','THB',2.4),('MY','Malaysia','MYR',18),('ID','Indonesia','IDR',0.0053),('PH','Philippines','PHP',1.5),('VN','Vietnam','VND',0.0034),('LK','Sri Lanka','LKR',0.28),('NP','Nepal','NPR',0.625),('BD','Bangladesh','BDT',0.7),('MV','Maldives','MVR',5.4),
('SA','Saudi Arabia','SAR',22.3),('QA','Qatar','QAR',22.9),('KW','Kuwait','KWD',272),('BH','Bahrain','BHD',221),('OM','Oman','OMR',217),('IL','Israel','ILS',22.5),('EG','Egypt','EGP',1.7),
('ZA','South Africa','ZAR',4.6),('KE','Kenya','KES',0.65),('MU','Mauritius','MUR',1.8),('SC','Seychelles','SCR',6.1),('MA','Morocco','MAD',8.4),('NG','Nigeria','NGN',0.055),
('RU','Russia','RUB',0.9),('UA','Ukraine','UAH',2),('GE','Georgia','GEL',31),('KZ','Kazakhstan','KZT',0.17),('BS','Bahamas','BSD',83.5),('KY','Cayman Islands','KYD',100),('BB','Barbados','BBD',41.7),('JM','Jamaica','JMD',0.53),('DO','Dominican Republic','DOP',1.4),('CR','Costa Rica','CRC',0.16),('PA','Panama','PAB',83.5),('FJ','Fiji','FJD',37),('IS','Iceland','ISK',0.6),('HR','Croatia','EUR',90),('ME','Montenegro','EUR',90),('EE','Estonia','EUR',90);

ALTER TABLE public.properties
  ADD COLUMN country_code text NOT NULL DEFAULT 'IN',
  ADD COLUMN city text,
  ADD COLUMN locality text,
  ADD COLUMN price_in_inr numeric;

CREATE OR REPLACE FUNCTION public.properties_fx() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c record;
BEGIN
  IF NEW.market = 'india' THEN NEW.country_code := 'IN'; NEW.country := 'India'; NEW.currency := 'INR'; END IF;
  IF NEW.market NOT IN ('india','international') THEN RAISE EXCEPTION 'Invalid market'; END IF;
  SELECT * INTO c FROM public.countries WHERE code = NEW.country_code;
  IF NOT FOUND THEN RAISE EXCEPTION 'Please choose a supported country'; END IF;
  IF NEW.market = 'international' AND NEW.country_code = 'IN' THEN RAISE EXCEPTION 'International listings need a country other than India'; END IF;
  NEW.country := c.name;
  IF NEW.currency = c.currency AND c.inr_rate IS NOT NULL THEN NEW.price_in_inr := round(NEW.price * c.inr_rate);
  ELSIF NEW.currency = 'INR' THEN NEW.price_in_inr := NEW.price;
  ELSE NEW.price_in_inr := (SELECT round(NEW.price * x.inr_rate) FROM public.countries x WHERE x.currency = NEW.currency AND x.inr_rate IS NOT NULL LIMIT 1);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER properties_fx BEFORE INSERT OR UPDATE ON public.properties FOR EACH ROW EXECUTE FUNCTION public.properties_fx();
UPDATE public.properties SET price_in_inr = price WHERE market = 'india';