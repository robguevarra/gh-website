import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { SmartList } from "../actions"
import { DateRange } from "react-day-picker"
import { TagManagerDialog } from "./tag-manager-dialog"

interface DirectoryHeaderProps {
    search: string
    onSearchChange: (value: string) => void
    typeFilter: 'all' | 'customer' | 'lead'
    onTypeFilterChange: (value: 'all' | 'customer' | 'lead') => void
    smartLists: SmartList[]
    smartListFilter: string
    onSmartListFilterChange: (value: string) => void
    tags: { id: string; name: string }[]
    tagFilter: string
    onTagFilterChange: (value: string) => void
    dateRange: DateRange | undefined
    onDateRangeChange: (value: DateRange | undefined) => void
    totalCount: number
}

export function DirectoryHeader({
    search,
    onSearchChange,
    typeFilter,
    onTypeFilterChange,
    smartLists,
    smartListFilter,
    onSmartListFilterChange,
    tags,
    tagFilter,
    onTagFilterChange,
    dateRange,
    onDateRangeChange,
    totalCount
}: DirectoryHeaderProps) {
    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
                <div className="flex flex-col md:flex-row gap-2 w-full">
                    <Input
                        placeholder="Search name or email..."
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="h-9 w-full md:w-[300px]"
                    />
                    <DateRangePicker
                        value={dateRange}
                        onChange={onDateRangeChange}
                        className="w-full md:w-[260px]"
                    />
                </div>

                <div className="flex gap-2 w-full overflow-x-auto pb-2 md:pb-0">
                    <Select
                        value={typeFilter}
                        onValueChange={(val: any) => onTypeFilterChange(val)}
                    >
                        <SelectTrigger className="h-9 w-[150px]">
                            <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="customer">Customers</SelectItem>
                            <SelectItem value="lead">Leads</SelectItem>
                        </SelectContent>
                    </Select>


                    {smartLists.length > 0 && (
                        <Select
                            value={smartListFilter}
                            onValueChange={onSmartListFilterChange}
                        >
                            <SelectTrigger className="h-9 w-[200px]">
                                <SelectValue placeholder="Filter by Smart List" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Contacts</SelectItem>
                                {smartLists.map(list => (
                                    <SelectItem key={list.id} value={list.id}>
                                        {list.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}

                    <Select
                        value={tagFilter}
                        onValueChange={onTagFilterChange}
                    >
                        <SelectTrigger className="h-9 w-[200px]">
                            <SelectValue placeholder="Filter by Tag" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Tags</SelectItem>
                            {tags.map(tag => (
                                <SelectItem key={tag.id} value={tag.id}>
                                    {tag.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="flex items-center justify-between w-full">
                <TagManagerDialog />
                <div className="text-sm font-medium text-muted-foreground">
                    {totalCount} contacts found
                </div>
            </div>
        </div>
    )
}
