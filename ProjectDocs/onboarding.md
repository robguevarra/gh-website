# Graceful Homeschooling Developer Onboarding Guide

Welcome to the Graceful Homeschooling platform development team! This guide will help you get set up with the project, understand our development workflows, and familiarize yourself with our coding standards.

## Table of Contents

1. [Project Overview](#project-overview)
2. [Development Environment Setup](#development-environment-setup)
3. [Project Structure](#project-structure)
4. [Development Workflow](#development-workflow)
5. [Coding Standards](#coding-standards)
6. [Working with Supabase](#working-with-supabase)
7. [Testing](#testing)
8. [Deployment](#deployment)
9. [Troubleshooting](#troubleshooting)
10. [Additional Resources](#additional-resources)

## Project Overview

Graceful Homeschooling is an award-winning platform for homeschooling resources, education, and community. The platform is built with Next.js 15, TypeScript, TailwindCSS, and Supabase.

### Key Features

- User authentication and account management
- Course creation, management, and enrollment
- Membership tiers and subscription management
- Admin dashboard for platform management
- Interactive learning tools and resources

### Tech Stack

- **Frontend**: Next.js 15 with App Router, TypeScript, TailwindCSS, Shadcn UI
- **Backend**: Next.js API Routes, Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **State Management**: Zustand for client-side state
- **Styling**: TailwindCSS with custom design system
- **Animation**: Framer Motion
- **Form Handling**: React Hook Form with Zod validation

## Development Environment Setup

### Prerequisites

- Node.js (v18.17.0 or higher)
- npm (v9.6.0 or higher)
- Git

### Getting Started

1. **Clone the repository**

   ```bash
   git clone https://github.com/graceful-homeschooling/gh-website.git
   cd gh-website
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   Copy the `.env.local.example` file to `.env.local` and fill in the required values:

   ```bash
   cp .env.local.example .env.local
   ```

   Required environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key (for admin operations)

4. **Start the development server**

   ```bash
   npm run dev
   ```

   The application will be available at [http://localhost:3000](http://localhost:3000).

### Editor Setup

We recommend using Visual Studio Code with the following extensions:

- ESLint
- Prettier
- Tailwind CSS IntelliSense
- TypeScript ESLint
- Error Lens

Our repository includes VSCode settings that configure these extensions with our project's standards.

## Project Structure

The project follows a domain-driven directory structure:

```
app/                  # Next.js App Router
  ├── admin/          # Admin pages and functionality
  ├── (auth)/         # Authentication routes (grouped)
  ├── (marketing)/    # Public-facing/marketing pages (grouped)
  ├── api/            # API routes
  ├── courses/        # Course pages and functionality
  ├── account/        # User account management
  ├── layout.tsx      # Root layout
  └── page.tsx        # Homepage
components/           # React components
  ├── admin/          # Admin-specific components
  ├── auth/           # Authentication components
  ├── course/         # Course-related components
  ├── layouts/        # Layout components
  ├── ui/             # Shared UI components
  ├── providers/      # Context providers
  └── forms/          # Form components
lib/                  # Utility functions and modules
  ├── supabase/       # Supabase client and utilities
  ├── hooks/          # Custom React hooks
  ├── utils/          # Utility functions
  ├── validators/     # Form and data validators
  └── constants/      # Application constants
types/                # TypeScript type definitions
  ├── supabase.ts     # Supabase database types
  ├── api.ts          # API request/response types
  ├── forms.ts        # Form-related types
  └── index.ts        # Shared types
ProjectDocs/          # Project documentation
  ├── Build_Notes/    # Implementation documentation
  ├── contexts/       # Project and design context
  └── templates/      # Templates for documentation
public/               # Static assets
```

For detailed information about each directory, refer to the README.md files in each folder.

## Development Workflow

### Git Workflow

We follow a feature branch workflow:

1. **Create a feature branch** from the `main` branch:

   ```bash
   git checkout -b feature/feature-name
   ```

2. **Make changes** and commit them with descriptive messages:

   ```bash
   git add .
   git commit -m "feat: add course enrollment feature"
   ```

   We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification for commit messages.

3. **Push your branch** to the remote repository:

   ```bash
   git push -u origin feature/feature-name
   ```

4. **Create a pull request** on GitHub for code review.

5. **Address review comments** and make necessary changes.

6. Once approved, your changes will be **merged into the main branch**.

### Feature Development Process

1. **Understand requirements** by reviewing relevant build notes and context documents in the `ProjectDocs` directory.

2. **Plan your implementation** by identifying the components, API routes, and database changes needed.

3. **Implement the feature** following our coding standards and patterns.

4. **Write tests** for your implementation.

5. **Document your work** by updating or creating appropriate documentation.

6. **Submit for review** through a pull request.

### Running Tasks

We use npm scripts for common tasks:

- `npm run dev`: Start the development server
- `npm run build`: Build the application for production
- `npm run start`: Start the production server
- `npm run lint`: Run ESLint to check for code issues
- `npm run format`: Format code with Prettier
- `npm test`: Run tests

## Coding Standards

For detailed coding standards, please refer to the [`ProjectDocs/coding-standards.md`](ProjectDocs/coding-standards.md) document. Here's a summary of our key standards:

### TypeScript

- Use proper type annotations for all variables, function parameters, and return types
- Avoid using `any` type whenever possible
- Use interfaces for object shapes and types for unions and primitives
- Create reusable types in the `types` directory

### React Components

- Use function components with TypeScript
- Use server components by default, only use client components when necessary
- Keep components focused on a single responsibility
- Extract complex logic into custom hooks
- Limit file size to a maximum of 150 lines

### Component Structure

```tsx
// Import statements
import { useState } from 'react';
import { Button } from '@/components/ui/button';

// Type definitions
interface ExampleProps {
  title: string;
  onClick?: () => void;
}

// Component function
export function Example({ title, onClick }: ExampleProps) {
  // State and hooks
  const [isOpen, setIsOpen] = useState(false);
  
  // Event handlers
  const handleClick = () => {
    setIsOpen(!isOpen);
    onClick?.();
  };
  
  // Render
  return (
    <div>
      <h2>{title}</h2>
      <Button onClick={handleClick}>
        {isOpen ? 'Close' : 'Open'}
      </Button>
    </div>
  );
}
```

### Styling

- Use TailwindCSS for styling
- Follow our design system for colors, spacing, typography, etc.
- Use the `cn` utility function for conditional class names

### Documentation

- Use JSDoc comments for components, functions, and types
- Document component props, parameters, and return values
- Include usage examples for complex components

## Working with Supabase

### Important Considerations

- **@Supabase Migration**: We've migrated from `@supabase/auth-helpers-nextjs` to `@supabase/ssr`. Make sure to use the new package.
- **@Dynamic APIs**: In Next.js 15+, dynamic APIs like `cookies()`, `headers()`, and the `params` and `searchParams` props are asynchronous and must be properly awaited.

### Authentication

We use Supabase Auth with the PKCE flow for secure authentication. Here's how to work with authentication:

#### Client-Side Authentication

```tsx
'use client';

import { createClient } from '@/lib/supabase/client';
import { useState } from 'react';

export function SignInForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const handleSignIn = async () => {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      console.error('Error signing in:', error);
    }
  };
  
  return (
    // Form implementation
  );
}
```

#### Server-Side Authentication

```tsx
import { createServerClient } from '@/lib/supabase/server';

export default async function ProtectedPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    // Handle unauthenticated user
    redirect('/login');
  }
  
  // Render protected content
  return (
    <div>Protected content for {user.email}</div>
  );
}
```

### Database Operations

Use the Supabase client for database operations:

```tsx
import { createServerClient } from '@/lib/supabase/server';

export async function getCourses() {
  try {
    const supabase = await createServerClient();
    
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('status', 'published');
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error('Error fetching courses:', error);
    throw error;
  }
}
```

## Testing

We use Jest and React Testing Library for testing our application.

### Running Tests

- `npm test`: Run all tests
- `npm test -- --watch`: Run tests in watch mode
- `npm test -- -t "test name"`: Run specific tests

### Writing Tests

#### Component Tests

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@/components/ui/button';

describe('Button', () => {
  it('renders correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });
  
  it('calls onClick when clicked', async () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    await userEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

#### Utility Tests

```tsx
import { formatDate } from '@/lib/utils/date-utils';

describe('formatDate', () => {
  it('formats date correctly with default format', () => {
    const date = new Date(2023, 0, 1);
    expect(formatDate(date)).toBe('Jan 01, 2023');
  });
  
  it('formats date with custom format', () => {
    const date = new Date(2023, 0, 1);
    expect(formatDate(date, 'MM/dd/yyyy')).toBe('01/01/2023');
  });
});
```

## Deployment

We use Vercel for deployment. The deployment process is automated through GitHub integration.

### Environments

- **Production**: Deployed from the `main` branch
- **Staging**: Deployed from the `staging` branch
- **Preview**: Deployed from pull requests

### Deployment Process

1. Changes are pushed to a feature branch
2. A pull request is created for review
3. Once approved, the changes are merged into the main branch
4. Vercel automatically deploys the changes to production

## Troubleshooting

### Common Issues

#### Supabase Authentication Issues

If you're experiencing authentication issues:

1. Make sure your environment variables are correctly set
2. Check if you're using the correct client (browser vs. server)
3. Ensure that you're awaiting the client creation

```tsx
// Correct
const supabase = await createServerClient();

// Incorrect - will cause "supabase.from is not a function" errors
const supabase = createServerClient();
```

#### Next.js Dynamic API Issues

If you're seeing errors related to cookies, headers, params, or searchParams:

1. Make sure you're properly awaiting these values:

```tsx
// Correct
const cookieStore = await cookies();

// Incorrect
const cookieStore = cookies();
```

#### TypeScript Errors

If you're seeing TypeScript errors:

1. Make sure your Supabase types are up to date
2. Check if you're importing the correct types
3. Verify that you're using the correct prop types for components

## Additional Resources

- [Project Context](ProjectDocs/contexts/projectContext.md): Overview of the project goals and architecture
- [Design Context](ProjectDocs/contexts/designContext.md): Design system and UI guidelines
- [Component Libraries](ProjectDocs/component-libraries.md): Documentation of our component libraries
- [Code Documentation Standards](ProjectDocs/code-documentation-standards.md): Standards for code documentation
- [Supabase Integration](ProjectDocs/contexts/supabase-integration.md): Details on Supabase integration

### External Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Supabase Documentation](https://supabase.io/docs)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)
- [Shadcn UI Documentation](https://ui.shadcn.com/)

---

*Last updated: March 24, 2024* 