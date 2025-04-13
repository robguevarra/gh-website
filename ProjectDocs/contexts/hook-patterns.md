# Hook Patterns and Standards

This document defines the standard patterns and best practices for React hooks in the Graceful Homeschooling platform.

## Table of Contents

1. [Hook Types and Naming Conventions](#hook-types-and-naming-conventions)
2. [State Access Hooks](#state-access-hooks)
3. [Data Fetching Hooks](#data-fetching-hooks)
4. [UI State Hooks](#ui-state-hooks)
5. [Utility Hooks](#utility-hooks)
6. [Performance Optimization](#performance-optimization)
7. [Testing Hooks](#testing-hooks)

## Hook Types and Naming Conventions

We use the following hook types with specific naming conventions:

| Hook Type | Naming Convention | Example | Purpose |
|-----------|-------------------|---------|---------|
| State Access | `use[Entity]` | `useUserProfile` | Access and manipulate state from a store |
| Data Fetching | `useFetch[Entity]` | `useFetchUserProfile` | Fetch data from an API or database |
| Combined | `use[Entity]WithData` | `useUserProfileWithData` | Access state and fetch related data |
| UI State | `use[Feature]UI` | `useDashboardUI` | Manage component-specific UI state |
| Utility | `use[Utility]` | `useDebounce` | Provide utility functionality |

## State Access Hooks

State access hooks provide a clean interface to access and manipulate state from a store (e.g., Zustand).

### Implementation Pattern

```typescript
// Define selectors outside the hook
const userIdSelector = (state: StudentDashboardState) => state.userId;
const userProfileSelector = (state: StudentDashboardState) => state.userProfile;
const isLoadingProfileSelector = (state: StudentDashboardState) => state.isLoadingProfile;

// Define action selectors if needed
const setUserIdSelector = (state: StudentDashboardState) => state.setUserId;
const setUserProfileSelector = (state: StudentDashboardState) => state.setUserProfile;

/**
 * Hook for accessing user profile state
 */
export const useUserProfile = () => {
  // Use individual selectors for each piece of state
  const userId = useStudentDashboardStore(userIdSelector);
  const userProfile = useStudentDashboardStore(userProfileSelector);
  const isLoadingProfile = useStudentDashboardStore(isLoadingProfileSelector);
  
  // Get actions from the store
  const setUserId = useStudentDashboardStore(setUserIdSelector);
  const setUserProfile = useStudentDashboardStore(setUserProfileSelector);
  
  // Memoize action functions if they need to be passed to child components
  const memoizedSetUserId = useCallback((id: string) => {
    setUserId(id);
  }, [setUserId]);
  
  // Use useMemo to return a stable object reference
  return useMemo(() => ({
    userId,
    userProfile,
    isLoadingProfile,
    setUserId: memoizedSetUserId,
    setUserProfile
  }), [userId, userProfile, isLoadingProfile, memoizedSetUserId, setUserProfile]);
};
```

### Best Practices

1. **Individual Selectors**: Use individual selectors for each piece of state
2. **Stable References**: Define selector functions outside the hook
3. **Memoized Return**: Use `useMemo` to return a stable object reference
4. **Memoized Actions**: Use `useCallback` for action functions that will be passed to child components
5. **Complete Dependency Arrays**: Ensure all dependencies are included in the dependency arrays

## Data Fetching Hooks

Data fetching hooks handle API calls and data loading, often using SWR or React Query.

### Implementation Pattern

```typescript
/**
 * Hook for fetching user profile data
 */
export const useFetchUserProfile = (userId?: string) => {
  const supabase = getBrowserClient();
  const { setUserProfile, setIsLoadingProfile } = useUserProfile();
  
  // Use SWR for data fetching
  const { data, error, isLoading, mutate } = useSWR(
    userId ? `/api/profiles/${userId}` : null,
    async () => {
      setIsLoadingProfile(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
          
        if (error) throw error;
        
        // Update the store with the fetched data
        setUserProfile(data);
        return data;
      } catch (err) {
        console.error('Error fetching profile:', err);
        throw err;
      } finally {
        setIsLoadingProfile(false);
      }
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000 // 1 minute
    }
  );
  
  return {
    data,
    error,
    isLoading,
    mutate
  };
};
```

### Best Practices

1. **Conditional Fetching**: Only fetch when necessary (e.g., when userId is available)
2. **Loading States**: Properly manage loading states
3. **Error Handling**: Implement comprehensive error handling
4. **Store Integration**: Update the store with fetched data
5. **Revalidation Control**: Configure appropriate revalidation settings

## UI State Hooks

UI state hooks manage component-specific state that doesn't need to be shared globally.

### Implementation Pattern

```typescript
/**
 * Hook for managing dashboard UI state
 */
export const useDashboardUI = () => {
  // Local state for UI elements
  const [activeTab, setActiveTab] = useState('courses');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  // Memoize handlers
  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
  }, []);
  
  const toggleFilter = useCallback(() => {
    setIsFilterOpen(prev => !prev);
  }, []);
  
  // Return memoized object
  return useMemo(() => ({
    activeTab,
    isFilterOpen,
    handleTabChange,
    toggleFilter
  }), [activeTab, isFilterOpen, handleTabChange, toggleFilter]);
};
```

### Best Practices

1. **Component Scope**: Keep UI state local to components when possible
2. **Memoized Handlers**: Use `useCallback` for event handlers
3. **Stable References**: Use `useMemo` for the return object
4. **Clear Naming**: Use clear, descriptive names for state and handlers

## Utility Hooks

Utility hooks provide reusable functionality across components.

### Implementation Pattern

```typescript
/**
 * Hook for debouncing values
 */
export const useDebounce = <T>(value: T, delay: number = 500): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);
  
  return debouncedValue;
};
```

### Best Practices

1. **Generic Types**: Use TypeScript generics for flexibility
2. **Default Parameters**: Provide sensible defaults
3. **Cleanup Functions**: Implement proper cleanup in useEffect
4. **Single Responsibility**: Each utility hook should do one thing well

## Performance Optimization

To ensure optimal performance with hooks:

1. **Memoization**: Use `useMemo` and `useCallback` appropriately
2. **Selective Rendering**: Use individual selectors to prevent unnecessary re-renders
3. **Stable References**: Avoid creating new objects or functions in render
4. **Batched Updates**: Batch related state updates
5. **Debouncing**: Debounce rapidly changing values
6. **Effect Dependencies**: Carefully manage useEffect dependencies

### Example: Optimized Component with Hooks

```tsx
const CourseCard = memo(function CourseCard({ courseId }: CourseCardProps) {
  // Use optimized hooks
  const { userId } = useUserProfile();
  const { enrollments } = useEnrollments();
  
  // Compute derived state with useMemo
  const isEnrolled = useMemo(() => {
    return enrollments.some(e => e.courseId === courseId);
  }, [enrollments, courseId]);
  
  // Memoize event handlers
  const handleEnroll = useCallback(() => {
    enrollInCourse(userId, courseId);
  }, [userId, courseId]);
  
  return (
    <Card>
      <CardHeader>{/* ... */}</CardHeader>
      <CardContent>{/* ... */}</CardContent>
      <CardFooter>
        {!isEnrolled && (
          <Button onClick={handleEnroll}>Enroll</Button>
        )}
      </CardFooter>
    </Card>
  );
});
```

## Testing Hooks

Hooks should be tested using React Testing Library and/or Jest.

### Example: Testing a State Access Hook

```tsx
describe('useUserProfile', () => {
  it('should return user profile state', () => {
    const { result } = renderHook(() => useUserProfile());
    
    expect(result.current.userId).toBeDefined();
    expect(result.current.userProfile).toBeDefined();
    expect(result.current.isLoadingProfile).toBeDefined();
  });
  
  it('should update user ID when setUserId is called', () => {
    const { result } = renderHook(() => useUserProfile());
    
    act(() => {
      result.current.setUserId('test-id');
    });
    
    expect(result.current.userId).toBe('test-id');
  });
});
```

### Best Practices for Testing Hooks

1. **Isolation**: Test hooks in isolation using renderHook
2. **State Changes**: Use act() for state changes
3. **Mock Dependencies**: Mock external dependencies
4. **Test Edge Cases**: Test loading, error, and empty states
5. **Integration Tests**: Also test hooks in the context of components

---

This document will be updated as new patterns and best practices emerge. Always refer to the latest version when implementing new hooks.
