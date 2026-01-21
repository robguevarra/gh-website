'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { DirectoryHeader } from './components/directory-header'
import { DirectoryTable } from './components/directory-table'
import { UserDrawer } from './components/user-drawer'
import { BulkTagDialog } from './components/bulk-tag-dialog'
import { Button } from '@/components/ui/button'
import { Tag as TagIcon, X } from 'lucide-react'
import { searchDirectory, getSmartLists, getAllTagsAction } from './actions'
import { useDebounce } from '@/lib/hooks/use-debounce'
import { DateRange } from "react-day-picker"

export default function DirectoryPage() {
    const [search, setSearch] = useState('')
    const [typeFilter, setTypeFilter] = useState<'all' | 'customer' | 'lead'>('all')
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [smartListFilter, setSmartListFilter] = useState<string>('all')
    const [tagFilter, setTagFilter] = useState<string>('all')
    const [dateRangeFilter, setDateRangeFilter] = useState<DateRange | undefined>(undefined)
    const [page, setPage] = useState(1)

    const debouncedSearch = useDebounce(search, 500)

    // Bulk Action State
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [bulkTagMode, setBulkTagMode] = useState<'add' | 'remove' | null>(null)

    const [selectedContact, setSelectedContact] = useState<{ id: string; type: 'customer' | 'lead' } | null>(null)

    // Fetch Smart Lists for the filter dropdown
    const { data: smartLists = [] } = useQuery({
        queryKey: ['smart-lists'],
        queryFn: () => getSmartLists()
    })

    // Fetch Tags for the filter dropdown
    const { data: tagData = { tags: [], types: [] } } = useQuery({
        queryKey: ['all-tags'],
        queryFn: () => getAllTagsAction()
    })
    const tags = tagData.tags

    // React Query for data fetching
    const { data, isLoading } = useQuery({
        queryKey: ['directory', debouncedSearch, typeFilter, statusFilter, smartListFilter, tagFilter, dateRangeFilter, page],
        queryFn: () => searchDirectory(
            debouncedSearch,
            {
                type: typeFilter,
                status: statusFilter,
                smartListId: smartListFilter,
                tagId: tagFilter,
                dateRange: dateRangeFilter
            },
            page,
            20
        ),
        placeholderData: (previousData) => previousData,
    })

    const handleSearchChange = (val: string) => {
        setSearch(val)
        setPage(1) // Reset page on search
        setSelectedIds([]) // Reset selection
    }

    const handleFilterChange = (setter: any) => (val: any) => {
        setter(val)
        setPage(1) // Reset page on filter change
        setSelectedIds([]) // Reset selection
    }

    return (
        <div className="space-y-6 p-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Directory</h1>
                <p className="text-muted-foreground">
                    Unified view of all customers and leads.
                </p>
            </div>

            <DirectoryHeader
                search={search}
                onSearchChange={handleSearchChange}
                typeFilter={typeFilter}
                onTypeFilterChange={handleFilterChange(setTypeFilter)}
                statusFilter={statusFilter}
                onStatusFilterChange={handleFilterChange(setStatusFilter)}
                smartLists={smartLists}
                smartListFilter={smartListFilter}
                onSmartListFilterChange={handleFilterChange(setSmartListFilter)}
                tags={tags}
                tagFilter={tagFilter}
                onTagFilterChange={handleFilterChange(setTagFilter)}
                dateRange={dateRangeFilter}
                onDateRangeChange={handleFilterChange(setDateRangeFilter)}
                totalCount={data?.metadata.total ?? 0}
            />

            {/* Bulk Action Bar */}
            {selectedIds.length > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-background border rounded-lg shadow-lg p-2 flex items-center gap-4 animate-in slide-in-from-bottom-5">
                    <span className="text-sm font-medium px-2">{selectedIds.length} selected</span>
                    <div className="h-4 w-px bg-border" />
                    <Button size="sm" variant="secondary" onClick={() => setBulkTagMode('add')}>
                        <TagIcon className="mr-2 h-3 w-3" />
                        Add Tags
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setBulkTagMode('remove')}>
                        Remove Tags
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setSelectedIds([])}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            )}

            <div className="rounded-md border bg-card">
                <DirectoryTable
                    data={data?.data ?? []}
                    isLoading={isLoading}
                    onRowClick={(id, type) => setSelectedContact({ id, type })}
                    selectedIds={selectedIds}
                    onSelectionChange={setSelectedIds}
                />
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between px-2">
                <div className="text-sm text-muted-foreground">
                    Page {page} of {data?.metadata.totalPages ?? 1}
                </div>
                <div className="flex items-center space-x-2">
                    <button
                        className="px-3 py-1 text-sm border rounded hover:bg-accent disabled:opacity-50"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1 || isLoading}
                    >
                        Previous
                    </button>
                    <button
                        className="px-3 py-1 text-sm border rounded hover:bg-accent disabled:opacity-50"
                        onClick={() => setPage(p => p + 1)}
                        disabled={page >= (data?.metadata.totalPages ?? 1) || isLoading}
                    >
                        Next
                    </button>
                </div>
            </div>

            <UserDrawer
                contactid={selectedContact?.id ?? null}
                type={selectedContact?.type ?? null}
                open={!!selectedContact}
                onOpenChange={(open) => !open && setSelectedContact(null)}
            />

            <BulkTagDialog
                open={bulkTagMode !== null}
                onOpenChange={(open) => !open && setBulkTagMode(null)}
                selectedUserIds={selectedIds}
                mode={bulkTagMode || 'add'}
            />
        </div>
    )
}
