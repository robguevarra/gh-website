import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { BarChart3, Mail, FileText, Zap, Users, Settings } from "lucide-react"

interface StudioSidebarProps {
    activeTab: string
    onTabChange: (tab: string) => void
}

export function StudioSidebar({ activeTab, onTabChange }: StudioSidebarProps) {
    const navItems = [
        { id: "overview", label: "Overview", icon: BarChart3 },
        { id: "campaigns", label: "Campaigns", icon: Mail },
        { id: "audience", label: "Audience", icon: Users },
        { id: "templates", label: "Templates", icon: FileText },
        { id: "automations", label: "Automations", icon: Zap },
    ]

    return (
        <div className="w-64 border-r bg-muted/10 flex flex-col h-[calc(100vh-4rem)] sticky top-16">
            <div className="p-4">
                <h2 className="text-lg font-semibold tracking-tight px-4 mb-4">Email Studio</h2>
                <div className="space-y-1">
                    {navItems.map((item) => (
                        <Button
                            key={item.id}
                            variant={activeTab === item.id ? "secondary" : "ghost"}
                            className={cn(
                                "w-full justify-start",
                                activeTab === item.id && "bg-secondary/50 font-medium"
                            )}
                            onClick={() => onTabChange(item.id)}
                        >
                            <item.icon className="mr-2 h-4 w-4" />
                            {item.label}
                        </Button>
                    ))}
                </div>
            </div>

            <div className="mt-auto p-4 border-t">
                <Button variant="ghost" className="w-full justify-start text-muted-foreground" disabled>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                </Button>
            </div>
        </div>
    )
}
