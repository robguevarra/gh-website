import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { User, Mail } from "lucide-react"

interface PreviewUser {
    id: string
    email: string
    name?: string
}

interface SegmentUserPreviewProps {
    users: PreviewUser[]
    isLoading: boolean
    totalCount: number
}

export function SegmentUserPreview({ users, isLoading, totalCount }: SegmentUserPreviewProps) {
    if (isLoading) {
        return (
            <Card className="border shadow-sm">
                <CardHeader className="pb-3 border-b bg-muted/5">
                    <CardTitle className="text-sm font-medium tracking-wide text-muted-foreground uppercase flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Audience Sample
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="space-y-4 p-6">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="flex items-center space-x-4 animate-pulse">
                                <div className="h-10 w-10 rounded-full bg-muted/40" />
                                <div className="space-y-2 flex-1">
                                    <div className="h-4 w-[150px] bg-muted/40 rounded" />
                                    <div className="h-3 w-[100px] bg-muted/40 rounded" />
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (users.length === 0) {
        return (
            <Card className="border shadow-sm bg-muted/5 border-dashed">
                <CardContent className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
                    <User className="h-10 w-10 mb-3 opacity-20" />
                    <p className="text-sm font-medium">No matching users found</p>
                    <p className="text-xs mt-1 opacity-70">Adjust your filters to see results</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="border shadow-sm overflow-hidden">
            <CardHeader className="py-3 px-4 border-b bg-muted/5 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium tracking-wide text-muted-foreground uppercase flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Audience Sample
                    <Badge variant="secondary" className="ml-2 font-normal text-xs px-1.5 h-5">
                        Showing {users.length} of {totalCount.toLocaleString()}
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <ScrollArea className="h-[300px]">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent border-b-border/60">
                                <TableHead className="pl-6 w-[50px]"></TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.map((user) => (
                                <TableRow key={user.id} className="hover:bg-muted/5">
                                    <TableCell className="pl-6 py-3">
                                        <Avatar className="h-8 w-8 border">
                                            <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.name || user.email}`} />
                                            <AvatarFallback className="text-xs">{user.name?.[0] || 'U'}</AvatarFallback>
                                        </Avatar>
                                    </TableCell>
                                    <TableCell className="font-medium text-sm py-3">
                                        {user.name || 'No Name'}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-sm py-3">
                                        <div className="flex items-center gap-2">
                                            <Mail className="h-3 w-3 opacity-50" />
                                            {user.email}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </ScrollArea>
                <div className="bg-muted/5 p-2 text-xs text-center text-muted-foreground border-t">
                    Preview only. Export list to see full details.
                </div>
            </CardContent>
        </Card>
    )
}
