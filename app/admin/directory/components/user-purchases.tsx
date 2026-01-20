'use client'

import { useQuery } from "@tanstack/react-query"
import {
    getDirectoryFinancials,
} from "../actions"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { format } from "date-fns"
import { ShoppingBag, CreditCard, GraduationCap, ArrowUpRight, Package, Info } from "lucide-react"

interface UserPurchasesProps {
    email: string
}

import { resendOrderConfirmation } from "@/app/actions/guest-access"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Loader2, Send, Check } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"

export function UserPurchases({ email }: UserPurchasesProps) {
    const { data, isLoading } = useQuery({
        queryKey: ['financials', email],
        queryFn: () => getDirectoryFinancials(email),
        enabled: !!email
    })

    const [resendingId, setResendingId] = useState<string | null>(null);
    const [sentId, setSentId] = useState<string | null>(null);

    const handleResend = async (item: any) => {
        const orderId = item.transaction_id || item.id;
        setResendingId(orderId);
        try {
            const result = await resendOrderConfirmation(orderId, email);
            if (result && 'error' in result) {
                toast.error(result.error)
            } else if (result.success) {
                toast.success("Confirmation email sent")
                setSentId(orderId)
                setTimeout(() => setSentId(null), 3000)
            } else {
                toast.error("Failed to send email")
            }
        } catch (error) {
            toast.error("An error occurred")
        } finally {
            setResendingId(null);
        }
    };

    const formatCurrency = (amount: number, currency: string | null = 'PHP') => {
        return new Intl.NumberFormat('en-PH', { style: 'currency', currency: currency || 'PHP' }).format(amount);
    };

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-48 w-full" />
            </div>
        )
    }

    if (!data) return <div className="text-muted-foreground p-4">No financial data available.</div>

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Spent</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(data.summary.totalSpent)}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Orders</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.summary.totalOrders}</div>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="transactions" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="transactions">Transactions</TabsTrigger>
                    <TabsTrigger value="licenses">Licenses</TabsTrigger>
                    <TabsTrigger value="shopify">Shopify</TabsTrigger>
                    <TabsTrigger value="enrollments">Courses</TabsTrigger>
                </TabsList>

                {/* Commercial Licenses Tab */}
                <TabsContent value="licenses" className="mt-4">
                    <ScrollArea className="h-[400px] w-full rounded-md border p-4">
                        {(() => {
                            const licenses = data?.ecommerceOrders?.flatMap(order =>
                                (order.line_items || []).map((item: any) => ({
                                    ...item,
                                    order_date: order.created_at,
                                    source: order.payment_method,
                                    is_public_order: order.is_public_order,
                                    payment_method: order.payment_method,
                                    transaction_id: order.id,
                                    type: order.payment_method === 'Public Store' ? 'Public Store' : 'Ecommerce',
                                    status: item.status || order.order_status
                                }))
                            ) || [];

                            if (licenses.length === 0) {
                                return (
                                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-2 translate-y-20">
                                        <ShoppingBag className="w-8 h-8 opacity-20" />
                                        <p className="text-sm">No commercial licenses found.</p>
                                    </div>
                                );
                            }

                            return (
                                <div className="space-y-4">
                                    {licenses.map((item: any, i: number) => (
                                        <div key={i} className="flex items-center justify-between p-4 border rounded-lg bg-emerald-50/10 border-emerald-100">
                                            <div className="flex items-start gap-3">
                                                <div className="p-2 bg-emerald-100 rounded-md">
                                                    <ShoppingBag className="w-4 h-4 text-emerald-700" />
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium text-sm text-emerald-900">{item.product?.title || 'Unknown License'}</span>
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        Purchased {format(new Date(item.order_date), 'MMM d, yyyy')} • {item.source}
                                                        {(item.is_public_order || item.payment_method === 'Public Store') && (
                                                            <span className="ml-2 inline-flex items-center">
                                                                <Badge variant="outline" className="text-[9px] px-1 mr-2 h-4 border-emerald-200 text-emerald-700 bg-emerald-50">Public Store</Badge>
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                <Badge className="bg-emerald-600 hover:bg-emerald-700 text-[10px]">
                                                    Active
                                                </Badge>

                                                {/* Resend Email Button for Public Store */}
                                                {(item.is_public_order || item.payment_method === 'Public Store') && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className={cn("h-6 text-[10px] px-2", sentId === (item.transaction_id || item.id) ? "text-green-600 bg-green-50" : "text-muted-foreground hover:text-primary")}
                                                        onClick={(e) => { e.stopPropagation(); handleResend(item); }}
                                                        disabled={resendingId === (item.transaction_id || item.id) || sentId === (item.transaction_id || item.id)}
                                                    >
                                                        {resendingId === (item.transaction_id || item.id) ? (
                                                            <Loader2 className="w-3 h-3 animate-spin" />
                                                        ) : sentId === (item.transaction_id || item.id) ? (
                                                            <>
                                                                <Check className="w-3 h-3 mr-1" /> Sent
                                                            </>
                                                        ) : (
                                                            "Resend Email"
                                                        )}
                                                    </Button>
                                                )}

                                                {/* Refund Button Logic for P2P Transaction in the wrong tab?? 
                                                Note: P2P transactions are usually under "Transactions" tab, not "Commercial Licenses".
                                                This section is for e-commerce orders. 
                                                If the user wanted to refund e-commerce orders, we'd add it here.
                                                But the request was for "P2P Access Revocation" / "Manual Refund".
                                                These usually appear in "Transactions" tab. 
                                                I'll finish cleaning this tab and then verify the Transactions tab has the button.
                                            */}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            );
                        })()}
                    </ScrollArea>
                </TabsContent>

                {/* Transactions Tab */}
                <TabsContent value="transactions" className="mt-4">
                    <ScrollArea className="h-[400px] w-full rounded-md border p-4">
                        {data?.transactions?.length > 0 ? (
                            <div className="space-y-4">
                                {data.transactions.map((t: any) => (
                                    <div key={t.id} className="flex items-center justify-between p-4 border rounded-lg bg-slate-50/50">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <div className={`p-2 rounded-md ${t.status === 'refunded' ? 'bg-red-100' : 'bg-slate-100'}`}>
                                                    <CreditCard className={`w-4 h-4 ${t.status === 'refunded' ? 'text-red-700' : 'text-slate-700'}`} />
                                                </div>
                                                <span className="font-medium text-sm">
                                                    {t.description || t.transaction_type || 'Payment'}
                                                </span>
                                            </div>
                                            <div className="text-xs text-muted-foreground ml-10">
                                                {format(new Date(t.created_at), 'MMM d, yyyy • h:mm a')}
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <div className="text-right">
                                                <span className={`font-bold text-sm block ${t.status === 'refunded' ? 'line-through text-muted-foreground' : ''}`}>
                                                    {formatCurrency(t.amount, t.currency)}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <Badge
                                                    variant={t.status === 'succeeded' || t.status === 'paid' || t.status === 'completed' ? 'outline' : t.status === 'refunded' ? 'destructive' : 'secondary'}
                                                    className={`text-[10px] h-5 ${t.status === 'refunded' ? 'bg-red-100 text-red-700 hover:bg-red-200 border-red-200' : ''}`}
                                                >
                                                    {t.status}
                                                </Badge>

                                                {(t.status === 'succeeded' || t.status === 'paid' || t.status === 'completed') && (
                                                    <div className="w-6" /> // Placeholder to keep layout? Or nothing. null is fine.
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-2 translate-y-20">
                                <CreditCard className="w-8 h-8 opacity-20" />
                                <p className="text-sm">No transactions found.</p>
                            </div>
                        )}
                    </ScrollArea>
                </TabsContent>

                {/* Shopify Tab */}
                <TabsContent value="shopify" className="mt-4">
                    <ScrollArea className="h-[300px] rounded-md border p-4">
                        {data.shopifyOrders.length > 0 ? (
                            <div className="space-y-4">
                                {data.shopifyOrders.map((o: any) => (
                                    <div key={o.id} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                                                <span className="font-medium text-sm">Order #{o.order_number}</span>
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                {format(new Date(o.created_at), 'MMM d, yyyy')}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <span className="font-bold text-sm block">
                                                {new Intl.NumberFormat('en-PH', { style: 'currency', currency: o.currency || 'PHP' }).format(o.total_price)}
                                            </span>
                                            <Badge variant="outline" className="text-[10px] px-1 py-0 h-5">
                                                {o.fulfillment_status || 'unfulfilled'}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center text-sm text-muted-foreground py-8">No Shopify orders found.</div>
                        )}
                    </ScrollArea>
                </TabsContent>

                {/* Enrollments Tab */}
                <TabsContent value="enrollments" className="mt-4">
                    <ScrollArea className="h-[300px] rounded-md border p-4">
                        {data.enrollments.length > 0 ? (
                            <div className="space-y-4">
                                {data.enrollments.map((e: any) => (
                                    <div key={e.id} className="flex items-start justify-between border-b pb-4 last:border-0 last:pb-0">
                                        <div className="flex gap-3">
                                            {e.course?.thumbnail_url && (
                                                <img src={e.course.thumbnail_url} alt="" className="h-10 w-16 object-cover rounded bg-muted" />
                                            )}
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <GraduationCap className="h-4 w-4 text-muted-foreground" />
                                                    <span className="font-medium text-sm">{e.course?.title || 'Unknown Course'}</span>
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    Enrolled {format(new Date(e.enrolled_at), 'MMM d, yyyy')}
                                                </p>
                                            </div>
                                        </div>
                                        <Badge variant={e.status === 'active' || e.status === 'completed' ? 'default' : 'secondary'} className="text-[10px]">
                                            {e.status}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center text-sm text-muted-foreground py-8">No enrollments found.</div>
                        )}
                    </ScrollArea>
                </TabsContent>
            </Tabs >
        </div >
    )
}
