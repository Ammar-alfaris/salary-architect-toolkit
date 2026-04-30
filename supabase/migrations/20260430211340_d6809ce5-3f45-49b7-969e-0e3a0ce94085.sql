-- Add missing 'manager' role to enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'manager';