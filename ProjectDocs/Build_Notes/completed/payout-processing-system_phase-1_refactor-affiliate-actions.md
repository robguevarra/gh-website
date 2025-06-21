# Payout Processing System - Phase 1: Refactor Affiliate Actions

## Task Objective
Refactor the monolithic `lib/actions/affiliate-actions.ts` file (currently 2,448 lines) into a modular, maintainable structure that separates concerns, improves code organization, and supports the ongoing payout processing system implementation. This refactoring will establish a scalable foundation for the remaining payout management features.

## Current State Assessment
The `lib/actions/affiliate-actions.ts` file has grown into an unmaintainable monolith containing:
- 30+ server actions handling all aspects of affiliate management
- Mixed concerns including affiliate CRUD operations, fraud management, analytics, payouts, and admin operations
- Duplicated patterns and inconsistent error handling
- Difficult navigation and testing due to file size
- All payout-related server actions mixed with unrelated affiliate functionality
- New payout processing functions (getEligiblePayouts, previewPayoutBatch, createPayoutBatch) added to an already bloated file

This structure is hindering development velocity and increasing the risk of bugs as we continue implementing the payout processing system.

## Future State Goal
A well-organized, modular server actions architecture with:
- Separate files for different domains (affiliates, payouts, fraud, analytics, etc.)
- Consistent patterns for error handling, caching, and validation
- Clear separation of concerns with focused, single-responsibility files
- Improved developer experience with easier navigation and testing
- A dedicated `payout-actions.ts` file containing all payout-related server actions
- Shared utilities and types extracted to common modules
- Maintained backward compatibility for existing imports

## Relevant Context

> **Important**: When working on this build note, always ensure proper context integration from:
> 1. Previously completed build notes (Phase 1 Core Implementation)
> 2. Handoff document from 2025-06-10
> 3. Project context (`ProjectContext.md`)
> 4. Design context (`designContext.md`)
>
> This ensures consistency and alignment with project goals and standards.

### From Previous Build Notes
From the `payout-processing-system_phase-1_core-implementation.md`:
- Database schema updates have been completed (2025-06-09)
- Core payout server actions have been implemented but are mixed with other affiliate actions
- The payout preview UI still needs to be implemented
- Xendit integration is pending

### From Handoff Document
From the `handoff_payout-processing-system_phase-1_typescript-errors-fixed_2025-06-10.md`:
- Several payout-related server actions were implemented in affiliate-actions.ts
- TypeScript errors have been fixed in the payout detail page
- Admin context improvement is needed (replacing hardcoded 'system' user ID)

### From Project Architecture
The project follows these patterns:
- Server actions in `lib/actions/` directory
- TypeScript types in `types/admin/` directory
- Modular service architecture in `lib/services/`
- Use of unstable_cache for data caching with proper tags

## Implementation Plan

### 1. Analyze and Document Current Structure
- [x] Map all server actions in affiliate-actions.ts
- [x] Identify logical groupings and dependencies
- [x] Document shared utilities and patterns
- [x] Create dependency graph for safe extraction

### 2. Create New File Structure
- [ ] Create the following new files:
  - `lib/actions/admin/affiliate-crud-actions.ts` - Basic affiliate CRUD operations
  - [x] `lib/actions/admin/payout-actions.ts` - All payout-related actions
  - `lib/actions/admin/fraud-actions.ts` - Fraud flag management
  - `lib/actions/admin/analytics-actions.ts` - Analytics and reporting
  - `lib/actions/admin/settings-actions.ts` - Program settings management
  - `lib/actions/admin/affiliate-utils.ts` - Shared utilities and helpers
- [ ] Establish consistent file naming convention
- [ ] Create proper TypeScript exports

### 3. Extract Payout-Related Actions
- [x] Move the following to `payout-actions.ts`:
  - `getAdminAffiliatePayouts`
  - `getAdminAffiliatePayoutById`
  - `getAdminAffiliatePayoutBatches`
  - `getAdminAffiliatePayoutBatchStats`
  - `processPayoutBatch`
  - `deletePayoutBatch`
  - `getEligiblePayouts`
  - `previewPayoutBatch`
  - `createPayoutBatch`
- [x] Extract payout-specific types and interfaces
- [ ] Update imports in consuming components
- [x] Add proper JSDoc documentation

### 4. Extract Fraud Management Actions
- [x] Move the following to `fraud-actions.ts`:
  - `getAllAdminFraudFlags`
  - `getFraudFlagsForAffiliate`
  - `getAffiliateFraudFlagsById`
  - `resolveFraudFlag`
  - `createFraudFlag`
- [x] Update fraud notification imports
- [x] Maintain caching patterns

### 5. Extract Analytics Actions
- [x] Move the following to `analytics-actions.ts`:
  - `getAffiliateProgramAnalytics`
  - Related interfaces and types
- [x] Preserve caching implementation
- [x] Update dashboard component imports

### 6. Extract Settings Management
- [ ] Move the following to `settings-actions.ts`:
  - `getAffiliateProgramSettings`
  - `updateAffiliateProgramSettings`
  - Related interfaces
- [ ] Maintain default settings fallback

### 7. Create Shared Utilities Module
- [ ] Extract common patterns:
  - Cache key generation
  - Error handling utilities
  - Common validation patterns
  - Shared type guards
- [ ] Create consistent error response format
- [ ] Establish logging patterns

### 8. Update Import Paths
- [ ] Create barrel exports in affiliate-actions.ts for backward compatibility
- [ ] Update all component imports to use new paths
- [ ] Verify no broken imports with TypeScript compiler
- [ ] Update any dynamic imports

### 9. Add Comprehensive Testing
- [ ] Create unit tests for extracted modules
- [ ] Test error handling scenarios
- [ ] Verify caching behavior
- [ ] Test admin activity logging

### 10. Documentation and Migration
- [ ] Document the new file structure
- [ ] Create migration guide for other developers
- [ ] Update TypeScript path mappings if needed
- [ ] Add file headers with clear descriptions

## Technical Considerations

### Backward Compatibility
- Maintain exports from original affiliate-actions.ts during transition
- Use re-exports to prevent breaking changes
- Gradual migration approach for consuming components

### Performance Optimization
- Preserve existing caching strategies with unstable_cache
- Maintain cache tags for proper invalidation
- Consider lazy imports for rarely used actions

### Type Safety
- Extract shared types to dedicated type files
- Use strict TypeScript settings for new files
- Implement proper type guards for runtime validation

### Error Handling
- Establish consistent error response format
- Implement proper error logging
- Create custom error classes for different scenarios

### Code Organization Principles
- Single Responsibility: Each file handles one domain
- DRY: Extract repeated patterns to utilities
- Clear Naming: Actions should clearly indicate their purpose
- Consistent Patterns: Similar operations should follow similar patterns

## Completion Status

This refactoring is currently in progress. The following has been accomplished:
- **Payout Actions Extracted**: All server actions related to payouts have been successfully moved from the monolithic `affiliate-actions.ts` into a new, dedicated `lib/actions/admin/payout-actions.ts` file.
- **Backward Compatibility Ensured**: A re-export (barrel export) was added to the original `affiliate-actions.ts` file to ensure that no existing components that import these functions will break.
- **TypeScript Errors Resolved**: All related type definitions were cleaned up, and a bug in the `getAdminAffiliatePayoutById` query was fixed, ensuring the refactored code is type-safe.
- **Fraud Actions Extracted**: All server actions related to fraud management have been successfully moved from `affiliate-actions.ts` into a new, dedicated `lib/actions/admin/fraud-actions.ts` file, with backward compatibility maintained.
- **Analytics Actions Extracted**: The `getAffiliateProgramAnalytics` function and its related types were successfully moved to `lib/actions/admin/analytics-actions.ts` and `types/admin/analytics.ts` respectively. Backward compatibility has been maintained.

Next immediate steps:
- Continue the refactoring by extracting the next logical domain: Settings management actions.
- Create the new file structure incrementally.
- Test each extraction thoroughly.

## Next Steps After Completion
After completing this refactoring:
1. Continue with the payout preview UI implementation using the newly organized payout-actions.ts
2. Implement remaining payout management features with cleaner code organization
3. Proceed with Xendit integration in the dedicated payout actions file
4. Apply similar refactoring patterns to other large files in the codebase

---

> **Note to AI Developers**: When working with this project, always ensure that you:
> 1. Review previously completed build notes for context and established patterns
> 2. Consult the implementation strategy and architecture planning documents
> 3. Align your work with the project context and design context guidelines
> 4. Follow the established folder structure, naming conventions, and coding standards
> 5. Include this reminder in all future build notes to maintain consistency 