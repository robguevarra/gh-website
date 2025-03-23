# Graceful Homeschooling Component Libraries

This document provides a comprehensive guide to the component libraries used in the Graceful Homeschooling platform, including their organization, usage patterns, and examples.

## Table of Contents
1. [UI Component Library](#ui-component-library)
2. [Admin Component Library](#admin-component-library)
3. [Form Component Library](#form-component-library)
4. [Data Display Component Library](#data-display-component-library)
5. [Creating New Components](#creating-new-components)

## UI Component Library

The UI component library serves as the foundation for all user interfaces in the Graceful Homeschooling platform. These components are built on top of Radix UI primitives and styled with TailwindCSS.

### Organization

UI components are located in the `components/ui` directory and follow a flat structure. Each component is defined in its own file with a consistent naming pattern.

```
components/
  ui/
    button.tsx
    card.tsx
    dialog.tsx
    input.tsx
    ...
```

### Component Categories

#### Layout Components
- `accordion.tsx` - Vertically collapsible content sections
- `aspect-ratio.tsx` - Maintains consistent width/height ratio
- `card.tsx` - Container for related content
- `collapsible.tsx` - Toggle visibility of content
- `drawer.tsx` - Side panel that slides in from the edge
- `resizable.tsx` - Allows users to resize elements
- `scroll-area.tsx` - Scrollable container with custom scrollbars
- `separator.tsx` - Visual divider between content
- `sheet.tsx` - Slide-in panel from any edge

#### Navigation Components
- `breadcrumb.tsx` - Shows hierarchy and navigation path
- `navigation-menu.tsx` - Advanced navigation interface
- `menubar.tsx` - Horizontal menu with dropdowns
- `sidebar.tsx` - Vertical navigation panel
- `skip-link.tsx` - Accessibility feature for keyboard navigation
- `tabs.tsx` - Tabbed interface for content organization

#### Form Components
- `button.tsx` - Interactive button elements
- `checkbox.tsx` - Selectable checkboxes
- `form.tsx` - Form container with validation
- `input.tsx` - Text input fields
- `input-otp.tsx` - One-time password input
- `label.tsx` - Text labels for form fields
- `radio-group.tsx` - Exclusive selection options
- `select.tsx` - Dropdown selection
- `slider.tsx` - Range selection
- `switch.tsx` - Toggle on/off state
- `textarea.tsx` - Multi-line text input

#### Feedback Components
- `alert.tsx` - Informational messages
- `alert-dialog.tsx` - Modal confirmations
- `progress.tsx` - Visual progress indicator
- `skeleton.tsx` - Loading placeholder
- `toast.tsx` - Temporary notifications
- `toaster.tsx` - Toast notification manager

#### Overlay Components
- `context-menu.tsx` - Right-click context menu
- `dialog.tsx` - Modal dialog boxes
- `dropdown-menu.tsx` - Menu triggered by a button
- `hover-card.tsx` - Card that appears on hover
- `popover.tsx` - Floating content anchored to an element
- `tooltip.tsx` - Informational popup on hover

#### Data Display Components
- `avatar.tsx` - User profile images
- `badge.tsx` - Small status indicators
- `calendar.tsx` - Date selection calendar
- `carousel.tsx` - Rotating content display
- `chart.tsx` - Data visualization
- `date-picker.tsx` - Date selection widget
- `heading.tsx` - Styled text headings
- `pagination.tsx` - Page navigation for multi-page content
- `table.tsx` - Tabular data display

#### Utility Components
- `command.tsx` - Command palette for keyboard-driven navigation
- `dynamic-import.tsx` - Lazy-loading component wrapper
- `logo.tsx` - Brand logo with variants
- `optimized-image.tsx` - Optimized image component
- `sonner.tsx` - Toast notification integration
- `toggle.tsx` - Button that can be toggled on/off
- `toggle-group.tsx` - Group of toggles
- `use-mobile.tsx` - Hook for mobile detection
- `use-toast.ts` - Hook for toast notifications
- `visually-hidden.tsx` - Accessibility helper for screen readers

### Usage Patterns

#### Basic Component Usage

Components should be imported directly from their location in the UI directory:

```tsx
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";

export function ExampleComponent() {
  return (
    <Card>
      <CardHeader>Example Card</CardHeader>
      <CardContent>
        <p>This is an example of how to use the Card component.</p>
      </CardContent>
      <CardFooter>
        <Button>Click Me</Button>
      </CardFooter>
    </Card>
  );
}
```

#### Composition Patterns

UI components are designed to be composed together to create complex interfaces:

```tsx
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ExampleDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open Dialog</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Example Dialog</DialogTitle>
          <DialogDescription>
            This is an example of a dialog with form fields.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input id="name" className="col-span-3" />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit">Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

#### Variants and Customization

Many components support variants through the `className` prop and TailwindCSS:

```tsx
// Button variants
<Button>Default</Button>
<Button variant="destructive">Destructive</Button>
<Button variant="outline">Outline</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>

// Custom styling with Tailwind
<Button className="bg-purple-500 hover:bg-purple-700">
  Custom Purple
</Button>
```

## Admin Component Library

The admin component library provides specialized components for the administrative interface of the Graceful Homeschooling platform.

### Organization

Admin components are located in the `components/admin` directory and are organized by feature:

```
components/
  admin/
    admin-header.tsx
    admin-sidebar.tsx
    admin-heading.tsx
    course-list.tsx
    course-form.tsx
    user-table.tsx
    ...
```

### Component Categories

#### Layout Components
- `admin-header.tsx` - Main header for admin interface
- `admin-sidebar.tsx` - Navigation sidebar for admin interface
- `admin-heading.tsx` - Styled headings for admin sections

#### User Management Components
- `user-table.tsx` - Table for displaying and managing users
- `create-user-form.tsx` - Form for creating new users
- `user-profile-form.tsx` - Form for editing user profiles
- `user-security-form.tsx` - Form for managing user security settings
- `user-membership-form.tsx` - Form for managing user memberships
- `user-courses.tsx` - Interface for managing user course enrollments

#### Course Management Components
- `course-list.tsx` - Table for displaying and managing courses
- `course-form.tsx` - Form for creating and editing courses
- `module-list.tsx` - Interface for managing course modules
- `lesson-list.tsx` - Interface for managing course lessons
- `course-modules-manager.tsx` - Advanced interface for module management
- `lesson-basic-editor.tsx` - Basic editor for lesson content
- `unified-course-editor.tsx` - All-in-one course editor
- `course-enrollment-management.tsx` - Interface for managing course enrollments

### Usage Patterns

Admin components are typically used within admin page layouts:

```tsx
// app/admin/courses/page.tsx
import { AdminHeader } from "@/components/admin/admin-header";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { CourseList } from "@/components/admin/course-list";

export default function CoursesAdminPage() {
  return (
    <div className="flex h-screen">
      <AdminSidebar />
      <div className="flex flex-col flex-1">
        <AdminHeader title="Course Management" />
        <main className="flex-1 p-6">
          <CourseList />
        </main>
      </div>
    </div>
  );
}
```

## Form Component Library

The form component library provides standardized form components with validation and error handling.

### Core Form Components

The platform uses a combination of UI form components and form validation libraries:

- `form.tsx` - Base form component with validation integration
- Zod for schema validation
- React Hook Form for form state management

### Form Patterns

```tsx
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

// Define the form schema with Zod
const formSchema = z.object({
  username: z.string().min(2).max(50),
  email: z.string().email(),
});

export function ProfileForm() {
  // Initialize form with React Hook Form and Zod validation
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      email: "",
    },
  });

  // Form submission handler
  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="johndoe" {...field} />
              </FormControl>
              <FormDescription>
                Your public display name.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="john.doe@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
}
```

## Data Display Component Library

The data display component library provides components for displaying and interacting with data.

### Core Data Display Components

The platform includes several components for data display:

- `table.tsx` - Responsive table component
- `pagination.tsx` - Pagination control for data tables
- `chart.tsx` - Data visualization component
- `carousel.tsx` - Carousel for displaying multiple items

### Data Display Patterns

#### Table with Pagination

```tsx
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";

export function DataTable({ data, currentPage, totalPages }) {
  return (
    <div>
      <Table>
        <TableCaption>A list of your recent invoices.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Method</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((invoice) => (
            <TableRow key={invoice.id}>
              <TableCell>{invoice.invoice}</TableCell>
              <TableCell>{invoice.status}</TableCell>
              <TableCell>{invoice.method}</TableCell>
              <TableCell className="text-right">{invoice.amount}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious href="#" />
          </PaginationItem>
          {Array.from({ length: totalPages }).map((_, i) => (
            <PaginationItem key={i}>
              <PaginationLink
                href="#"
                isActive={currentPage === i + 1}
              >
                {i + 1}
              </PaginationLink>
            </PaginationItem>
          ))}
          <PaginationItem>
            <PaginationNext href="#" />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
```

## Creating New Components

When creating new components for the Graceful Homeschooling platform, follow these guidelines:

### General Guidelines

1. **Component Location**: Place components in the appropriate directory based on their purpose:
   - UI components in `components/ui/`
   - Admin components in `components/admin/`
   - Course-specific components in `components/courses/`
   - Authentication components in `components/auth/`

2. **File Naming**: Use kebab-case for file names and PascalCase for component names:
   - `my-component.tsx` for the file
   - `MyComponent` for the component

3. **Component Structure**: Follow this structure for component files:
   ```tsx
   // Imports
   import { FC } from "react";
   import { cn } from "@/lib/utils";
   
   // Types
   interface MyComponentProps {
     children?: React.ReactNode;
     className?: string;
     // Other props...
   }
   
   // Component
   export const MyComponent: FC<MyComponentProps> = ({
     children,
     className,
     // Destructure other props...
   }) => {
     return (
       <div className={cn("default-styles", className)}>
         {children}
       </div>
     );
   };
   ```

4. **Composition**: Create compound components when appropriate:
   ```tsx
   export const MyComponent = {
     Root: MyComponentRoot,
     Header: MyComponentHeader,
     Body: MyComponentBody,
     Footer: MyComponentFooter,
   };
   ```

5. **Styling**: Use Tailwind CSS for styling and leverage the `cn` utility for class name composition:
   ```tsx
   import { cn } from "@/lib/utils";
   
   export function MyComponent({ className, ...props }) {
     return (
       <div
         className={cn(
           "bg-white p-4 rounded-md shadow-sm",
           className
         )}
         {...props}
       />
     );
   }
   ```

6. **Accessibility**: Ensure components are accessible:
   - Use appropriate ARIA attributes
   - Ensure keyboard navigation works
   - Maintain proper contrast
   - Support screen readers

### Shadcn UI Integration

For new UI components that build on Shadcn UI:

1. Use the Shadcn CLI to add new components:
   ```bash
   npx shadcn-ui@latest add [component-name]
   ```

2. Customize the generated component as needed.

3. If creating variants, follow the same pattern as existing components:
   ```tsx
   const buttonVariants = cva(
     "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
     {
       variants: {
         variant: {
           default: "bg-primary text-primary-foreground hover:bg-primary/90",
           destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
           // Add your custom variant here
           custom: "bg-purple-500 text-white hover:bg-purple-700",
         },
         size: {
           default: "h-10 px-4 py-2",
           sm: "h-9 rounded-md px-3",
           lg: "h-11 rounded-md px-8",
           // Add your custom size here
           xl: "h-12 rounded-md px-10 text-lg",
         },
       },
       defaultVariants: {
         variant: "default",
         size: "default",
       },
     }
   );
   ```

### Testing New Components

1. **Visual Testing**: Test the component in different viewports and states
2. **Functional Testing**: Ensure the component behaves as expected
3. **Integration Testing**: Test the component in the context of other components

---

*Last updated: March 24, 2024* 