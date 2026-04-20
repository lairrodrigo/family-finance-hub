
-- Repair app_role enum to include missing roles
-- This is necessary because the first migration was applied before the update
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'member';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'viewer';
