# Toast Implementation Guide

This document outlines how toast notifications are implemented in the Graceful Homeschooling platform.

## Overview

The platform uses [Sonner](https://sonner.emilkowal.ski/) for toast notifications, which provides a clean, accessible way to display temporary messages to users. Toasts are used for success messages, error notifications, loading states, and general information.

## Implementation

### Setup

The toast system is set up in the root layout file (`app/layout.tsx`), where the `<Toaster />` component is included:

```tsx
// app/layout.tsx
import { Toaster } from "@/components/ui/sonner"

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {/* ... other components ... */}
        <Toaster />
      </body>
    </html>
  )
}
```

The `Toaster` component is a wrapper around Sonner's Toaster with theme integration:

```tsx
// components/ui/sonner.tsx
"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

const Toaster = ({ ...props }) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
```

### Usage

To use toasts in a component, import the `toast` function from Sonner:

```tsx
import { toast } from "sonner"
```

#### Basic Toast Types

1. **Success Toast**:
   ```tsx
   toast.success("Success", {
     description: "Operation completed successfully"
   });
   ```

2. **Error Toast**:
   ```tsx
   toast.error("Error", {
     description: "Something went wrong"
   });
   ```

3. **Information Toast**:
   ```tsx
   toast.info("Information", {
     description: "Here's some information"
   });
   ```

4. **Warning Toast**:
   ```tsx
   toast.warning("Warning", {
     description: "Be careful with this action"
   });
   ```

#### Loading Toast with Dismissal

For operations that take time, use a loading toast and dismiss it when complete:

```tsx
// Show loading toast and store its ID
const loadingToastId = toast.loading("Loading...", {
  duration: 60000, // Long duration to ensure it stays visible
});

try {
  // Perform async operation
  await someAsyncOperation();
  
  // Dismiss loading toast
  toast.dismiss(loadingToastId);
  
  // Show success toast
  toast.success("Success", {
    description: "Operation completed successfully"
  });
} catch (error) {
  // Dismiss loading toast
  toast.dismiss(loadingToastId);
  
  // Show error toast
  toast.error("Error", {
    description: "Failed to complete operation"
  });
}
```

#### Custom Duration

Control how long a toast appears:

```tsx
toast.success("Quick notification", {
  duration: 2000, // 2 seconds
});

toast.info("Longer notification", {
  duration: 10000, // 10 seconds
});
```

#### Toast with Action

Add interactive buttons to toasts:

```tsx
toast("Document created", {
  description: "Your document has been created",
  action: {
    label: "View",
    onClick: () => window.open("/documents/123", "_blank")
  },
});
```

### Best Practices

1. **Keep Messages Concise**: Toast messages should be brief and to the point.

2. **Use Appropriate Types**: Match the toast type to the message context (success, error, etc.).

3. **Provide Helpful Descriptions**: Include enough detail in the description to help users understand what happened.

4. **Manage Loading States**: Always dismiss loading toasts when operations complete or fail.

5. **Consistent Styling**: Use the built-in toast types rather than custom styling to maintain consistency.

6. **Avoid Toast Overload**: Don't show too many toasts at once, as this can overwhelm users.

### Legacy Implementation

The project also contains a legacy toast implementation in `hooks/use-toast.tsx` which is no longer used. This implementation only logs to the console and doesn't display visual toasts. Always use the Sonner implementation described above.

## Examples from the Codebase

### Creating a Lesson

```tsx
// Show loading toast
const loadingToastId = toast.loading(`Creating new ${contentType}...`, {
  duration: 60000,
});

try {
  // Create lesson logic
  const newLesson = await createLesson();
  
  // Dismiss loading toast
  toast.dismiss(loadingToastId);
  
  // Show success toast
  toast.success("Success", {
    description: `New ${contentType} added successfully`
  });
} catch (error) {
  // Dismiss loading toast
  toast.dismiss(loadingToastId);
  
  // Show error toast
  toast.error("Error", {
    description: "Failed to add content. Please try again."
  });
}
```

### Form Validation

```tsx
if (!title.trim()) {
  toast.error("Validation Error", {
    description: "Please enter a title"
  });
  return;
}
```

### Confirmation

```tsx
toast.success("Settings Saved", {
  description: "Your preferences have been updated"
});
```
