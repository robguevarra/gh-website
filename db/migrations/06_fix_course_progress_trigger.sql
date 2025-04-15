-- Fix Course Progress Trigger Function
-- This migration updates the update_course_progress function to calculate progress based on lessons completed
-- instead of modules completed, which provides a more accurate representation of course progress.

-- Drop the existing trigger first
DROP TRIGGER IF EXISTS update_course_progress_trigger ON public.module_progress;

-- Drop the existing function
DROP FUNCTION IF EXISTS public.update_course_progress();

-- Create the improved function that calculates progress based on lessons
CREATE OR REPLACE FUNCTION public.update_course_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_course_id UUID;
    total_modules INT;
    completed_modules INT;
    total_lessons INT;
    completed_lessons INT;
    new_percentage NUMERIC;
BEGIN
    -- Get the course_id for the module
    SELECT modules.course_id INTO v_course_id
    FROM public.modules
    WHERE modules.id = NEW.module_id;
    
    IF v_course_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Count total modules in the course
    SELECT COUNT(*) INTO total_modules
    FROM public.modules
    WHERE modules.course_id = v_course_id;
    
    -- Count modules with 100% progress for the user in this course
    SELECT COUNT(*) INTO completed_modules
    FROM public.module_progress
    JOIN public.modules ON module_progress.module_id = modules.id
    WHERE modules.course_id = v_course_id
    AND module_progress.user_id = NEW.user_id
    AND module_progress.progress_percentage >= 100;
    
    -- Count total lessons in the course
    SELECT COUNT(*) INTO total_lessons
    FROM public.lessons l
    JOIN public.modules m ON l.module_id = m.id
    WHERE m.course_id = v_course_id;
    
    -- Count completed lessons for the user in this course
    SELECT COUNT(*) INTO completed_lessons
    FROM public.user_progress up
    JOIN public.lessons l ON up.lesson_id = l.id
    JOIN public.modules m ON l.module_id = m.id
    WHERE up.user_id = NEW.user_id
    AND m.course_id = v_course_id
    AND up.status = 'completed';
    
    -- Calculate new progress percentage based on lessons (not modules)
    IF total_lessons > 0 THEN
        new_percentage := (completed_lessons::NUMERIC / total_lessons::NUMERIC) * 100;
    ELSE
        new_percentage := 0;
    END IF;
    
    -- Update or insert course progress
    INSERT INTO public.course_progress (
        user_id,
        course_id,
        progress_percentage,
        last_accessed_at,
        completed_at
    )
    VALUES (
        NEW.user_id,
        v_course_id,
        new_percentage,
        NOW(),
        CASE WHEN new_percentage >= 100 THEN NOW() ELSE NULL END
    )
    ON CONFLICT (user_id, course_id) 
    DO UPDATE SET
        progress_percentage = new_percentage,
        last_accessed_at = NOW(),
        completed_at = CASE WHEN new_percentage >= 100 THEN NOW() ELSE course_progress.completed_at END;
    
    RETURN NEW;
END;
$$;

-- Re-create the trigger
CREATE TRIGGER update_course_progress_trigger
AFTER INSERT OR UPDATE ON public.module_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_course_progress();

-- Create a direct trigger from user_progress to course_progress
-- This ensures that course progress is updated immediately when a lesson is completed
-- without requiring a module_progress update first
CREATE OR REPLACE FUNCTION public.update_course_progress_from_lesson()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_course_id UUID;
    total_lessons INT;
    completed_lessons INT;
    new_percentage NUMERIC;
BEGIN
    -- Get the course_id for the lesson
    SELECT m.course_id INTO v_course_id
    FROM public.lessons l
    JOIN public.modules m ON l.module_id = m.id
    WHERE l.id = NEW.lesson_id;
    
    IF v_course_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Count total lessons in the course
    SELECT COUNT(*) INTO total_lessons
    FROM public.lessons l
    JOIN public.modules m ON l.module_id = m.id
    WHERE m.course_id = v_course_id;
    
    -- Count completed lessons for the user in this course
    SELECT COUNT(*) INTO completed_lessons
    FROM public.user_progress up
    JOIN public.lessons l ON up.lesson_id = l.id
    JOIN public.modules m ON l.module_id = m.id
    WHERE up.user_id = NEW.user_id
    AND m.course_id = v_course_id
    AND up.status = 'completed';
    
    -- Calculate new progress percentage
    IF total_lessons > 0 THEN
        new_percentage := (completed_lessons::NUMERIC / total_lessons::NUMERIC) * 100;
    ELSE
        new_percentage := 0;
    END IF;
    
    -- Update or insert course progress
    INSERT INTO public.course_progress (
        user_id,
        course_id,
        progress_percentage,
        last_accessed_at,
        completed_at
    )
    VALUES (
        NEW.user_id,
        v_course_id,
        new_percentage,
        NOW(),
        CASE WHEN new_percentage >= 100 THEN NOW() ELSE NULL END
    )
    ON CONFLICT (user_id, course_id) 
    DO UPDATE SET
        progress_percentage = new_percentage,
        last_accessed_at = NOW(),
        completed_at = CASE WHEN new_percentage >= 100 THEN NOW() ELSE course_progress.completed_at END;
    
    RETURN NEW;
END;
$$;

-- Create a direct trigger from user_progress to course_progress
DROP TRIGGER IF EXISTS update_course_progress_from_lesson_trigger ON public.user_progress;

CREATE TRIGGER update_course_progress_from_lesson_trigger
AFTER INSERT OR UPDATE ON public.user_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_course_progress_from_lesson();
