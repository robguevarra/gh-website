import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function VisitorAnalyticsSkeleton() {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
                {/* Key Metrics */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {[...Array(4)].map((_, i) => (
                        <Card key={i}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    <Skeleton className="h-4 w-[100px]" />
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-8 w-[60px]" />
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Charts */}
                <div className="grid gap-4 md:grid-cols-1">
                    <Card>
                        <CardHeader>
                            <CardTitle><Skeleton className="h-6 w-[150px]" /></CardTitle>
                        </CardHeader>
                        <CardContent className="h-[300px]">
                            <Skeleton className="h-full w-full" />
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    {[...Array(2)].map((_, i) => (
                        <Card key={i}>
                            <CardHeader>
                                <CardTitle><Skeleton className="h-6 w-[150px]" /></CardTitle>
                            </CardHeader>
                            <CardContent className="h-[300px]">
                                <Skeleton className="h-full w-full" />
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    {[...Array(2)].map((_, i) => (
                        <Card key={i}>
                            <CardHeader>
                                <CardTitle><Skeleton className="h-6 w-[150px]" /></CardTitle>
                            </CardHeader>
                            <CardContent className="h-[300px]">
                                <Skeleton className="h-full w-full" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-8">
                <Card className="h-full">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Skeleton className="h-5 w-5" />
                            <Skeleton className="h-6 w-[100px]" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="flex flex-col gap-4 p-4">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="flex items-start gap-4">
                                    <Skeleton className="h-8 w-8 rounded-full" />
                                    <div className="flex-1 space-y-2">
                                        <Skeleton className="h-4 w-full" />
                                        <Skeleton className="h-3 w-[100px]" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
