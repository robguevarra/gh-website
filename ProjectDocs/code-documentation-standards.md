# Graceful Homeschooling Code Documentation Standards

This document outlines the standards and best practices for code documentation in the Graceful Homeschooling platform. Consistent documentation is essential for maintainability, onboarding new developers, and ensuring code quality.

## Table of Contents
1. [General Guidelines](#general-guidelines)
2. [JSDoc Comment Standards](#jsdoc-comment-standards)
3. [Component Documentation](#component-documentation)
4. [Type Documentation](#type-documentation)
5. [API Documentation](#api-documentation)
6. [Utility Function Documentation](#utility-function-documentation)
7. [File and Directory Documentation](#file-and-directory-documentation)
8. [Example Documentation](#example-documentation)

## General Guidelines

* **Documentation Purpose**: Document the "why" and "how" rather than the "what" when the "what" is obvious from the code.
* **Keep Updated**: Documentation must be updated when code changes.
* **Self-Documenting Code**: Use clear variable and function names to make code as self-documenting as possible.
* **Brevity**: Be concise but thorough. Avoid unnecessary verbosity.
* **Language**: Use clear, simple English. Avoid jargon unless it's standard in the industry.

## JSDoc Comment Standards

### Required JSDoc Elements

All functions, including component functions, should include JSDoc comments with the following elements:

* **Description**: A brief description of what the function or component does.
* **Parameters**: Document each parameter with `@param` tag.
* **Return value**: Document the return value with `@returns` tag.
* **Example**: Where helpful, include usage examples.

### Function Documentation Example

```typescript
/**
 * Formats a date string according to the specified format.
 *
 * @param {Date|string|number} date - The date to format (Date object, ISO string, or timestamp).
 * @param {string} [format='MMM dd, yyyy'] - The format string to use (default: 'MMM dd, yyyy').
 * @returns {string} The formatted date string.
 *
 * @example
 * // Returns "Jan 01, 2023"
 * formatDate(new Date(2023, 0, 1));
 *
 * @example
 * // Returns "01/01/2023"
 * formatDate(new Date(2023, 0, 1), 'MM/dd/yyyy');
 */
export function formatDate(date: Date | string | number, format: string = 'MMM dd, yyyy'): string {
  // Implementation...
}
```

### TypeScript Types/Interfaces Documentation

```typescript
/**
 * Represents a user's profile information.
 *
 * @interface UserProfile
 * @property {string} id - The unique identifier for the user.
 * @property {string} firstName - The user's first name.
 * @property {string} lastName - The user's last name.
 * @property {string} email - The user's email address.
 * @property {Date} createdAt - When the profile was created.
 * @property {Role[]} roles - The roles assigned to this user.
 */
export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  createdAt: Date;
  roles: Role[];
}
```

## Component Documentation

### Component Documentation Standards

React components should be documented with:

* **Component Purpose**: A clear description of the component's purpose.
* **Props**: Document all props, including types and default values.
* **Usage Examples**: Simple usage examples where helpful.
* **Notes**: Any important notes about usage, limitations, or dependencies.

### React Component Documentation Example

```typescript
/**
 * Displays a card containing course information with a consistent design.
 *
 * @component
 * @param {object} props - The component props.
 * @param {Course} props.course - The course data to display.
 * @param {boolean} [props.isLoading=false] - Whether the card is in a loading state.
 * @param {boolean} [props.isInteractive=true] - Whether the card responds to hover/focus.
 * @param {'small'|'medium'|'large'} [props.size='medium'] - The size variant of the card.
 * @returns {React.ReactElement} The rendered component.
 *
 * @example
 * // Basic usage
 * <CourseCard course={course} />
 *
 * @example
 * // Loading state
 * <CourseCard course={course} isLoading={true} />
 *
 * @example
 * // Non-interactive small card
 * <CourseCard course={course} isInteractive={false} size="small" />
 */
export function CourseCard({
  course,
  isLoading = false,
  isInteractive = true,
  size = 'medium'
}: CourseCardProps) {
  // Implementation...
}
```

### Prop Type Documentation

For complex prop types, document them separately:

```typescript
/**
 * Props for the CourseCard component.
 *
 * @typedef {object} CourseCardProps
 * @property {Course} course - The course data to display.
 * @property {boolean} [isLoading=false] - Whether the card is in a loading state.
 * @property {boolean} [isInteractive=true] - Whether the card responds to hover/focus.
 * @property {'small'|'medium'|'large'} [size='medium'] - The size variant of the card.
 */
interface CourseCardProps {
  course: Course;
  isLoading?: boolean;
  isInteractive?: boolean;
  size?: 'small' | 'medium' | 'large';
}
```

## Type Documentation

### Type Documentation Standards

All TypeScript types and interfaces should include:

* **Purpose**: What the type represents.
* **Properties**: Document each property, its type, and purpose.
* **Examples**: For complex types, provide usage examples.

### Complex Type Documentation Example

```typescript
/**
 * Represents a course with all its associated data.
 *
 * @typedef {object} Course
 * @property {string} id - Unique identifier for the course.
 * @property {string} title - The title of the course.
 * @property {string} description - A description of the course content.
 * @property {string} imageUrl - URL to the course cover image.
 * @property {number} price - The price of the course in USD.
 * @property {CourseStatus} status - The publication status of the course.
 * @property {Module[]} modules - The modules that make up this course.
 * @property {string} authorId - The ID of the course author.
 * @property {Date} createdAt - When the course was created.
 * @property {Date} updatedAt - When the course was last updated.
 */
export interface Course {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  price: number;
  status: CourseStatus;
  modules: Module[];
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Possible statuses for a course.
 *
 * @typedef {string} CourseStatus
 * @property {'draft'} DRAFT - The course is in draft mode and not publicly available.
 * @property {'published'} PUBLISHED - The course is published and available to enrolled users.
 * @property {'archived'} ARCHIVED - The course is no longer active but preserved for reference.
 */
export type CourseStatus = 'draft' | 'published' | 'archived';
```

## API Documentation

### API Route Documentation Standards

API routes should be documented with:

* **Endpoint Purpose**: What the API endpoint does.
* **HTTP Method**: GET, POST, PUT, DELETE, etc.
* **Request Parameters**: Document query params, body, and path params.
* **Response Format**: Document the structure of successful responses.
* **Error Responses**: Document possible error responses and status codes.
* **Authentication**: Note if authentication is required.

### API Route Documentation Example

```typescript
/**
 * User course enrollment API route handler.
 * Handles enrolling a user in a course.
 *
 * @route POST /api/v1/courses/:courseId/enroll
 * @auth Required
 * 
 * @pathParam {string} courseId - The ID of the course to enroll in.
 * 
 * @bodyParam {object} requestBody - The enrollment request data.
 * @bodyParam {string} [requestBody.tier='standard'] - Enrollment tier (standard, premium).
 * 
 * @response {object} 200 - Enrollment successful.
 * @response {string} 200.status - Always "success".
 * @response {object} 200.data - The enrollment data.
 * @response {string} 200.data.id - Enrollment ID.
 * @response {string} 200.data.userId - User ID.
 * @response {string} 200.data.courseId - Course ID.
 * @response {string} 200.data.tier - Enrollment tier.
 * @response {Date} 200.data.enrolledAt - Enrollment date.
 * 
 * @response {object} 400 - Bad request error.
 * @response {string} 400.status - Always "error".
 * @response {string} 400.message - Error message.
 * 
 * @response {object} 401 - Unauthorized error.
 * @response {string} 401.status - Always "error".
 * @response {string} 401.message - Error message.
 * 
 * @response {object} 404 - Course not found.
 * @response {string} 404.status - Always "error".
 * @response {string} 404.message - Error message.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  // Implementation...
}
```

## Utility Function Documentation

### Utility Function Documentation Standards

Utility functions should include:

* **Purpose**: What the function does.
* **Parameters**: Document each parameter, including type and purpose.
* **Return Value**: Document what the function returns.
* **Throws**: Document any exceptions the function might throw.
* **Examples**: Provide usage examples.

### Utility Function Documentation Example

```typescript
/**
 * Safely parses a JSON string and returns the parsed value.
 * Returns a default value if parsing fails.
 *
 * @param {string} jsonString - The JSON string to parse.
 * @param {any} [defaultValue=null] - The default value to return if parsing fails.
 * @returns {any} The parsed JSON value or the default value.
 * @throws {TypeError} If jsonString is not a string.
 *
 * @example
 * // Returns { name: "John" }
 * safeJsonParse('{"name":"John"}');
 *
 * @example
 * // Returns { empty: true }
 * safeJsonParse('invalid json', { empty: true });
 */
export function safeJsonParse(jsonString: string, defaultValue: any = null): any {
  if (typeof jsonString !== 'string') {
    throw new TypeError('Expected a string');
  }
  
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    return defaultValue;
  }
}
```

## File and Directory Documentation

### README Files

Each major directory should include a README.md file explaining:

* **Purpose**: What the directory contains.
* **Organization**: How files are organized.
* **Usage**: How to use the contents.
* **Examples**: Examples of common usage patterns.

### Directory README Example

```markdown
# UI Components

This directory contains reusable UI components for the Graceful Homeschooling platform.

## Organization

Components are organized into individual files following a flat structure:
- One component per file
- Components are named using PascalCase
- Files are named using kebab-case

## Usage

Import components directly from their respective files:

```tsx
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
```

## Component Categories

- **Layout Components**: For page structure (Card, Container, Grid)
- **Form Components**: For user input (Button, Input, Select)
- **Feedback Components**: For user feedback (Alert, Toast, Progress)
- **Navigation Components**: For user navigation (Tabs, Breadcrumb, Menu)

## Examples

See [component-libraries.md](../ProjectDocs/component-libraries.md) for detailed examples
of how to use each component.
```

## Example Documentation

### Real-World Examples

Include a dedicated section for examples in important documentation, especially for:

* **Complex Components**: Components with many props or usage variations
* **Utility Functions**: Functions with diverse use cases
* **API Routes**: Routes with complex request/response patterns

### Example Documentation Example

```typescript
/**
 * Example: Creating a Multi-Step Form
 * 
 * This example shows how to create a multi-step form using the form components.
 * 
 * ```tsx
 * import { useState } from 'react';
 * import { Button } from '@/components/ui/button';
 * import { Form, FormField, FormItem, FormLabel, FormControl } from '@/components/ui/form';
 * import { Input } from '@/components/ui/input';
 * import { useForm } from 'react-hook-form';
 * import { zodResolver } from '@hookform/resolvers/zod';
 * import * as z from 'zod';
 * 
 * // Step 1 validation schema
 * const step1Schema = z.object({
 *   firstName: z.string().min(2).max(50),
 *   lastName: z.string().min(2).max(50),
 * });
 * 
 * // Step 2 validation schema
 * const step2Schema = z.object({
 *   email: z.string().email(),
 *   phone: z.string().regex(/^\d{10}$/),
 * });
 * 
 * // Full form schema
 * const formSchema = z.object({
 *   ...step1Schema.shape,
 *   ...step2Schema.shape,
 * });
 * 
 * export function MultiStepForm() {
 *   const [step, setStep] = useState(1);
 *   const form = useForm<z.infer<typeof formSchema>>({
 *     resolver: zodResolver(step === 1 ? step1Schema : formSchema),
 *     defaultValues: {
 *       firstName: '',
 *       lastName: '',
 *       email: '',
 *       phone: '',
 *     },
 *   });
 * 
 *   const onSubmit = (values: z.infer<typeof formSchema>) => {
 *     if (step === 1) {
 *       setStep(2);
 *     } else {
 *       console.log('Form submitted:', values);
 *     }
 *   };
 * 
 *   return (
 *     <Form {...form}>
 *       <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
 *         {step === 1 ? (
 *           <>
 *             <FormField
 *               control={form.control}
 *               name="firstName"
 *               render={({ field }) => (
 *                 <FormItem>
 *                   <FormLabel>First Name</FormLabel>
 *                   <FormControl>
 *                     <Input placeholder="John" {...field} />
 *                   </FormControl>
 *                 </FormItem>
 *               )}
 *             />
 *             <FormField
 *               control={form.control}
 *               name="lastName"
 *               render={({ field }) => (
 *                 <FormItem>
 *                   <FormLabel>Last Name</FormLabel>
 *                   <FormControl>
 *                     <Input placeholder="Doe" {...field} />
 *                   </FormControl>
 *                 </FormItem>
 *               )}
 *             />
 *           </>
 *         ) : (
 *           <>
 *             <FormField
 *               control={form.control}
 *               name="email"
 *               render={({ field }) => (
 *                 <FormItem>
 *                   <FormLabel>Email</FormLabel>
 *                   <FormControl>
 *                     <Input placeholder="john.doe@example.com" {...field} />
 *                   </FormControl>
 *                 </FormItem>
 *               )}
 *             />
 *             <FormField
 *               control={form.control}
 *               name="phone"
 *               render={({ field }) => (
 *                 <FormItem>
 *                   <FormLabel>Phone</FormLabel>
 *                   <FormControl>
 *                     <Input placeholder="1234567890" {...field} />
 *                   </FormControl>
 *                 </FormItem>
 *               )}
 *             />
 *           </>
 *         )}
 *         <Button type="submit">
 *           {step === 1 ? 'Next' : 'Submit'}
 *         </Button>
 *         {step === 2 && (
 *           <Button
 *             type="button"
 *             variant="outline"
 *             onClick={() => setStep(1)}
 *             className="ml-2"
 *           >
 *             Back
 *           </Button>
 *         )}
 *       </form>
 *     </Form>
 *   );
 * }
 * ```
 */
```

---

*Last updated: March 24, 2024* 