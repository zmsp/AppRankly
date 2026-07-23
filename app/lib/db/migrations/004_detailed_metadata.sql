ALTER TABLE aso_listing_snapshot ADD COLUMN developer TEXT;
ALTER TABLE aso_listing_snapshot ADD COLUMN category TEXT;
ALTER TABLE aso_listing_snapshot ADD COLUMN icon_url TEXT;
ALTER TABLE aso_listing_snapshot ADD COLUMN screenshots_json TEXT;
ALTER TABLE aso_listing_snapshot ADD COLUMN score REAL;
ALTER TABLE aso_listing_snapshot ADD COLUMN ratings_count INTEGER;
ALTER TABLE aso_listing_snapshot ADD COLUMN installs_exact INTEGER;
ALTER TABLE aso_listing_snapshot ADD COLUMN price TEXT;
ALTER TABLE aso_listing_snapshot ADD COLUMN content_rating TEXT;
ALTER TABLE aso_listing_snapshot ADD COLUMN updated_at TEXT;

ALTER TABLE aso_competitor ADD COLUMN developer TEXT;
ALTER TABLE aso_competitor ADD COLUMN category TEXT;
ALTER TABLE aso_competitor ADD COLUMN icon_url TEXT;
ALTER TABLE aso_competitor ADD COLUMN screenshots_json TEXT;
ALTER TABLE aso_competitor ADD COLUMN price TEXT;
ALTER TABLE aso_competitor ADD COLUMN ratings_count INTEGER;
