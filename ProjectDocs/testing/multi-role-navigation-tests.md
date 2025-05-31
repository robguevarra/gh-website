# Multi-Role Navigation Testing

## Test Cases for Dashboard Switcher Integration

### 1. User Interface Tests

- [ ] **DashboardSwitcher Presence**: Verify the DashboardSwitcher component appears in all three portal headers (Student, Affiliate, Admin) for users with multiple roles
- [ ] **UI Consistency**: Confirm the component maintains consistent styling and placement across all portals
- [ ] **Accessibility**: Test keyboard navigation and screen reader compatibility for the dashboard switcher
- [ ] **Mobile Responsiveness**: Verify the component displays and functions correctly on mobile devices

### 2. Role-Based Navigation Tests

- [ ] **Student-only User**: Confirm a user with only student role does not see the dashboard switcher
- [ ] **Affiliate-only User**: Confirm a user with only affiliate role does not see the dashboard switcher
- [ ] **Admin-only User**: Confirm a user with only admin role does not see the dashboard switcher
- [ ] **Multi-role User (Student + Affiliate)**: Verify switching between Student and Affiliate portals works correctly
- [ ] **Multi-role User (Student + Admin)**: Verify switching between Student and Admin portals works correctly
- [ ] **Multi-role User (Affiliate + Admin)**: Verify switching between Affiliate and Admin portals works correctly
- [ ] **All Roles User**: Verify switching between all three portals works correctly

### 3. API and Data Flow Tests

- [ ] **Context API Response**: Verify `/api/user/context` returns correct role flags for various user types
- [ ] **State Management**: Confirm the Zustand store correctly updates with user context data
- [ ] **Data Refresh**: Test that user context data refreshes appropriately after session timeout

### 4. Security and Edge Cases

- [ ] **Unauthorized Access**: Verify users cannot access portals they don't have permission for
- [ ] **Role Revocation**: Test behavior when a user's role is revoked while they're using that portal
- [ ] **Session Expiration**: Verify proper handling of expired sessions during role switching
- [ ] **Network Error**: Test graceful handling of network errors during context fetching

## Testing Procedure

1. Create test users with various role combinations in the `unified_profiles` table
2. Log in as each test user and verify the appropriate UI elements and navigation options
3. Manually test edge cases such as role revocation by updating the database during an active session
4. Document any issues found during testing

## Expected Results

- The DashboardSwitcher component should only be visible to users with multiple roles
- Navigation between portals should be seamless and maintain user context
- The UI should be consistent across all portals
- Security measures should prevent unauthorized access to restricted areas
- Error handling should provide meaningful feedback to users when issues occur
