import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Database } from "@/lib/supabase/database.types"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"

type DirectoryContact = Database['public']['Views']['view_directory_contacts']['Row']

interface DirectoryTableProps {
    data: DirectoryContact[]
    isLoading: boolean
    onRowClick?: (id: string, type: 'customer' | 'lead') => void
}

export function DirectoryTable({ data, isLoading, onRowClick }: DirectoryTableProps) {
    if (isLoading) {
        return (
            <div className="p-4 space-y-4">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4">
                        <Skeleton className="h-12 w-full" />
                    </div>
                ))}
            </div>
        )
    }

    if (data.length === 0) {
        return (
            <div className="p-12 text-center text-muted-foreground">
                No contacts found matching your criteria.
            </div>
        )
    }

    return (
        <div className="relative w-full overflow-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Contact</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Tags</TableHead>
                        <TableHead className="text-right">Created</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map((contact) => (
                        <TableRow
                            key={contact.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => onRowClick?.(contact.id, contact.type)}
                        >
                            <TableCell>
                                <div className="flex flex-col">
                                    <span className="font-medium">
                                        {contact.first_name || contact.last_name
                                            ? `${contact.first_name ?? ''} ${contact.last_name ?? ''}`.trim()
                                            : 'Unknown'}
                                    </span>
                                    <span className="text-xs text-muted-foreground">{contact.email}</span>
                                </div>
                            </TableCell>
                            <TableCell>
                                <Badge variant={contact.type === 'customer' ? 'default' : 'secondary'}>
                                    {contact.type}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                <span className="text-sm capitalize text-muted-foreground">
                                    {contact.status ?? '-'}
                                </span>
                            </TableCell>
                            <TableCell>
                                <div className="flex flex-wrap gap-1">
                                    {contact.tags?.slice(0, 3).map((tag) => (
                                        <Badge key={tag} variant="outline" className="text-[10px] px-1 py-0 h-5">
                                            {tag}
                                        </Badge>
                                    ))}
                                    {(contact.tags?.length ?? 0) > 3 && (
                                        <Badge variant="outline" className="text-[10px] px-1 py-0 h-5">
                                            +{(contact.tags?.length ?? 0) - 3}
                                        </Badge>
                                    )}
                                </div>
                            </TableCell>
                            <TableCell className="text-right text-sm text-muted-foreground">
                                {contact.created_at
                                    ? formatDistanceToNow(new Date(contact.created_at), { addSuffix: true })
                                    : '-'}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
