import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Activity, Eye, MousePointerClick, ShoppingCart } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { RecentActivityItem } from '@/app/actions/analytics-dashboard-actions';

interface RecentActivityListProps {
    data: RecentActivityItem[];
}

export function RecentActivityList({ data }: RecentActivityListProps) {
    const getIcon = (type: string, eventName?: string) => {
        if (type === 'view') return <Eye className="h-4 w-4 text-blue-500" />;
        if (eventName === 'initiate_checkout') return <ShoppingCart className="h-4 w-4 text-green-500" />;
        if (eventName === 'click_cta') return <MousePointerClick className="h-4 w-4 text-orange-500" />;
        return <Activity className="h-4 w-4 text-gray-500" />;
    };

    const getMessage = (item: RecentActivityItem) => {
        const location = item.details.city ? `${item.details.city}, ${item.details.country}` : 'Unknown Location';

        if (item.type === 'view') {
            return (
                <span>
                    Someone from <span className="font-medium">{location}</span> viewed <span className="font-medium">{item.details.path}</span>
                </span>
            );
        }

        if (item.details.event_name === 'initiate_checkout') {
            return (
                <span>
                    Someone from <span className="font-medium">{location}</span> started checkout
                </span>
            );
        }

        return (
            <span>
                Someone from <span className="font-medium">{location}</span> triggered {item.details.event_name}
            </span>
        );
    };

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Live Feed
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <ScrollArea className="h-[400px]">
                    <div className="flex flex-col">
                        {data.map((item) => (
                            <div key={item.id} className="flex items-start gap-4 border-b p-4 last:border-0 hover:bg-muted/50 transition-colors">
                                <div className="mt-1 bg-muted p-2 rounded-full">
                                    {getIcon(item.type, item.details.event_name)}
                                </div>
                                <div className="flex-1 space-y-1">
                                    <p className="text-sm leading-none">{getMessage(item)}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                                    </p>
                                </div>
                            </div>
                        ))}
                        {data.length === 0 && (
                            <div className="p-8 text-center text-muted-foreground">No recent activity</div>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
