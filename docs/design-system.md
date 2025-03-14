# Graceful Homeschooling Design System

## Introduction

This document outlines the comprehensive design system for the Graceful Homeschooling website. It serves as a single source of truth for all design-related decisions and implementations, ensuring consistency across all pages and components.

## Brand Identity

### Brand Values
- **Warmth**: Creating an inviting and nurturing environment that reflects the homeschooling experience
- **Elegance**: Maintaining a sophisticated and polished appearance that resonates with parents
- **Clarity**: Presenting information in a straightforward, accessible manner
- **Support**: Conveying a sense of community and assistance throughout the user journey

### Logo
The logo incorporates a soft purple color scheme that serves as the foundation for the site's color palette. The logo should always be displayed with proper spacing and never be altered in proportion or color.

## Color System

### Primary Palette

The color system is built on a harmonious palette inspired by the brand's identity:

- **Primary (Purple)**: `hsl(315 15% 60%)` - #b08ba5
  - Used for primary actions, key UI elements, and brand identification
  - Light foreground text: `hsl(0 0% 100%)` - #ffffff

- **Secondary (Pink)**: `hsl(355 70% 85%)` - #f1b5bc
  - Used for secondary actions, highlights, and accents
  - Dark foreground text: `hsl(20 25% 23%)` - #4d3c33

- **Accent (Blue)**: `hsl(200 35% 75%)` - #9ac5d9
  - Used for tertiary elements, subtle highlights, and complementary components
  - Dark foreground text: `hsl(20 25% 23%)` - #4d3c33

### Neutral Palette

- **Background**: `hsl(30 33% 98%)` - #f9f6f2
- **Foreground (Text)**: `hsl(20 25% 23%)` - #4d3c33
- **Muted**: `hsl(25 30% 90%)` - #eae0d5
- **Muted Foreground**: `hsl(20 15% 40%)` - #6f5c51
- **Border**: `hsl(30 15% 90%)` - #e9e0d8
- **Input**: `hsl(30 15% 90%)` - #e9e0d8

### Dark Mode Palette

When dark mode is enabled:

- **Background**: `hsl(20 25% 10%)` - #261f1a
- **Foreground**: `hsl(30 33% 98%)` - #f9f6f2
- **Muted**: `hsl(20 25% 20%)` - #4d3c33
- **Muted Foreground**: `hsl(30 33% 70%)` - #d9c5ad

### Chart Colors

For data visualization:

- Chart 1: Primary purple
- Chart 2: Secondary pink
- Chart 3: Accent blue
- Chart 4: Muted neutral
- Chart 5: Complementary green

### Color Usage Guidelines

1. **Consistency**: Maintain color consistency across similar UI elements
2. **Contrast**: Ensure sufficient contrast between text and background colors (WCAG AA compliance)
3. **Emphasis**: Use primary colors to draw attention to important elements
4. **Balance**: Create visual harmony by balancing color usage throughout interfaces

## Typography

### Font Families

- **Primary Font (Sans-Serif)**: Inter
  - Used for body text, UI elements, and functional content
  - Provides clarity and readability at various sizes

- **Secondary Font (Serif)**: Playfair Display
  - Used for headings, quotes, and decorative elements
  - Adds elegance and visual interest

### Type Scale

- **Headings**:
  - H1: 2.5rem (40px), Playfair Display, font-weight: 700
  - H2: 2rem (32px), Playfair Display, font-weight: 700
  - H3: 1.75rem (28px), Playfair Display, font-weight: 600
  - H4: 1.5rem (24px), Playfair Display, font-weight: 600
  - H5: 1.25rem (20px), Inter, font-weight: 600
  - H6: 1rem (16px), Inter, font-weight: 600

- **Body**:
  - Default: 1rem (16px), Inter, font-weight: 400
  - Small: 0.875rem (14px), Inter, font-weight: 400
  - Extra Small: 0.75rem (12px), Inter, font-weight: 400

### Text Styles

- **Text Gradient**: Used for special emphasis
  ```css
  .text-gradient {
    background: linear-gradient(135deg, #b08ba5 0%, #f1b5bc 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  ```

- **Line Heights**:
  - Headings: 1.2-1.3
  - Body text: 1.5-1.6
  - UI elements: 1.2

## Spacing System

The spacing system follows a consistent pattern to create harmony throughout the interface:

- **4px base unit**: All spacing follows multiples of 4px
- **Common spacings**:
  - Extra small: 0.25rem (4px)
  - Small: 0.5rem (8px)
  - Medium: 1rem (16px)
  - Large: 1.5rem (24px)
  - Extra large: 2rem (32px)
  - 2x Extra large: 3rem (48px)

## Border Radius

Border radius follows a consistent system:
- Large: `--radius` (0.75rem/12px)
- Medium: `calc(var(--radius) - 2px)` (0.625rem/10px)
- Small: `calc(var(--radius) - 4px)` (0.5rem/8px)

## Shadows

- **Card Shadow**: `0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)`
- **Dropdown Shadow**: `0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)`
- **Button Hover Shadow**: `0 4px 10px rgba(176, 139, 165, 0.3)`

## Components

### Buttons

Buttons follow consistent styling with multiple variants:

- **Default**: Purple background, white text
- **Secondary**: Pink background, dark text
- **Outline**: Transparent with border, dark text
- **Ghost**: No background, dark text
- **Link**: No background, purple text with underline on hover

Sizes:
- Default: h-10 px-4 py-2
- Small: h-9 px-3
- Large: h-11 px-8
- Icon: h-10 w-10

### Cards

Cards serve as containers for related content and follow consistent styling:
- Background: Light background in light mode, dark in dark mode
- Soft shadows for elevation
- Consistent border radius
- Properly spaced padding

### Form Elements

Form elements follow the same design system:
- Inputs with consistent styling and focus states
- Checkboxes and radio buttons with brand-aligned active states
- Select menus with consistent dropdown styling
- Form validation with clear error messaging

### Navigation

Navigation components have consistent styling:
- Clear active/inactive states
- Hover effects aligned with brand
- Mobile-responsive adaptations

## Animation Guidelines

### Principles

1. **Purposeful**: Animations should serve a purpose (guiding attention, indicating state change)
2. **Subtle**: Avoid excessive or distracting animations
3. **Consistent**: Use consistent timing and easing across similar animations
4. **Responsive**: Animations should adapt gracefully across devices

### Timing

- **Quick actions** (buttons, toggles): 150-200ms
- **Page transitions**: 300-500ms
- **Attention-drawing animations**: 500-800ms

### Animation Types

- **Micro-interactions**: Subtle feedback for user actions
- **State changes**: Smooth transitions between UI states
- **Page transitions**: Cohesive movements between pages
- **Loading states**: Engaging but unobtrusive loading animations

### Float Animation

Used for subtle movement on certain elements:
```css
@keyframes float {
  0% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-10px);
  }
  100% {
    transform: translateY(0px);
  }
}

.float {
  animation: float 6s ease-in-out infinite;
}
```

## Custom Cursor

The site features an optional custom cursor that can be toggled by users:

- Default state is off for accessibility
- When enabled, cursor is handled via CSS
- Different states for actionable elements
- Toggle button located at the bottom right of the screen

Implementation:
```css
@media (min-width: 768px) {
  body.custom-cursor {
    cursor: none;
  }

  body.custom-cursor a,
  body.custom-cursor button,
  body.custom-cursor input,
  body.custom-cursor textarea,
  body.custom-cursor [role="button"] {
    cursor: none !important;
  }
}
```

## Responsive Design

### Breakpoints

- **Mobile**: < 640px
- **Tablet**: 640px - 1023px
- **Desktop**: ≥ 1024px
- **Large Desktop**: ≥ 1280px

### Approach

- **Mobile-first**: Design for mobile, then enhance for larger screens
- **Fluid layouts**: Use relative units (%, rem) over fixed units
- **Strategic breakpoints**: Apply breakpoints based on content needs, not device
- **Component adaptability**: Components should responsively adapt to viewport size

## Accessibility Guidelines

- **Color contrast**: Meet WCAG AA standards (4.5:1 for normal text, 3:1 for large text)
- **Keyboard navigation**: All interactive elements must be keyboard accessible
- **Screen readers**: All content should be screen reader friendly with proper ARIA attributes
- **Focus states**: Clear visual focus indicators for all interactive elements
- **Reduced motion**: Support prefers-reduced-motion media query

## Custom Scrollbar

Custom scrollbar styling for desktop browsers:
```css
::-webkit-scrollbar {
  width: 10px;
}

::-webkit-scrollbar-track {
  background: #f9f6f2;
}

::-webkit-scrollbar-thumb {
  background: #b08ba5;
  border-radius: 5px;
}

::-webkit-scrollbar-thumb:hover {
  background: #9a7a94;
}
```

## Implementation Guidelines

### For Developers

1. **Use existing components**: Leverage the established UI component library
2. **Follow naming conventions**: Use consistent BEM-style class naming
3. **Maintain theme variables**: Use CSS variables rather than hardcoded values
4. **Use utility classes**: Utilize the Tailwind utility classes for consistency
5. **Component variations**: Create variations through props rather than new components
6. **Documentation**: Document any new components or design patterns

### For Designers

1. **Maintain consistency**: Adhere to established patterns and components
2. **Validate designs**: Ensure designs meet accessibility standards
3. **Consider responsive behavior**: Design with all viewports in mind
4. **Use the color system**: Stay within the defined color palette
5. **Follow typographic rules**: Maintain the type hierarchy and scale

## Future Considerations

- Expansion of component variations
- Enhanced animation library
- Additional accessibility improvements
- Dark mode refinements
- RTL language support

---

*This document serves as a living style guide and will be updated as the design system evolves. Last updated: [Current Date]* 