'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { DirectoryHeader } from './components/directory-header'
import { DirectoryTable } from './components/directory-table'
import { UserDrawer } from './components/user-drawer'
import { searchDirectory } from './actions'
import { useDebounce } from '@/lib/hooks/use-debounce' // Assuming this exists, otherwise will implement simple debounce

export default function DirectoryPage() {
    const [search, setSearch] = useState('')
    const [typeFilter, setTypeFilter] = useState<'all' | 'customer' | 'lead'>('all')
    const [page, setPage] = useState(1)

    const debouncedSearch = useDebounce(search, 500)

    const [selectedContact, setSelectedContact] = useState<{ id: string; type: 'customer' | 'lead' } | null>(null)

    // React Query for data fetching
    const { data, isLoading, isError } = useQuery({
        queryKey: ['directory', debouncedSearch, typeFilter, page],
        queryFn: () => searchDirectory(debouncedSearch, { type: typeFilter }, page, 20),
        placeholderData: (previousData) => previousData, // Keep previous data while fetching new
    })

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
                onSearchChange={setSearch}
                typeFilter={typeFilter}
                onTypeFilterChange={setTypeFilter}
                totalCount={data?.metadata.total ?? 0}
            />

            <div className="rounded-md border bg-card">
                <DirectoryTable
                    data={data?.data ?? []}
                    isLoading={isLoading}
                    onRowClick={(id, type) => setSelectedContact({ id, type })}
                />
            </div>

            {/* Footer / Pagination Controls would go here */}
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
        </div>
    )
}
