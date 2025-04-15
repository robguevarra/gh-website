# Progress Tracking System - Database Trigger Fix

## Task Objective
Fix the error in the course progress tracking system that was preventing lesson progress from being saved properly.

## Current State Assessment
The application has a multi-level progress tracking system that automatically updates progress at different levels:
1. User completes lessons (user_progress table)
2. System calculates module progress (module_progress table)
3. System calculates course progress (course_progress table)

This is implemented using PostgreSQL database triggers that automatically update higher-level progress when lower-level progress changes. However, the system was failing with an error when trying to update lesson progress:

```
PATCH https://cidenjydokpzpsnpywcf.supabase.co/rest/v1/user_progress?id=eq.eba84ac6-9c89-4f11-b538-32c00c68938e 400 (Bad Request)

Error: {code: '42702', details: 'It could refer to either a PL/pgSQL variable or a table column.', hint: null, message: 'column reference "course_id" is ambiguous'}
```

## Future State Goal
A fully functional progress tracking system that correctly updates all levels of progress (lesson, module, course) automatically when a user completes a lesson.

## Implementation Plan

1. ✅ Identify the source of the ambiguous column reference error
   - Investigated the error message and traced it to PostgreSQL database triggers
   - Found that the error occurs during a PATCH request when updating user progress
   - Discovered two triggers and associated functions for progress tracking:
     - `update_module_progress_trigger` (fires on user_progress changes)
     - `update_course_progress_trigger` (fires on module_progress changes)

2. ✅ Examine the database trigger functions
   - Checked the `update_module_progress` function (no issues found)
   - Found an ambiguous column reference in the `update_course_progress` function
   - The issue was in the SQL statement: `WHERE course_id = course_id;`
   - This statement was ambiguous because `course_id` referred to both:
     - A column in the modules table
     - A variable declared in the function

3. ✅ Fix the ambiguous reference in the database trigger
   - Changed variable name from `course_id` to `v_course_id` to avoid ambiguity
   - Updated all references to use proper table qualifiers: `modules.course_id`
   - Updated all uses of the variable to use `v_course_id` consistently
   - Created a database migration to apply the fix

4. ✅ Test the fix
   - Built and ran the application
   - Verified that lesson progress updates now work correctly
   - Confirmed that the automatic progress calculations cascade properly

## Technical Details

### The Issue
The error occurred in the `update_course_progress` function when it tried to count the total number of modules in a course. The WHERE clause was ambiguous because it used the same name for both a column and a variable:

```sql
-- Old code with the issue
SELECT COUNT(*) INTO total_modules
FROM public.modules
WHERE course_id = course_id;
```

PostgreSQL couldn't determine if it should compare:
1. The column `modules.course_id` with itself (which would always be true)
2. The column `modules.course_id` with the variable `course_id`

### The Fix
Updated the function to use distinct names and proper table qualifiers:

```sql
-- Fixed code
SELECT COUNT(*) INTO total_modules
FROM public.modules
WHERE modules.course_id = v_course_id;
```

By renaming the variable to `v_course_id` and using fully qualified column names, there's no ambiguity in the SQL statement.

### Progress Tracking Flow
Understanding the entire flow is important for context:

1. User completes a lesson → app updates `user_progress` table
2. Trigger `update_module_progress_trigger` fires automatically
3. Function `update_module_progress()` calculates new module progress
4. It updates or inserts a record in `module_progress` table
5. This triggers `update_course_progress_trigger`
6. Function `update_course_progress()` calculates new course progress
7. It updates or inserts a record in `course_progress` table

This cascading update system automates progress tracking across all levels.

### Lessons Learned
1. Database triggers can cause errors that are difficult to diagnose from just client-side code
2. Always use clear, distinct naming for variables vs. column names in SQL functions
3. Fully qualify column names in complex queries to avoid ambiguity
4. Check PL/pgSQL functions when encountering database errors with code "42702" (ambiguous column) 