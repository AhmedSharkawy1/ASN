-- Add show_asn_branding column to restaurants table
-- Defaults to true so existing restaurants keep showing the branding
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS show_asn_branding BOOLEAN DEFAULT true;
