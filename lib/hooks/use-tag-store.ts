// lib/hooks/use-tag-store.ts
import { create } from 'zustand';
import type { Tag, TagType } from '@/lib/supabase/data-access/tags';

// Helper for deep equality check of simple objects (filters)
const filtersAreEqual = (obj1: any, obj2: any): boolean => {
  if (!obj1 || !obj2) return obj1 === obj2; // Handles null/undefined cases
  return JSON.stringify(obj1) === JSON.stringify(obj2);
};

interface TagStoreState {
  // Tag Types
  tagTypes: TagType[];
  isLoadingTagTypes: boolean;
  tagTypesError: string | null;
  lastFetchedTagTypesParams: Record<string, any> | null; // Using Record for simple empty object check

  // Tags
  tags: Tag[];
  isLoadingTags: boolean;
  tagsError: string | null;
  lastFetchedTagsParams: { typeId?: string; parentId?: string | null } | null;
  currentParentTag: Tag | null; // For hierarchical navigation
  breadcrumbs: Tag[]; // For hierarchical navigation

  // User Tag Assignments
  isAssigningUserTags: boolean;
  assignUserTagsError: string | null;
  isRemovingUserTags: boolean;
  removeUserTagsError: string | null;

  // Actions
  // Tag Types
  fetchTagTypes: () => Promise<void>;
  createTagType: (data: Pick<TagType, 'name' | 'description'>) => Promise<TagType | undefined>;
  updateTagType: (id: string, updates: Partial<Omit<TagType, 'id' | 'created_at' | 'updated_at'>>) => Promise<TagType | undefined>;
  deleteTagType: (id: string) => Promise<boolean>;

  // Tags
  fetchTags: (params?: { typeId?: string; parentId?: string | null }) => Promise<void>;
  createTag: (data: Pick<Tag, 'name' | 'parent_id' | 'type_id' | 'metadata'>) => Promise<Tag | undefined>;
  updateTag: (id: string, updates: Partial<Omit<Tag, 'id' | 'created_at' | 'updated_at'>>) => Promise<Tag | undefined>;
  deleteTag: (id: string) => Promise<boolean>;

  // Hierarchy Navigation
  navigateToTagChildren: (tag: Tag | null) => Promise<void>;

  // User Tags
  assignTagsToUsers: (payload: { tagIds: string[]; userIds: string[] }) => Promise<boolean>;
  removeTagsFromUsers: (payload: { tagIds: string[]; userIds: string[] }) => Promise<boolean>;
}

export const useTagStore = create<TagStoreState>((set, get) => ({
  // Initial State
  tagTypes: [],
  isLoadingTagTypes: false,
  tagTypesError: null,
  lastFetchedTagTypesParams: null,

  tags: [],
  isLoadingTags: false,
  tagsError: null,
  lastFetchedTagsParams: null,
  currentParentTag: null,
  breadcrumbs: [],

  isAssigningUserTags: false,
  assignUserTagsError: null,
  isRemovingUserTags: false,
  removeUserTagsError: null,

  // --- Actions --- 

  // Tag Types Actions
  fetchTagTypes: async () => {
    if (get().isLoadingTagTypes) return;
    // Simple cache check: if params were empty and data exists, assume it's current
    if (filtersAreEqual({}, get().lastFetchedTagTypesParams) && get().tagTypes.length > 0) {
      return;
    }
    set({ isLoadingTagTypes: true, tagTypesError: null });
    try {
      const response = await fetch('/api/tag-types');
      if (!response.ok) throw new Error(`Failed to fetch tag types: ${response.statusText}`);
      const { data } = await response.json();
      set({ tagTypes: data, isLoadingTagTypes: false, lastFetchedTagTypesParams: {} });
    } catch (e: any) {
      set({ tagTypesError: e.message, isLoadingTagTypes: false, lastFetchedTagTypesParams: null });
    }
  },

  createTagType: async (typeData) => {
    set({ isLoadingTagTypes: true, tagTypesError: null }); // Or a specific creating state
    try {
      const response = await fetch('/api/tag-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(typeData),
      });
      if (!response.ok) throw new Error(`Failed to create tag type: ${response.statusText}`);
      const { data } = await response.json();
      set(state => ({ 
        tagTypes: [...state.tagTypes, data],
        isLoadingTagTypes: false,
        lastFetchedTagTypesParams: null, // Invalidate cache
      }));
      return data;
    } catch (e: any) {
      set({ tagTypesError: e.message, isLoadingTagTypes: false });
      return undefined;
    }
  },

  updateTagType: async (id, updates) => {
    set({ isLoadingTagTypes: true, tagTypesError: null });
    try {
      const response = await fetch('/api/tag-types', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      });
      if (!response.ok) throw new Error(`Failed to update tag type: ${response.statusText}`);
      const { data } = await response.json();
      set(state => ({
        tagTypes: state.tagTypes.map(tt => tt.id === id ? data : tt),
        isLoadingTagTypes: false,
        lastFetchedTagTypesParams: null, // Invalidate cache
      }));
      return data;
    } catch (e: any) {
      set({ tagTypesError: e.message, isLoadingTagTypes: false });
      return undefined;
    }
  },

  deleteTagType: async (id) => {
    set({ isLoadingTagTypes: true, tagTypesError: null });
    try {
      const response = await fetch('/api/tag-types', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!response.ok) throw new Error(`Failed to delete tag type: ${response.statusText}`);
      set(state => ({
        tagTypes: state.tagTypes.filter(tt => tt.id !== id),
        isLoadingTagTypes: false,
        lastFetchedTagTypesParams: null, // Invalidate cache
      }));
      return true;
    } catch (e: any) {
      set({ tagTypesError: e.message, isLoadingTagTypes: false });
      return false;
    }
  },

  // Tags Actions
  fetchTags: async (params = {}) => {
    if (get().isLoadingTags) return;
    // Basic cache check: if no specific params and tags exist, don't refetch all.
    // Removed simple cache that returns early if filtersAreEqual and tags.length > 0, to ensure drill-down re-fetches if needed.
    // if (filtersAreEqual(params, get().lastFetchedTagsParams) && get().tags.length > 0 && !Object.keys(params).length ) {
    //    return;
    // } 
    // If fetching root tags (params.parentId is explicitly null or not provided and no typeId) or all tags (no params),
    // reset hierarchy context. This ensures that if TagForm fetches all tags, it doesn't mess up a drill-down state
    // *unless* the user is actively choosing to go to root via navigateToTagChildren(null).
    // The key is that params.parentId will be set by navigateToTagChildren.
    // If params.parentId is undefined (e.g. initial load or TagForm fetching all for dropdown), we don't reset if breadcrumbs exist.
    // This logic is tricky, navigateToTagChildren will be the primary way to set parentId for navigation.
    if (params.parentId === null && !params.typeId) { // Explicitly going to root via navigation
      set({ currentParentTag: null, breadcrumbs: [] });
    }

    set({ isLoadingTags: true, tagsError: null });
    const queryParams = new URLSearchParams();
    if (params.typeId) queryParams.set('typeId', params.typeId);
    if (params.parentId !== undefined) queryParams.set('parentId', params.parentId || ''); // API expects '' for null parentId root

    try {
      const response = await fetch(`/api/tags?${queryParams.toString()}`);
      if (!response.ok) throw new Error(`Failed to fetch tags: ${response.statusText}`);
      const { data } = await response.json();
      // If params are present, this fetch is for a specific subset.
      // How to merge this with existing `tags` state depends on UI needs.
      // Simplest for now: overwrite if params are general, or UI filters this list.
      // Or, if always fetching root tags + specific children, merge carefully.
      // Current: Overwrites or sets based on what was fetched.
      set({ tags: data, isLoadingTags: false, lastFetchedTagsParams: params }); 
    } catch (e: any) {
      set({ tagsError: e.message, isLoadingTags: false, lastFetchedTagsParams: null });
    }
  },

  navigateToTagChildren: async (tag: Tag | null) => {
    const { fetchTags } = get();
    if (tag === null) { // Navigate to root
      set({ currentParentTag: null, breadcrumbs: [] });
      await fetchTags({ parentId: null }); // typeId filter might still apply if set in UI
    } else {
      let newBreadcrumbs = [...get().breadcrumbs];
      const existingIndex = newBreadcrumbs.findIndex(bc => bc.id === tag.id);
      if (existingIndex !== -1) {
        newBreadcrumbs = newBreadcrumbs.slice(0, existingIndex + 1);
      } else {
        newBreadcrumbs.push(tag);
      }
      set({ currentParentTag: tag, breadcrumbs: newBreadcrumbs });
      await fetchTags({ parentId: tag.id }); // typeId filter might still apply
    }
  },

  createTag: async (tagData) => {
    set({ isLoadingTags: true, tagsError: null });
    try {
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tagData),
      });
      if (!response.ok) throw new Error(`Failed to create tag: ${response.statusText}`);
      const { data } = await response.json();
      set(state => ({
        tags: [...state.tags, data], // Add to existing, UI might need to re-filter/re-fetch for specific views
        isLoadingTags: false,
        lastFetchedTagsParams: null, // Invalidate general cache
      }));
      return data;
    } catch (e: any) {
      set({ tagsError: e.message, isLoadingTags: false });
      return undefined;
    }
  },

  updateTag: async (id, updates) => {
    set({ isLoadingTags: true, tagsError: null });
    try {
      const response = await fetch('/api/tags', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      });
      if (!response.ok) throw new Error(`Failed to update tag: ${response.statusText}`);
      const { data } = await response.json();
      set(state => ({
        tags: state.tags.map(t => t.id === id ? data : t),
        isLoadingTags: false,
        lastFetchedTagsParams: null, // Invalidate cache
      }));
      return data;
    } catch (e: any) {
      set({ tagsError: e.message, isLoadingTags: false });
      return undefined;
    }
  },

  deleteTag: async (id) => {
    set({ isLoadingTags: true, tagsError: null });
    try {
      const response = await fetch('/api/tags', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!response.ok) throw new Error(`Failed to delete tag: ${response.statusText}`);
      set(state => ({
        tags: state.tags.filter(t => t.id !== id),
        isLoadingTags: false,
        lastFetchedTagsParams: null, // Invalidate cache
      }));
      return true;
    } catch (e: any) {
      set({ tagsError: e.message, isLoadingTags: false });
      return false;
    }
  },

  // User Tags Actions
  assignTagsToUsers: async (payload) => {
    set({ isAssigningUserTags: true, assignUserTagsError: null });
    try {
      const response = await fetch('/api/user-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(`Failed to assign tags to users: ${response.statusText}`);
      // No direct state update here as it's a batch operation on a separate table.
      // UI components relying on user-specific tags might need to refetch or be notified.
      set({ isAssigningUserTags: false });
      return true;
    } catch (e: any) {
      set({ assignUserTagsError: e.message, isAssigningUserTags: false });
      return false;
    }
  },

  removeTagsFromUsers: async (payload) => {
    set({ isRemovingUserTags: true, removeUserTagsError: null });
    try {
      const response = await fetch('/api/user-tags', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(`Failed to remove tags from users: ${response.statusText}`);
      set({ isRemovingUserTags: false });
      return true;
    } catch (e: any) {
      set({ removeUserTagsError: e.message, isRemovingUserTags: false });
      return false;
    }
  },
}));

// Note on fetchTags caching: 
// The current caching for fetchTags is basic. If params are provided (for specific typeId or parentId),
// it currently overwrites the main 'tags' array. For UIs that need to display multiple filtered
// views simultaneously (e.g., a tree view showing children of multiple parents), a more sophisticated 
// caching strategy for 'tags' would be needed, perhaps storing them in a nested structure or a Map 
// keyed by filter parameters, and then providing selectors to get the relevant data. 
// For now, UIs displaying filtered tag lists will get the latest fetch, and general tag lists
// will be based on the last fetch with no params or the most recent specific fetch.
// Cache invalidation (lastFetchedTagsParams = null) happens on CUD operations to tags.
