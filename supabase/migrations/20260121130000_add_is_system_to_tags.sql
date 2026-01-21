-- Add is_system column to tags table
ALTER TABLE public.tags 
ADD COLUMN IF NOT EXISTS is_system boolean DEFAULT false;

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_tags_is_system ON public.tags(is_system);

-- Mark specific known system tags as system
UPDATE public.tags 
SET is_system = true 
WHERE name IN ('p2p_enrolled', 'customer', 'lead', 'student');
