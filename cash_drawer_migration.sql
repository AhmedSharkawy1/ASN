-- Cash Drawer Migration
-- Adds open_cash_drawer option to print_settings table
ALTER TABLE print_settings ADD COLUMN IF NOT EXISTS open_cash_drawer BOOLEAN DEFAULT false;
