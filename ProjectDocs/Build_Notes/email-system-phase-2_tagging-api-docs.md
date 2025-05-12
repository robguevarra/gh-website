f# Tagging & Segmentation API and Data Layer Documentation

_Last updated: 2025-05-12_

## Overview
This document describes the API endpoints and data-access layer for the user tagging and segmentation system. It is designed for scalability (3k+ users), batch operations, and strong typing in a Next.js + Supabase environment.

---

## Data Model
- **tag_types**: Groups or categories for tags (e.g., Behavioral, Demographic)
- **tags**: Hierarchical tags with optional parent, group/type, and metadata (JSONB)
- **user_tags**: Join table for assigning tags to users (supports batch ops)
- **user_segments**: Saved user segments with rules for targeting (name, description, rules as JSONB)

---

## Data-Access Layer (`lib/supabase/data-access/tags.ts`)

### Tag Types
- `getTagTypes(): Promise<TagType[]>`
- `createTagType(type: { name, description }): Promise<TagType>`
- `updateTagType(id, updates): Promise<TagType>`
- `deleteTagType(id): Promise<void>`

### Tags
- `getTags({ typeId?, parentId? }): Promise<Tag[]>`
- `createTag({ name, parent_id?, type_id?, metadata? }): Promise<Tag>`
- `updateTag(id, updates): Promise<Tag>`
- `deleteTag(id): Promise<void>`

### User Tags (Batch-Friendly)
- `getTagsForUser(userId): Promise<Tag[]>`
- `getUsersForTag(tagId, limit = 1000, offset = 0): Promise<string[]>`
- `assignTagsToUsers({ tagIds, userIds }): Promise<void>`
- `removeTagsFromUsers({ tagIds, userIds }): Promise<void>`

**Scalability:**
- All batch ops use upsert/delete with PK de-dupe
- Large queries use pagination (limit/offset)
- Segment preview should use count queries, not full fetch

---

## API Endpoints

### Tag Types (`/api/tag-types`)
- `GET`: List all tag types
- `POST`: Create a new tag type (`{ name, description }`)
- `PATCH`: Update a tag type (`{ id, ...updates }`)
- `DELETE`: Delete a tag type (`{ id }`)

### Tags (`/api/tags`)
- `GET`: List tags, filterable by `typeId` or `parentId`. Each tag object now includes a `user_count` field, representing the number of users associated with that tag. Also embeds `tag_type: {id, name}` if available.
- `POST`: Create a new tag (`{ name, parent_id?, type_id?, metadata? }`)
- `PATCH`: Update a tag (`{ id, ...updates }`)
- `DELETE`: Delete a tag (`{ id }`)

### User Tags (`/api/user-tags`)
- `GET`: 
  - `/api/user-tags?userId=...` → tags for a user
  - `/api/user-tags?tagId=...&limit=...&offset=...` → user IDs for a tag (paginated)
- `POST`: Assign tags to users in batch (`{ tagIds: string[], userIds: string[] }`)
- `DELETE`: Remove tags from users in batch (`{ tagIds: string[], userIds: string[] }`)

### User Segments (`/api/admin/segments`)
- `GET`: List all saved segments
- `POST`: Create a new segment (`{ name, description, rules }`)
- `GET /api/admin/segments/[segmentId]`: Get a specific segment
- `PATCH /api/admin/segments/[segmentId]`: Update a segment (`{ name?, description?, rules? }`)
- `DELETE /api/admin/segments/[segmentId]`: Delete a segment
- `GET /api/admin/segments/[segmentId]/preview`: Get a preview of users matching segment rules (count and sample of users)

---

## Usage & Best Practices
- Always use batch endpoints for large assignments/removals
- For segment previews, use the `getUsersForTag` endpoint with pagination and aggregate counts
- Use the data-access layer for all server-side logic to ensure DRY, maintainable code
- All endpoints return JSON `{ data }` or `{ success: true }` on success, `{ error }` on failure

---

## Example Payloads

### Create Tag Type
```json
POST /api/tag-types
{
  "name": "Lifecycle",
  "description": "User lifecycle stage tags"
}
```

### Assign Tags to Users (Batch)
```json
POST /api/user-tags
{
  "tagIds": ["tag-uuid-1", "tag-uuid-2"],
  "userIds": ["user-uuid-1", "user-uuid-2", ...]
}
```

### Create User Segment
```json
POST /api/admin/segments
{
  "name": "Active Subscribers",
  "description": "Users who are subscribed and have been active in the last 30 days",
  "rules": {
    "operator": "AND",
    "conditions": [
      {
        "type": "tag",
        "tagId": "subscription-active"
      },
      {
        "type": "tag",
        "tagId": "active-last-30-days"
      }
    ]
  }
}
```

---

## Notes
- All endpoints are scalable for 3k+ users
- Designed for functional, strongly-typed, and DRY Next.js codebase
- The `user_count` on tags is fetched via a subquery/join in the data access layer and might affect performance on very large datasets if not optimized. Direct aggregation via Supabase's `count` on related tables is used.
- Extendable for future GraphQL or advanced segment builder UI
