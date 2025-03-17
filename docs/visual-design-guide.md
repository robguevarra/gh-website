# Graceful Homeschooling Visual Design Guide

![Graceful Homeschooling](https://placeholder-for-logo-image.com)

## Color Palette

### Primary Colors

```
┌─────────────────────────┐  ┌─────────────────────────┐  ┌─────────────────────────┐
│                         │  │                         │  │                         │
│                         │  │                         │  │                         │
│                         │  │                         │  │                         │
│      PRIMARY            │  │      SECONDARY          │  │      ACCENT             │
│   hsl(315 15% 60%)      │  │   hsl(355 70% 85%)      │  │   hsl(200 35% 75%)      │
│      #b08ba5            │  │      #f1b5bc            │  │      #9ac5d9            │
│                         │  │                         │  │                         │
│                         │  │                         │  │                         │
└─────────────────────────┘  └─────────────────────────┘  └─────────────────────────┘
```

### Neutral Colors

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│                 │  │                 │  │                 │  │                 │
│   BACKGROUND    │  │   FOREGROUND    │  │     MUTED       │  │  MUTED FOREGRND │
│  hsl(30 33% 98%)│  │ hsl(20 25% 23%) │  │ hsl(25 30% 90%) │  │ hsl(20 15% 40%) │
│    #f9f6f2      │  │    #4d3c33      │  │    #eae0d5      │  │    #6f5c51      │
│                 │  │                 │  │                 │  │                 │
└─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────────┘
```

### Dark Mode Colors

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│                 │  │                 │  │                 │  │                 │
│   BACKGROUND    │  │   FOREGROUND    │  │     MUTED       │  │  MUTED FOREGRND │
│ hsl(20 25% 10%) │  │ hsl(30 33% 98%) │  │ hsl(20 25% 20%) │  │ hsl(30 33% 70%) │
│    #261f1a      │  │    #f9f6f2      │  │    #4d3c33      │  │    #d9c5ad      │
│                 │  │                 │  │                 │  │                 │
└─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────────┘
```

## Typography

### Font Families

```
Inter (Sans-Serif)
ABCDEFGHIJKLMNOPQRSTUVWXYZ
abcdefghijklmnopqrstuvwxyz
1234567890!@#$%^&*()

Playfair Display (Serif)
ABCDEFGHIJKLMNOPQRSTUVWXYZ
abcdefghijklmnopqrstuvwxyz
1234567890!@#$%^&*()
```

### Type Scale Examples

```
# Heading 1 (2.5rem, Playfair Display)
## Heading 2 (2rem, Playfair Display)
### Heading 3 (1.75rem, Playfair Display)
#### Heading 4 (1.5rem, Playfair Display)
##### Heading 5 (1.25rem, Inter)
###### Heading 6 (1rem, Inter)

Body text (1rem, Inter)
Small text (0.875rem, Inter)
Extra small text (0.75rem, Inter)
```

### Text Gradient Effect

```jsx
<span className="text-gradient">
  This text has a beautiful gradient effect
</span>
```

## Component Examples

### Button Variants

```jsx
<Button variant="default">Default Button</Button>
<Button variant="secondary">Secondary Button</Button>
<Button variant="outline">Outline Button</Button>
<Button variant="ghost">Ghost Button</Button>
<Button variant="link">Link Button</Button>
```

### Button Sizes

```jsx
<Button size="sm">Small Button</Button>
<Button size="default">Default Button</Button>
<Button size="lg">Large Button</Button>
<Button size="icon"><Icon /></Button>
```

### Card Example

```jsx
<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card description text</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Card content goes here</p>
  </CardContent>
  <CardFooter>
    <Button>Action Button</Button>
  </CardFooter>
</Card>
```

### Form Elements

```jsx
<div className="space-y-4">
  <div className="space-y-2">
    <Label htmlFor="email">Email</Label>
    <Input id="email" placeholder="Enter your email" />
  </div>
  
  <div className="space-y-2">
    <Label htmlFor="options">Select option</Label>
    <Select>
      <SelectTrigger id="options">
        <SelectValue placeholder="Select an option" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="option1">Option 1</SelectItem>
        <SelectItem value="option2">Option 2</SelectItem>
      </SelectContent>
    </Select>
  </div>
  
  <div className="flex items-center space-x-2">
    <Checkbox id="terms" />
    <Label htmlFor="terms">Accept terms</Label>
  </div>
  
  <Button type="submit">Submit</Button>
</div>
```

## Animation Examples

### Float Animation

```jsx
<div className="float">
  This element will float up and down gently
</div>
```

### Transition Examples

```jsx
// Button with hover transition
<button className="bg-primary text-white transition-colors duration-200 hover:bg-primary/90">
  Hover Me
</button>

// Scale transition
<div className="transition-transform duration-200 hover:scale-105">
  Hover to Scale
</div>

// Opacity transition
<div className="transition-opacity duration-300 hover:opacity-70">
  Fade on Hover
</div>
```

## Responsive Layout Examples

### Mobile-First Approach

```jsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <Card>Content 1</Card>
  <Card>Content 2</Card>
  <Card>Content 3</Card>
</div>
```

### Responsive Typography

```jsx
<h1 className="text-2xl md:text-3xl lg:text-4xl font-serif">
  Responsive Heading
</h1>

<p className="text-sm md:text-base">
  Text that adjusts based on screen size
</p>
```

## Custom Cursor Implementation

```jsx
// Component implementation
export function CustomCursorToggle() {
  const [isEnabled, setIsEnabled] = useState(false)

  useEffect(() => {
    if (typeof document !== "undefined") {
      if (isEnabled) {
        document.body.classList.add("custom-cursor")
      } else {
        document.body.classList.remove("custom-cursor")
      }
    }
  }, [isEnabled])

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setIsEnabled(!isEnabled)}
      className="fixed bottom-4 right-4 z-50 bg-white/80 backdrop-blur-sm hover:bg-white/90"
      title={isEnabled ? "Disable custom cursor" : "Enable custom cursor"}
    >
      <MousePointer className={`h-4 w-4 ${isEnabled ? "text-[#ad8174]" : "text-gray-500"}`} />
    </Button>
  )
}
```

## Custom Scrollbar

```css
::-webkit-scrollbar {
  width: 10px;
}

::-webkit-scrollbar-track {
  background: #f9f6f2; /* Light background in light mode */
}

::-webkit-scrollbar-thumb {
  background: #b08ba5; /* Primary color */
  border-radius: 5px;
}

::-webkit-scrollbar-thumb:hover {
  background: #9a7a94; /* Slightly darker on hover */
}
```

## Quick Implementation Checklist

- [ ] Use CSS variables for colors and theme values
- [ ] Maintain consistent spacing using the 4px grid
- [ ] Use appropriate typography for content hierarchy
- [ ] Implement responsive layouts for all screen sizes
- [ ] Ensure animations are subtle and purposeful
- [ ] Follow accessibility best practices
- [ ] Use existing components from the UI library

---

This visual guide should be used in conjunction with the full design system documentation. For more detailed information, refer to the [Design System Documentation](./design-system.md). 