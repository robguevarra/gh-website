import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface DirectoryHeaderProps {
    search: string
    onSearchChange: (value: string) => void
    typeFilter: 'all' | 'customer' | 'lead'
    onTypeFilterChange: (value: 'all' | 'customer' | 'lead') => void
    totalCount: number
}

export function DirectoryHeader({
    search,
    onSearchChange,
    typeFilter,
    onTypeFilterChange,
    totalCount
}: DirectoryHeaderProps) {
    return (
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2">
                <Input
                    placeholder="Search name or email..."
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="h-9 w-[250px] lg:w-[350px]"
                />
                <Select
                    value={typeFilter}
                    onValueChange={(val: any) => onTypeFilterChange(val)}
                >
                    <SelectTrigger className="h-9 w-[150px]">
                        <SelectValue placeholder="Filter by Type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Contacts</SelectItem>
                        <SelectItem value="customer">Customers</SelectItem>
                        <SelectItem value="lead">Leads</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="text-sm font-medium text-muted-foreground">
                {totalCount} contacts found
            </div>
        </div>
    )
}
