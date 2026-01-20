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
  accent: "border border-secondary/20 bg-secondary/5 shadow-sm hover:shadow-md transition-shadow duration-200",
  glowing: "border border-primary/30 bg-primary/5 shadow-[0_0_15px_rgba(var(--primary)/0.15)] hover:shadow-[0_0_20px_rgba(var(--primary)/0.25)]",
  modal: "bg-background p-6 rounded-lg shadow-lg border border-border",
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
  // Icon buttons (toolbar actions)
  icon: "h-9 w-9 p-0 flex items-center justify-center rounded-md",
  // Toggle buttons (on/off, active/inactive)
  toggle: "border-2 data-[state=on]:bg-primary/10 data-[state=on]:border-primary data-[state=on]:text-primary",
  // Action buttons with icon and text
  withIcon: "inline-flex items-center gap-2",
  // Button with subtle hover effect
  subtle: "bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors duration-200",
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

// Typography system for consistent text styling
export const typography = {
  h1: "scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl",
  h2: "scroll-m-20 text-3xl font-semibold tracking-tight first:mt-0",
  h3: "scroll-m-20 text-2xl font-semibold tracking-tight",
  h4: "scroll-m-20 text-xl font-semibold tracking-tight",
  p: "leading-7 [&:not(:first-child)]:mt-6",
  subtle: "text-sm text-muted-foreground",
  lead: "text-xl text-muted-foreground",
  large: "text-lg font-semibold",
  small: "text-sm font-medium leading-none",
  muted: "text-sm text-muted-foreground",
  code: "relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold",
  emphasis: "font-medium text-foreground",
  success: "text-green-600",
  error: "text-destructive",
  warning: "text-amber-600",
  info: "text-blue-600",
};

// Input element styling
export const inputStyles = {
  default: "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
  withIcon: "pl-9", // Used with an icon positioned at left
  search: "pl-9 pr-4", // Search input with magnifying glass icon
  textarea: "min-h-[80px] flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
  fileInput: "cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90",
  labelAdd: "text-sm font-medium", // Renamed from label for clarity, can be used for general labels
};

// Form-specific styling, including labels
export const formStyles = {
  label: "text-sm font-medium text-foreground", // Standard form label style
  input: inputStyles.default, // Re-export for convenience or use inputStyles.default directly
  inputError: "border-destructive focus-visible:ring-destructive",
  errorMessage: "text-xs text-destructive mt-1",
  formGroup: "space-y-1.5", // Adjusted spacing for form groups
  fieldSet: "space-y-3 p-4 border border-border rounded-md",
  legend: "text-base font-medium text-foreground px-1",
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
  tight: "gap-2",
  normal: "gap-4",
  loose: "gap-6",
  indent: "ml-4",
  verticalRhythm: "my-2",
  gutters: "px-4 md:px-6",
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
  slideInLeft: "animate-in slide-in-from-left-4 duration-500",
  slideInRight: "animate-in slide-in-from-right-4 duration-500",
  slideInTop: "animate-in slide-in-from-top-4 duration-500",
  slideInBottom: "animate-in slide-in-from-bottom-4 duration-500",
  scaleUp: "animate-in zoom-in-95 duration-300",
  scaleDown: "animate-out zoom-out-95 duration-300",
  delayShort: "delay-150",
  delayMedium: "delay-300",
  delayLong: "delay-500",
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
  neutral: {
    background: "bg-muted",
    border: "border-border",
    text: "text-muted-foreground",
    icon: "text-muted-foreground",
  },
  highlight: {
    background: "bg-primary/5",
    border: "border-primary/20",
    text: "text-primary",
    icon: "text-primary",
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
  stickyHeader: "sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b",
  responsiveGrid: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4",
  nestedLayout: "grid grid-cols-1 gap-4 md:grid-cols-[2fr_1fr]",
  masonry: "columns-1 sm:columns-2 xl:columns-3 gap-4 space-y-4",
};

// Responsive utilities
export const responsive = {
  hideOnMobile: "hidden md:block",
  hideOnDesktop: "md:hidden",
  mobileStack: "flex flex-col md:flex-row gap-4",
  mobileReverse: "flex flex-col-reverse md:flex-row gap-4",
  mobileFullWidth: "w-full md:w-auto",
  mobileCenter: "text-center md:text-left",
  adaptiveFont: "text-sm md:text-base",
  adaptiveSpacing: "p-3 md:p-6",
  adaptiveLayout: "space-y-3 md:space-y-6",
  stackedToInline: "flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4",
  inlineToStacked: "flex flex-row md:flex-col items-center md:items-start gap-4 md:gap-2",
  conditionalWrap: "flex flex-wrap md:flex-nowrap",
};

// Misc utilities (z-index layers, border radius, etc.)
export const miscUtils = {
  overlay: "fixed inset-0 bg-black/40 z-50",
  modal: "z-[60]",
  tooltip: "z-[70]",
  popover: "z-[40]",
  dropdown: "z-[30]",
  overlayBlur: "backdrop-blur-sm",
  elevate: "relative z-10",
  hidden: "hidden",
  screenReaderOnly: "sr-only",
  truncate: "truncate",
  noWrap: "whitespace-nowrap",
  break: "break-words",
  divider: "h-px w-full bg-border my-4",
  separator: "h-4 w-px bg-border mx-2",
};

// Data visualization
export const dataViz = {
  barChart: "h-4 rounded-full overflow-hidden bg-muted",
  progress: "h-2 rounded-full overflow-hidden bg-muted", 
  statsCard: "p-4 rounded-lg border border-border bg-card",
  progressBar: "h-2 bg-primary rounded-full transition-all duration-500 ease-out",
  progressBarLarge: "h-4 bg-primary rounded-full transition-all duration-500 ease-out",
  progressTrack: "h-2 w-full bg-muted rounded-full overflow-hidden",
  progressTrackLarge: "h-4 w-full bg-muted rounded-full overflow-hidden",
  segmentBlock: "inline-block h-3 w-3 rounded-[2px] mx-0.5",
  percentageText: "text-xs font-medium text-muted-foreground",
  pieChart: "w-24 h-24 rounded-full overflow-hidden relative",
  gaugeChart: "w-24 h-12 rounded-t-full overflow-hidden relative border-2 border-border",
  metricChange: {
    up: "text-green-600 flex items-center gap-1",
    down: "text-red-600 flex items-center gap-1",
    neutral: "text-muted-foreground flex items-center gap-1",
  },
  tooltip: "absolute -translate-x-1/2 -translate-y-full p-2 rounded bg-popover text-popover-foreground text-xs shadow-md animate-in fade-in",
};

// Accessibility helpers
export const a11y = {
  focusRing: "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  screenReaderOnly: "sr-only",
  focusWithin: "focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2",
  keyboardOnly: "focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
  interactiveArea: "min-h-[44px] min-w-[44px]", // Minimum touch target size
  contrastText: "text-foreground bg-background",
  highContrast: "text-foreground",
  reducedMotion: "motion-reduce:transform-none motion-reduce:animate-none motion-reduce:transition-none",
};

// Device mockups for different viewport sizes
export const deviceMockups = {
  mobile: "max-w-[375px] h-[667px] mx-auto border-8 rounded-[36px] border-foreground/10 shadow-lg overflow-hidden",
  tablet: "max-w-[768px] h-[1024px] mx-auto border-8 rounded-[36px] border-foreground/10 shadow-lg overflow-hidden",
  desktop: "max-w-full border-t-8 rounded-t-lg border-foreground/10 shadow-lg overflow-hidden",
  deviceFrame: "w-full h-full bg-background overflow-y-auto",
  deviceBar: "h-6 bg-muted/20 flex items-center justify-center",
};

// Helper function to conditionally join classes
export const cx = (...classNames: (string | boolean | undefined | null)[]): string => {
  return classNames.filter(Boolean).join(" ");
}; 