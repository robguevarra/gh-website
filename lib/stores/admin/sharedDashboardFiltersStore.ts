import { create } from 'zustand';
import { startOfMonth, endOfDay } from 'date-fns';
import { DateRange } from 'react-day-picker';

// Define the state structure for the shared dashboard filters
interface SharedDashboardFiltersState {
  dateRange: DateRange | undefined;
  setDateRange: (dateRange: DateRange | undefined) => void;
}

// Get the start of the current month
const startOfCurrentMonth = startOfMonth(new Date());
// Get the end of the current day (as the default end date)
const today = endOfDay(new Date());

/**
 * Zustand store for managing shared filters across the admin dashboard sections.
 * Currently manages the date range filter.
 *
 * Initializes with the date range set to the current month (from the 1st to today).
 */
export const useSharedDashboardFiltersStore = create<SharedDashboardFiltersState>((set) => ({
  // Initialize dateRange with the current month
  dateRange: {
    from: startOfCurrentMonth,
    to: today,
  },
  // Action to update the date range state
  setDateRange: (newDateRange) => set({ dateRange: newDateRange }),
}));

// Optional: Export the type for convenience
export type { SharedDashboardFiltersState }; 