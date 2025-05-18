// UI Utilities for Email Campaign Components
// This file contains standardized styling for consistent UI across email campaign components

// Card styling with standardized shadows and borders
export const cardStyles = {
  default: "border border-border bg-card shadow-sm hover:shadow-md transition-shadow duration-200",
  elevated: "border border-border bg-card shadow-md hover:shadow-lg transition-shadow duration-200",
  interactive: "border border-border bg-card shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-200 cursor-pointer",
  plain: "border border-border bg-card",
  highlighted: "border border-primary/20 bg-card shadow-md hover:shadow-lg hover:border-primary/40 transition-all duration-200",
  dashboard: "border border-border bg-card shadow-sm rounded-lg",
  metrics: "border border-border bg-primary/5 shadow-sm rounded-lg hover:shadow-md transition-shadow duration-200",
};

// Button styling with consistent hover effects and transitions
export const buttonStyles = {
  // Primary action buttons (send, save, etc.)
  primary: "bg-primary text-primary-foreground hover:bg-primary/90 transition-colors duration-200",
  // Secondary action buttons (preview, test, etc.)
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/90 transition-colors duration-200",
  // Success action buttons (confirm, approve, etc.)
  success: "bg-green-600 text-white hover:bg-green-700 transition-colors duration-200",
  // Destructive action buttons (delete, cancel, etc.)
  destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors duration-200",
  // Outline buttons (back, cancel, etc.)
  outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors duration-200",
  // Ghost buttons (quick actions, icons, etc.)
  ghost: "hover:bg-accent hover:text-accent-foreground transition-colors duration-200",
  // Link buttons (navigation, related content)
  link: "text-primary underline-offset-4 hover:underline transition-colors duration-200",
};

// Badge styling for status indicators
export const badgeStyles = {
  draft: "bg-gray-100 text-gray-800 hover:bg-gray-200",
  scheduled: "bg-blue-100 text-blue-800 hover:bg-blue-200",
  sending: "bg-amber-100 text-amber-800 hover:bg-amber-200",
  completed: "bg-green-100 text-green-800 hover:bg-green-200",
  cancelled: "bg-red-100 text-red-800 hover:bg-red-200",
  failed: "bg-destructive/20 text-destructive hover:bg-destructive/30",
  paused: "bg-gray-100 text-gray-800 hover:bg-gray-200",
  primary: "bg-primary/20 text-primary hover:bg-primary/30",
  secondary: "bg-secondary/20 text-secondary-foreground hover:bg-secondary/30",
  outline: "border border-border bg-transparent hover:bg-muted/50",
};

// Typography styles for consistent text styling
export const typography = {
  h1: "scroll-m-20 text-3xl font-semibold tracking-tight",
  h2: "scroll-m-20 text-2xl font-semibold tracking-tight",
  h3: "scroll-m-20 text-xl font-semibold tracking-tight",
  h4: "scroll-m-20 text-lg font-semibold tracking-tight",
  p: "leading-7 [&:not(:first-child)]:mt-6",
  lead: "text-xl text-muted-foreground",
  large: "text-lg font-semibold",
  small: "text-sm font-medium leading-none",
  subtle: "text-sm text-muted-foreground",
  muted: "text-sm text-muted-foreground",
};

// Spacing utilities for consistent layout
export const spacing = {
  section: "space-y-6",
  subsection: "space-y-4",
  card: "p-6",
  form: "space-y-4",
  formGroup: "space-y-2",
  stack: "flex flex-col gap-4",
  row: "flex flex-row items-center gap-4",
  grid: "grid grid-cols-1 md:grid-cols-2 gap-4",
  page: "container mx-auto py-6 space-y-8",
};

// Animation and transition utilities
export const transitions = {
  fadeIn: "animate-in fade-in duration-500",
  slideIn: "animate-in slide-in-from-bottom-4 duration-500",
  scaleIn: "animate-in zoom-in-95 duration-300",
  hover: "transition-all duration-200",
  pulse: "animate-pulse",
  spin: "animate-spin",
  bounce: "animate-bounce",
};

// Status-based styling (success, error, warning, info)
export const statusStyles = {
  success: {
    background: "bg-green-50",
    border: "border-green-200",
    text: "text-green-800",
    icon: "text-green-500",
  },
  error: {
    background: "bg-red-50",
    border: "border-red-200",
    text: "text-red-800",
    icon: "text-red-500",
  },
  warning: {
    background: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-800",
    icon: "text-amber-500",
  },
  info: {
    background: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-800",
    icon: "text-blue-500",
  },
};

// Layout utilities (grids, flexbox configurations)
export const layouts = {
  twoColumn: "grid grid-cols-1 md:grid-cols-2 gap-6",
  threeColumn: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4",
  fourColumn: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4",
  sidebar: "grid grid-cols-1 md:grid-cols-[250px_1fr] gap-6",
  wideSidebar: "grid grid-cols-1 md:grid-cols-[350px_1fr] gap-6",
  stackedForm: "flex flex-col gap-4",
  centeredContent: "flex items-center justify-center",
  flowContent: "flow-root",
};

// Responsive utilities
export const responsive = {
  hideOnMobile: "hidden md:block",
  hideOnDesktop: "md:hidden",
  mobileStack: "flex flex-col md:flex-row gap-4",
  mobileReverse: "flex flex-col-reverse md:flex-row gap-4",
  mobileFullWidth: "w-full md:w-auto",
  mobileCenter: "text-center md:text-left",
};

// Misc utilities (z-index layers, border radius, etc.)
export const miscUtils = {
  overlay: "fixed inset-0 bg-black/40 z-50",
  modal: "z-[60]",
  tooltip: "z-[70]",
  popover: "z-[40]",
  dropdown: "z-[30]",
};

// Data visualization
export const dataViz = {
  barChart: "h-4 rounded-full overflow-hidden bg-muted",
  progress: "h-2 rounded-full overflow-hidden bg-muted", 
  statsCard: "p-4 rounded-lg border border-border bg-card",
};

// Form field styling
export const formStyles = {
  label: "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
  input: "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
  select: "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
  checkbox: "h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary",
  radio: "h-4 w-4 border-gray-300 text-primary focus:ring-primary",
};

// Helper function to conditionally join classes
export const cx = (...classNames: (string | boolean | undefined | null)[]): string => {
  return classNames.filter(Boolean).join(" ");
}; 