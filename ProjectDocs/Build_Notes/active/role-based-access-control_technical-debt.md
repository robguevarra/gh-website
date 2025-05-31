# Technical Debt: Role-Based Access Control (RBAC) System

## Task Objective

Implement a comprehensive Role-Based Access Control (RBAC) system to manage fine-grained permissions across different user types in the application. This would extend beyond the current boolean flags (`is_student`, `is_affiliate`, `is_admin`) to provide granular access control at the feature and action level.

## Current State Assessment

- **Role Identification**: Currently using boolean flags in `unified_profiles` table (`is_student`, `is_affiliate`, `is_admin`) for basic role identification
- **Navigation**: Multi-role dashboard switcher implemented for UI navigation between different portals
- **Access Control**: Basic middleware protection for portal routes based on role flags
- **Existing Schema**: Unused `roles` and `user_roles` tables exist in the database but are not currently utilized
- **Permissions**: No granular permission system exists; access is only controlled at the portal/dashboard level

## Future State Goal

A robust RBAC system that provides:
- Fine-grained permission control based on roles, resources, and actions
- Role hierarchy with permission inheritance
- Administrative interface for role and permission management
- Efficient permission checking at both server and client levels
- Row Level Security in the database where appropriate

## Technical Debt Implications

### Current Workarounds

- Using boolean role flags for basic portal-level access control
- Implementing one-off permission checks in specific features rather than a systematic approach
- Relying on server-side middleware for most access control rather than a unified solution

### Risks of Deferral

- **Scalability Issues**: As the application grows, managing permissions through the current approach will become unwieldy
- **Security Gaps**: Potential for inconsistent permission enforcement across features
- **Technical Entropy**: More one-off solutions will accumulate, making a future RBAC implementation more complex
- **Product Limitation**: May limit the ability to offer tiered access or feature-specific permissions

### Mitigation Strategy

While deferring the full RBAC implementation, we will:

1. **Document Permission Requirements**: Maintain a list of permissions needed for each feature
2. **Consistent Pattern**: Use a consistent pattern for role checks that can later be refactored
3. **Avoid Schema Changes**: Minimize changes to `roles` and `user_roles` tables to preserve options for future implementation
4. **Extract Permission Logic**: Where possible, isolate permission logic into utility functions for easier future refactoring

## Implementation Timeline Recommendation

- **Low Priority**: If the application remains simple with few roles and basic permission needs
- **Medium Priority**: If planning to add complex permission scenarios within the next 3-6 months
- **High Priority**: If security audits, compliance requirements, or product roadmap demand fine-grained access control

## References

- Current middleware implementation: `/middleware.ts`
- Current role flag schema: `unified_profiles` table
- Unused schema: `roles` and `user_roles` tables
- Related implementation: Dashboard switcher component at `/components/navigation/dashboard-switcher.tsx`

---

> **Note to Developers**: This technical debt document serves as a placeholder for a full RBAC implementation. When implementing features that require permission checks, refer to this document and follow the mitigation strategy to minimize future refactoring efforts.
