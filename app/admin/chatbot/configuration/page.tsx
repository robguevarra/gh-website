'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Plus, Trash2, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { getBotConfig, updateBotConfig, resetBotPrompt } from "@/app/actions/chatbot-actions";

type FAQItem = {
    intent: string;
    triggers: string[];
    answer: string;
};

// Helper to clean up stringified JSON or escaped newlines for display
const formatPromptForDisplay = (str: string) => {
    if (!str) return "";
    let formatted = str;

    // Remove wrapping quotes if it looks like a stringified string
    if (formatted.startsWith('"') && formatted.endsWith('"')) {
        formatted = formatted.slice(1, -1);
    }

    // Unescape literal backslash-n to real newlines
    formatted = formatted.replace(/\\n/g, '\n');

    // Unescape literal backslash-quotes
    formatted = formatted.replace(/\\"/g, '"');

    return formatted;
};

export default function ConfigurationPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // -- Schedule State --
    const [schedule, setSchedule] = useState("");
    const [scheduleNote, setScheduleNote] = useState("");

    // -- FAQ State --
    const [faqs, setFaqs] = useState<FAQItem[]>([]);

    // -- System Prompt State --
    const [systemPrompt, setSystemPrompt] = useState("");

    // Initial Fetch
    useEffect(() => {
        async function loadConfig() {
            try {
                setLoading(true);
                const scheduleData = await getBotConfig('bot_schedule');
                const faqData = await getBotConfig('student_faq');
                const promptData = await getBotConfig('bot_prompt');

                // Load Schedule
                if (scheduleData) {
                    setSchedule(scheduleData.schedule || "");
                    setScheduleNote(scheduleData.schedule_note || "");
                } else {
                    // Defaults if not existing
                    setSchedule("Mon-Fri 8am-6pm (Manila Time)");
                }

                // Load FAQs
                if (faqData && faqData.items && Array.isArray(faqData.items)) {
                    setFaqs(faqData.items);
                } else if (faqData && Array.isArray(faqData)) {
                    // Handling legacy array-root format just in case
                    setFaqs(faqData);
                }

                // Load System Prompt
                if (promptData && promptData.template) {
                    setSystemPrompt(formatPromptForDisplay(promptData.template));
                }

            } catch (err) {
                console.error(err);
                toast.error("Failed to load configuration");
            } finally {
                setLoading(false);
            }
        }
        loadConfig();
    }, []);

    // --- Actions ---

    const handleSaveSchedule = async () => {
        try {
            setSaving(true);
            const res = await updateBotConfig('bot_schedule', {
                schedule: schedule,
                schedule_note: scheduleNote
            });

            if (res.success) {
                toast.success("Schedule updated successfully!");
            } else {
                toast.error("Failed to save schedule.");
            }
        } catch (e) {
            toast.error("An unexpected error occurred.");
        } finally {
            setSaving(false);
        }
    };

    const handleSaveFAQs = async () => {
        try {
            setSaving(true);
            // Sanitize: Remove empty triggers
            const cleanedFaqs = faqs.map(f => ({
                ...f,
                triggers: f.triggers.filter(t => t.trim() !== "")
            })).filter(f => f.intent.trim() !== "");

            const res = await updateBotConfig('student_faq', { items: cleanedFaqs });

            if (res.success) {
                toast.success("Knowledge Base updated successfully!");
            } else {
                toast.error("Failed to save FAQs.");
            }
        } catch (e) {
            toast.error("An unexpected error occurred.");
        } finally {
            setSaving(false);
        }
    };

    const handleSavePrompt = async () => {
        try {
            setSaving(true);
            const res = await updateBotConfig('bot_prompt', {
                template: systemPrompt
            });

            if (res.success) {
                toast.success("System Prompt updated successfully!");
            } else {
                toast.error("Failed to save prompt.");
            }
        } catch (e) {
            toast.error("An unexpected error occurred.");
        } finally {
            setSaving(false);
        }
    };

    const handleResetPrompt = async () => {
        if (!confirm("Are you sure? This will overwrite the current online prompt with the default 'prompt.json' file.")) return;

        try {
            setLoading(true);
            const res = await resetBotPrompt();
            if (res.success) {
                toast.success("Prompt restored to default!");
                // Reload to reflect changes
                const promptData = await getBotConfig('bot_prompt');
                if (promptData && promptData.template) {
                    setSystemPrompt(formatPromptForDisplay(promptData.template));
                }
            } else {
                toast.error("Failed to restore prompt.");
            }
        } catch (e) {
            toast.error("Error resetting prompt.");
        } finally {
            setLoading(false);
        }
    };

    // --- FAQ UI Helpers ---

    const addFAQ = () => {
        setFaqs([...faqs, { intent: 'new_intent', triggers: [], answer: '' }]);
    };

    const removeFAQ = (index: number) => {
        const newFaqs = [...faqs];
        newFaqs.splice(index, 1);
        setFaqs(newFaqs);
    };

    const updateFAQ = (index: number, field: keyof FAQItem, value: any) => {
        const newFaqs = [...faqs];
        newFaqs[index] = { ...newFaqs[index], [field]: value };
        setFaqs(newFaqs);
    };

    const updateTrigger = (faqIndex: number, triggerIndex: number, val: string) => {
        const newFaqs = [...faqs];
        newFaqs[faqIndex].triggers[triggerIndex] = val;
        setFaqs(newFaqs);
    };

    const addTrigger = (faqIndex: number) => {
        const newFaqs = [...faqs];
        newFaqs[faqIndex].triggers.push("");
        setFaqs(newFaqs);
    };

    const removeTrigger = (faqIndex: number, triggerIndex: number) => {
        const newFaqs = [...faqs];
        newFaqs[faqIndex].triggers.splice(triggerIndex, 1);
        setFaqs(newFaqs);
    };

    if (loading) {
        return (
            <div className="flex h-[400px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex items-center text-sm text-muted-foreground">
                <a href="/admin/chatbot" className="hover:text-primary transition-colors">Chatbot</a>
                <span className="mx-2">/</span>
                <span className="font-medium text-foreground">Configuration</span>
            </div>

            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Configuration</h2>
                    <p className="text-muted-foreground">Changes usually take 5 minutes to reflect in the live bot (Cache TTL).</p>
                </div>
            </div>

            <Tabs defaultValue="schedule">
                <TabsList>
                    <TabsTrigger value="schedule">Bot Schedule</TabsTrigger>
                    <TabsTrigger value="faqs">Knowledge Base</TabsTrigger>
                    <TabsTrigger value="prompt">System Prompt</TabsTrigger>
                </TabsList>

                {/* --- SCHEDULE TAB --- */}
                <TabsContent value="schedule" className="mt-4 space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Operational Hours</CardTitle>
                            <CardDescription>
                                Define when the bot should tell users that human staff are unavailable.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Schedule String</Label>
                                <Input
                                    value={schedule}
                                    onChange={(e) => setSchedule(e.target.value)}
                                    placeholder="e.g. Mon-Fri, 9AM - 5PM"
                                />
                                <p className="text-xs text-muted-foreground">Used by the bot to explain standard hours.</p>
                            </div>

                            <div className="space-y-2">
                                <Label>Special Note (Holidays/Leaves)</Label>
                                <Textarea
                                    value={scheduleNote}
                                    onChange={(e) => setScheduleNote(e.target.value)}
                                    placeholder="e.g. We are closed for Christmas from Dec 24-26."
                                />
                                <p className="text-xs text-muted-foreground">Added context for the bot during special events.</p>
                            </div>

                            <Button onClick={handleSaveSchedule} disabled={saving} className="mt-4">
                                {saving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                                Save Schedule
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* --- FAQ TAB --- */}
                <TabsContent value="faqs" className="mt-4 space-y-4">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Knowledge Base Intents</CardTitle>
                                    <CardDescription>Hardcoded triggers for specific questions. These bypass the smart brain for consistency.</CardDescription>
                                </div>
                                <Button variant="outline" size="sm" onClick={handleSaveFAQs} disabled={saving}>
                                    {saving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                                    Save All Changes
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Accordion type="multiple" className="w-full space-y-4">
                                {faqs.map((faq, idx) => (
                                    <AccordionItem key={idx} value={`item-${idx}`} className="border rounded-lg px-4 bg-card">
                                        <AccordionTrigger className="hover:no-underline">
                                            <div className="flex items-center justify-between w-full pr-4">
                                                <div className="flex items-center gap-3">
                                                    <span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                                                        {faq.intent || "Unnamed"}
                                                    </span>
                                                    <span className="text-sm text-muted-foreground truncate max-w-[300px]">
                                                        {faq.answer}
                                                    </span>
                                                </div>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="pt-4 space-y-4 border-t mt-2">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {/* Left: Metadata & Answer */}
                                                <div className="space-y-4">
                                                    <div className="space-y-2">
                                                        <Label>Intent Key (Unique)</Label>
                                                        <Input
                                                            value={faq.intent}
                                                            onChange={(e) => updateFAQ(idx, 'intent', e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Bot Answer</Label>
                                                        <Textarea
                                                            rows={5}
                                                            value={faq.answer}
                                                            onChange={(e) => updateFAQ(idx, 'answer', e.target.value)}
                                                        />
                                                    </div>
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        onClick={() => removeFAQ(idx)}
                                                    >
                                                        <Trash2 className="h-4 w-4 mr-2" />
                                                        Delete FAQ
                                                    </Button>
                                                </div>

                                                {/* Right: Triggers */}
                                                <div className="bg-muted/30 p-4 rounded-md space-y-2">
                                                    <Label>Triggers (Keywords)</Label>
                                                    <div className="space-y-2">
                                                        {faq.triggers.map((trigger, tIdx) => (
                                                            <div key={tIdx} className="flex gap-2">
                                                                <Input
                                                                    value={trigger}
                                                                    onChange={(e) => updateTrigger(idx, tIdx, e.target.value)}
                                                                    className="h-8 text-sm"
                                                                />
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                                    onClick={() => removeTrigger(idx, tIdx)}
                                                                >
                                                                    <Trash2 className="h-3 w-3" />
                                                                </Button>
                                                            </div>
                                                        ))}
                                                        <Button size="sm" variant="ghost" onClick={() => addTrigger(idx)}>
                                                            <Plus className="h-3 w-3 mr-2" /> Add Trigger
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>

                            <Button onClick={addFAQ} variant="outline" className="w-full mt-4 border-dashed">
                                <Plus className="h-4 w-4 mr-2" />
                                Add New FAQ Intent
                            </Button>

                            <div className="flex justify-end mt-6 pt-4 border-t">
                                <Button onClick={handleSaveFAQs} disabled={saving} className="w-full sm:w-auto">
                                    {saving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                                    Save All Changes
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* --- PROMPT TAB --- */}
                <TabsContent value="prompt" className="mt-4 space-y-4">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>System Prompt Template</CardTitle>
                                    <CardDescription>
                                        The core instructions for the AI ("Brain"). Supports placeholders like {"{schedule_text}"}.
                                    </CardDescription>
                                </div>
                                <Button variant="outline" size="sm" onClick={handleResetPrompt} disabled={saving || loading}>
                                    <div className="mr-2 h-4 w-4">🔄</div>
                                    Restore Default
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="bg-amber-50 dark:bg-amber-950/20 p-4 border border-amber-200 dark:border-amber-800 rounded-md text-sm text-amber-800 dark:text-amber-200">
                                <AlertCircle className="h-4 w-4 inline-block mr-2 text-amber-600 dark:text-amber-400" />
                                <strong>Warning:</strong> Changes here affect the bot's tone and logic immediately (after cache expiry). Backup your prompt before making major edits.
                            </div>

                            <Textarea
                                className="font-mono text-sm leading-relaxed min-h-[600px] whitespace-pre-wrap"
                                value={systemPrompt}
                                onChange={(e) => setSystemPrompt(e.target.value)}
                                placeholder="You are a helpful assistant..."
                            />

                            <div className="flex justify-end">
                                <Button onClick={handleSavePrompt} disabled={saving} className="w-full sm:w-auto">
                                    {saving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                                    Save System Prompt
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
