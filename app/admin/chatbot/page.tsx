import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bot, Settings2, SplitSquareHorizontal } from "lucide-react";
import Link from "next/link";

export default function ChatbotAdminPage() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Chatbot Management</h1>
                <p className="text-muted-foreground">
                    Manage your AI Assistant's knowledge base and test improvements.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="hover:border-primary/50 transition-colors">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <SplitSquareHorizontal className="h-5 w-5 text-indigo-500" />
                            Comparison Arena
                        </CardTitle>
                        <CardDescription>
                            Test Bot V1 (Live) vs Bot V2 (Beta) side-by-side to verify improvements.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Link href="/admin/chatbot/comparison">
                            <Button className="w-full">
                                Enter Arena
                            </Button>
                        </Link>
                    </CardContent>
                </Card>

                <Card className="hover:border-primary/50 transition-colors">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Settings2 className="h-5 w-5 text-emerald-500" />
                            Configuration
                        </CardTitle>
                        <CardDescription>
                            Update the Schedule and FAQ knowledge base without touching code.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Link href="/admin/chatbot/configuration">
                            <Button variant="outline" className="w-full">
                                Manage Config
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Bot className="h-5 w-5" />
                        System Status
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex justify-between border-b pb-2">
                            <span className="text-muted-foreground">V1 Endpoint</span>
                            <span className="font-mono text-xs truncate max-w-[200px]" title={process.env.NEXT_PUBLIC_BOT_V1_URL}>
                                {process.env.NEXT_PUBLIC_BOT_V1_URL || 'Using Default'}
                            </span>
                        </div>
                        <div className="flex justify-between border-b pb-2">
                            <span className="text-muted-foreground">V2 Endpoint</span>
                            <span className="font-mono text-xs truncate max-w-[200px]" title={process.env.NEXT_PUBLIC_BOT_V2_URL}>
                                {process.env.NEXT_PUBLIC_BOT_V2_URL || 'Using Default'}
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
