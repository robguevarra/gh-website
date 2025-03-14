# Graceful Homeschooling Component Usage Guide

This guide provides recommendations for when and how to use specific UI components throughout the Graceful Homeschooling website. By following these guidelines, we can ensure a consistent and user-friendly experience.

## Navigation Components

### Navigation Menu (`navigation-menu.tsx`)

**When to use:**
- For primary site navigation
- When you need hierarchical menus with dropdowns
- For horizontal navigation patterns

**Best practices:**
- Keep top-level items limited (5-7 max)
- Use clear, concise labels
- Group related items in dropdowns
- Include visual indicators for current page

**Example:**
```jsx
<NavigationMenu>
  <NavigationMenuList>
    <NavigationMenuItem>
      <NavigationMenuTrigger>Getting Started</NavigationMenuTrigger>
      <NavigationMenuContent>
        <ul className="grid gap-3 p-4 md:w-[400px] lg:w-[500px] lg:grid-cols-[.75fr_1fr]">
          <li className="row-span-3">
            <NavigationMenuLink asChild>
              <a className="flex h-full w-full flex-col justify-end rounded-md bg-gradient-to-b from-muted/50 to-muted p-6 no-underline outline-none focus:shadow-md">
                <div className="mb-2 mt-4 text-lg font-medium">
                  Homeschooling Basics
                </div>
                <p className="text-sm leading-tight text-muted-foreground">
                  Everything you need to know to get started with homeschooling.
                </p>
              </a>
            </NavigationMenuLink>
          </li>
          <ListItem href="/getting-started" title="Introduction">
            A brief overview of homeschooling principles
          </ListItem>
          <ListItem href="/curriculum" title="Curriculum">
            Choose the right curriculum for your family
          </ListItem>
          <ListItem href="/legal" title="Legal Requirements">
            Understanding legal requirements in your state
          </ListItem>
        </ul>
      </NavigationMenuContent>
    </NavigationMenuItem>
    {/* More menu items */}
  </NavigationMenuList>
</NavigationMenu>
```

### Sidebar (`sidebar.tsx`)

**When to use:**
- For section/category navigation
- For admin or account areas
- When there are many navigation options
- On larger screens where space permits

**Best practices:**
- Clearly indicate active state
- Group related items visually
- Consider collapsible sections for complex hierarchies
- Ensure it's responsive (convert to other nav patterns on mobile)

**Example:**
```jsx
<Sidebar>
  <SidebarSection label="Resources">
    <SidebarItem href="/resources/printables" icon={<FileIcon />}>
      Printables
    </SidebarItem>
    <SidebarItem href="/resources/lesson-plans" icon={<BookOpenIcon />}>
      Lesson Plans
    </SidebarItem>
    <SidebarItem href="/resources/videos" icon={<VideoIcon />}>
      Video Lessons
    </SidebarItem>
  </SidebarSection>
  <SidebarSection label="Account">
    <SidebarItem href="/account/profile" icon={<UserIcon />}>
      Profile
    </SidebarItem>
    <SidebarItem href="/account/settings" icon={<SettingsIcon />}>
      Settings
    </SidebarItem>
  </SidebarSection>
</Sidebar>
```

### Breadcrumb (`breadcrumb.tsx`)

**When to use:**
- To show hierarchical navigation path
- On content-heavy pages
- When users need to navigate up a level
- For complex site structures

**Best practices:**
- Keep labels concise
- Make each step clickable
- Use appropriate separators (> or /)
- Limit to 3-5 levels when possible

**Example:**
```jsx
<Breadcrumb>
  <BreadcrumbList>
    <BreadcrumbItem>
      <BreadcrumbLink href="/">Home</BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbLink href="/resources">Resources</BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbLink href="/resources/math">Math</BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbPage>Algebra Worksheets</BreadcrumbPage>
    </BreadcrumbItem>
  </BreadcrumbList>
</Breadcrumb>
```

## Input Components

### Input (`input.tsx`)

**When to use:**
- For single-line text entry
- Email addresses, names, search queries
- Short-form data collection

**Best practices:**
- Always include a descriptive label
- Add placeholder text for guidance
- Include validation with clear error messages
- Consider autocomplete attributes for common fields

**Example:**
```jsx
<div className="space-y-2">
  <Label htmlFor="email">Email Address</Label>
  <Input 
    id="email"
    type="email"
    placeholder="you@example.com"
    aria-describedby="email-error"
    required
  />
  <p id="email-error" className="text-sm text-destructive">
    {errorMessage}
  </p>
</div>
```

### Textarea (`textarea.tsx`)

**When to use:**
- For multi-line text entry
- Comments, feedback, longer messages
- When users need to write paragraphs

**Best practices:**
- Set appropriate initial size
- Consider character limits or counters
- Allow resizing when appropriate
- Provide clear focus states

**Example:**
```jsx
<div className="space-y-2">
  <Label htmlFor="feedback">Your Feedback</Label>
  <Textarea
    id="feedback"
    placeholder="Tell us what you think..."
    className="min-h-[120px]"
  />
  <p className="text-xs text-muted-foreground text-right">
    Maximum 500 characters
  </p>
</div>
```

### Select (`select.tsx`)

**When to use:**
- For choosing from predefined options
- When space is limited
- For single-choice selection from a moderate list

**Best practices:**
- Include a clear label
- Provide a default/placeholder option when appropriate
- Order options logically (alphabetical, numerical, etc.)
- Consider using combobox for searchable selects with many options

**Example:**
```jsx
<div className="space-y-2">
  <Label htmlFor="grade">Grade Level</Label>
  <Select>
    <SelectTrigger id="grade">
      <SelectValue placeholder="Select a grade" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="k">Kindergarten</SelectItem>
      <SelectItem value="1">1st Grade</SelectItem>
      <SelectItem value="2">2nd Grade</SelectItem>
      <SelectItem value="3">3rd Grade</SelectItem>
      <SelectItem value="4">4th Grade</SelectItem>
      <SelectItem value="5">5th Grade</SelectItem>
    </SelectContent>
  </Select>
</div>
```

### Checkbox (`checkbox.tsx`)

**When to use:**
- For boolean options (on/off, true/false)
- For multiple selection from a list
- For terms agreement, opt-in features

**Best practices:**
- Position label to the right of the checkbox
- Use positive phrasing (what will happen, not what won't happen)
- Group related checkboxes visually
- Make touch targets sufficiently large

**Example:**
```jsx
<div className="space-y-4">
  <div className="space-y-2">
    <h3 className="text-sm font-medium">Subjects of Interest</h3>
    <div className="space-y-2">
      <div className="flex items-center space-x-2">
        <Checkbox id="math" />
        <Label htmlFor="math">Mathematics</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox id="science" />
        <Label htmlFor="science">Science</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox id="language" />
        <Label htmlFor="language">Language Arts</Label>
      </div>
    </div>
  </div>
</div>
```

## Display Components

### Card (`card.tsx`)

**When to use:**
- To group related information
- For grid layouts of similar content
- Product displays, feature highlights
- Dashboard widgets

**Best practices:**
- Maintain consistent spacing within cards
- Use clear visual hierarchy (title, content, actions)
- Keep content concise
- Consider hover states for interactive cards

**Example:**
```jsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  <Card className="overflow-hidden">
    <img 
      src="/images/math-resources.jpg" 
      alt="Math Resources" 
      className="w-full h-48 object-cover"
    />
    <CardHeader>
      <CardTitle>Math Resources</CardTitle>
      <CardDescription>Printable worksheets and activities</CardDescription>
    </CardHeader>
    <CardContent>
      <p>Explore our collection of math resources designed to make learning fun and engaging.</p>
    </CardContent>
    <CardFooter className="flex justify-between">
      <Button variant="outline">Preview</Button>
      <Button>Download</Button>
    </CardFooter>
  </Card>
  {/* More cards */}
</div>
```

### Tabs (`tabs.tsx`)

**When to use:**
- To organize content into discrete sections
- When users need to switch between related views
- For form sections or different content categories
- When space is limited

**Best practices:**
- Use short, descriptive tab labels
- Maintain content consistency between tabs
- Clearly indicate the active tab
- Consider the number of tabs (3-5 is often optimal)

**Example:**
```jsx
<Tabs defaultValue="daily">
  <TabsList className="grid grid-cols-3">
    <TabsTrigger value="daily">Daily Schedule</TabsTrigger>
    <TabsTrigger value="weekly">Weekly Plan</TabsTrigger>
    <TabsTrigger value="monthly">Monthly Overview</TabsTrigger>
  </TabsList>
  <TabsContent value="daily">
    <Card>
      <CardHeader>
        <CardTitle>Daily Schedule</CardTitle>
        <CardDescription>Plan your homeschool day</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Daily schedule content */}
      </CardContent>
    </Card>
  </TabsContent>
  <TabsContent value="weekly">
    {/* Weekly plan content */}
  </TabsContent>
  <TabsContent value="monthly">
    {/* Monthly overview content */}
  </TabsContent>
</Tabs>
```

### Accordion (`accordion.tsx`)

**When to use:**
- For FAQ sections
- To conserve vertical space
- When showing one section at a time is sufficient
- For hierarchical content that can be collapsed

**Best practices:**
- Use clear, descriptive headings
- Keep content in each section focused
- Consider whether multiple sections should be open simultaneously
- Ensure sufficient contrast for the expand/collapse indicators

**Example:**
```jsx
<Accordion type="single" collapsible className="w-full">
  <AccordionItem value="item-1">
    <AccordionTrigger>
      How do I get started with homeschooling?
    </AccordionTrigger>
    <AccordionContent>
      <p>Starting your homeschooling journey involves several key steps:</p>
      <ul className="list-disc pl-6 mt-2 space-y-1">
        <li>Research your state's homeschooling laws and requirements</li>
        <li>Choose a curriculum that fits your educational philosophy</li>
        <li>Set up a learning environment in your home</li>
        <li>Connect with local homeschooling groups for support</li>
      </ul>
    </AccordionContent>
  </AccordionItem>
  <AccordionItem value="item-2">
    <AccordionTrigger>
      What curriculum should I use?
    </AccordionTrigger>
    <AccordionContent>
      {/* Curriculum information */}
    </AccordionContent>
  </AccordionItem>
  <AccordionItem value="item-3">
    <AccordionTrigger>
      How do I track progress and grades?
    </AccordionTrigger>
    <AccordionContent>
      {/* Progress tracking information */}
    </AccordionContent>
  </AccordionItem>
</Accordion>
```

### Carousel (`carousel.tsx`)

**When to use:**
- For showcasing visual content (images, testimonials)
- When space is limited but multiple items need to be shown
- For featured content that deserves attention
- Product displays or gallery views

**Best practices:**
- Include clear navigation controls
- Show pagination indicators
- Optimize for mobile with touch gestures
- Consider auto-advancing for promotional content (with pause on hover)
- Ensure keyboard accessibility

**Example:**
```jsx
<Carousel className="w-full max-w-xs sm:max-w-sm md:max-w-md mx-auto">
  <CarouselContent>
    <CarouselItem>
      <div className="p-1">
        <div className="bg-card rounded-lg overflow-hidden">
          <img 
            src="/testimonials/family-1.jpg" 
            alt="The Johnson Family" 
            className="w-full h-48 object-cover"
          />
          <div className="p-4">
            <blockquote className="text-sm italic">
              "Graceful Homeschooling resources have transformed our learning journey. The curriculum guides are exceptional!"
            </blockquote>
            <p className="mt-2 text-right text-sm font-medium">— The Johnson Family</p>
          </div>
        </div>
      </div>
    </CarouselItem>
    {/* More testimonials */}
  </CarouselContent>
  <CarouselPrevious />
  <CarouselNext />
</Carousel>
```

## Feedback Components

### Alert (`alert.tsx`)

**When to use:**
- To communicate important information
- For system status updates
- To highlight important notes or warnings
- For contextual guidance

**Best practices:**
- Choose appropriate status (info, warning, error, success)
- Keep messages clear and concise
- Include actions when appropriate
- Use sparingly to avoid alert fatigue

**Example:**
```jsx
<Alert variant="default">
  <AlertCircle className="h-4 w-4" />
  <AlertTitle>Heads up!</AlertTitle>
  <AlertDescription>
    Your subscription will renew in 5 days. Visit your account page to manage your subscription.
  </AlertDescription>
</Alert>

<Alert variant="destructive">
  <AlertCircle className="h-4 w-4" />
  <AlertTitle>Payment failed</AlertTitle>
  <AlertDescription>
    We were unable to process your payment. Please check your payment method and try again.
  </AlertDescription>
</Alert>
```

### Toast (`toast.tsx`, `toaster.tsx`)

**When to use:**
- For transient, non-critical notifications
- After user actions for confirmation
- System status updates that don't require action
- For success or error messages

**Best practices:**
- Keep messages brief
- Position consistently (typically top-right)
- Auto-dismiss after appropriate time
- Allow manual dismissal
- Limit the number shown simultaneously

**Example:**
```jsx
// Component that uses toast
function DownloadButton() {
  const { toast } = useToast()
  
  return (
    <Button 
      onClick={() => {
        // Download logic
        toast({
          title: "Resource Downloaded",
          description: "Your resource has been downloaded successfully.",
        })
      }}
    >
      Download Resource
    </Button>
  )
}

// Make sure to include the Toaster component in your layout
<Toaster />
```

### Dialog (`dialog.tsx`)

**When to use:**
- For important interactions requiring user attention
- Confirmation of destructive actions
- Short forms or inputs
- When task completion needs focus

**Best practices:**
- Clear titles describing the purpose
- Keep content focused and concise
- Include descriptive action buttons
- Ensure keyboard accessibility and focus management
- Allow dismissal by clicking outside or pressing ESC

**Example:**
```jsx
<Dialog>
  <DialogTrigger asChild>
    <Button variant="outline">Subscribe to Newsletter</Button>
  </DialogTrigger>
  <DialogContent className="sm:max-w-[425px]">
    <DialogHeader>
      <DialogTitle>Subscribe to Our Newsletter</DialogTitle>
      <DialogDescription>
        Receive weekly homeschooling tips, resources, and updates.
      </DialogDescription>
    </DialogHeader>
    <div className="grid gap-4 py-4">
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="name" className="text-right">
          Name
        </Label>
        <Input id="name" className="col-span-3" />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="email" className="text-right">
          Email
        </Label>
        <Input id="email" type="email" className="col-span-3" />
      </div>
    </div>
    <DialogFooter>
      <Button type="submit">Subscribe</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

## Action Components

### Button (`button.tsx`)

**When to use:**
- Primary actions: Form submissions, confirmations
- Secondary actions: Alternative options, less important actions
- Destructive actions: Delete, remove, cancel (with appropriate styling)
- Navigation: When a button-like appearance is desired for links

**Variants:**
- **Default**: Primary actions (purple)
- **Secondary**: Alternative actions (pink)
- **Outline**: Less prominent actions
- **Ghost**: Minimal visual interference
- **Link**: For actions that should appear as links
- **Destructive**: For potentially dangerous actions (red)

**Sizes:**
- **Default**: Standard usage
- **Small**: When space is limited
- **Large**: For emphasis or touch targets
- **Icon**: For icon-only buttons

**Best practices:**
- Use clear, action-oriented labels (e.g., "Save Changes" not "Submit")
- Maintain hierarchy (primary, secondary, tertiary actions)
- Ensure sufficient contrast
- Consider loading states for async actions
- Position consistently in forms and dialogs

**Example:**
```jsx
<div className="space-y-4">
  <div className="flex space-x-2">
    <Button>Save Changes</Button>
    <Button variant="outline">Cancel</Button>
  </div>
  
  <div className="flex space-x-2">
    <Button variant="secondary">Preview</Button>
    <Button variant="ghost">Reset</Button>
  </div>
  
  <div className="flex space-x-2">
    <Button variant="destructive">Delete Account</Button>
    <Button variant="link">Learn more</Button>
  </div>
  
  <div className="flex space-x-2">
    <Button size="sm">Small</Button>
    <Button size="default">Default</Button>
    <Button size="lg">Large</Button>
    <Button size="icon"><Heart className="h-4 w-4" /></Button>
  </div>
</div>
```

## Accessibility Considerations

### Keyboard Navigation

Ensure all interactive components are keyboard accessible:
- Focusable in logical order
- Clear focus indicators
- Proper ARIA roles and attributes
- Support for keyboard shortcuts where appropriate

### Screen Readers

Components should be compatible with screen readers:
- Use semantic HTML when possible
- Include appropriate ARIA labels
- Ensure state changes are announced
- Provide context for dynamic content

### Color Contrast

Maintain sufficient contrast for all users:
- Test color combinations against WCAG AA standards
- Avoid relying solely on color to convey information
- Provide alternative indicators (text, icons)

### Motion Sensitivity

Be mindful of users with motion sensitivity:
- Respect `prefers-reduced-motion` settings
- Keep animations subtle and purposeful
- Provide options to disable animations

## Best Practices for Implementation

1. **Consistency**: Use the same component for the same purpose throughout the site
2. **Composition**: Combine components thoughtfully without overloading interfaces
3. **Responsiveness**: Ensure components adapt well across device sizes
4. **Performance**: Minimize unnecessary re-renders and optimize for speed
5. **Documentation**: Add inline comments for complex implementations
6. **Accessibility**: Test with keyboard navigation and screen readers
7. **Progressive Enhancement**: Ensure basic functionality works without JavaScript

---

This document serves as a living guide and will be updated as new components are added or existing ones evolve. For detailed API information about each component, refer to the component's source code and comments. 