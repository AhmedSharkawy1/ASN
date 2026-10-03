-- Migration: Add desktop_permissions column to restaurants table
-- Fixes PostgreSQL error 42703: "column restaurants.desktop_permissions does not exist"
-- Run this in Supabase SQL Editor:

ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS desktop_permissions JSONB DEFAULT '{"orders":true,"products":true,"inventory":true,"finance":true,"admin":true,"settings":true}'::jsonb;
