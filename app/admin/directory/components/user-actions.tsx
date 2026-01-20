'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from "@/components/ui/dialog"
import { Shield, Mail, ShoppingBag, Loader2, CheckCircle, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import {
    updateContactPrimaryEmail,
    updateContactSecondaryEmail,
    resendContactWelcomeEmail,
    enrollContactInP2P,
    sendPasswordResetLink,
    toggleUserBan,
    revokeP2PAccess,
    deleteUser
} from "../actions"
import { DirectoryContact } from "../actions"

interface UserActionsProps {
    contact: DirectoryContact
}

export function UserActions({ contact }: UserActionsProps) {
    // State
    const [isLoading, setIsLoading] = useState<string | null>(null)
    const [activeDialog, setActiveDialog] = useState<'primary-email' | 'secondary-email' | null>(null)

    // Form Data
    const [newEmail, setNewEmail] = useState("")

    // Handlers
    const handleUpdatePrimaryEmail = async () => {
        if (!newEmail) return toast.error("Email required")

        setIsLoading('update-primary')
        try {
            const res = await updateContactPrimaryEmail(contact.id, newEmail)
            if (res.success) {
                toast.success(res.message)
                setActiveDialog(null)
                setNewEmail("")
            } else {
                toast.error(res.error)
            }
        } catch (e) {
            toast.error("An error occurred")
        } finally {
            setIsLoading(null)
        }
    }

    const handleAddSecondaryEmail = async () => {
        if (!newEmail) return toast.error("Email required")

        setIsLoading('add-secondary')
        try {
            const res = await updateContactSecondaryEmail(contact.id, newEmail)
            if (res.success) {
                toast.success(res.message)
                setActiveDialog(null)
                setNewEmail("")
            } else {
                toast.error(res.error)
            }
        } catch (e) {
            toast.error("An error occurred")
        } finally {
            setIsLoading(null)
        }
    }

    const handleResendWelcome = async (context: 'P2P' | 'Canva' | 'Shopify') => {
        setIsLoading(`resend-${context}`)
        try {
            const res = await resendContactWelcomeEmail(contact.email, context)
            if (res.success) {
                toast.success(res.message)
            } else {
                toast.error(res.error)
            }
        } catch (e) {
            toast.error("Trigger failed")
        } finally {
            setIsLoading(null)
        }
    }

    const handleEnrollP2P = async () => {
        // Confirmation?
        const confirmed = window.confirm(`Are you sure you want to manually enroll ${contact.email} into P2P?`)
        if (!confirmed) return

        setIsLoading('enroll-p2p')
        try {
            const res = await enrollContactInP2P(
                contact.email,
                contact.first_name || 'Student',
                contact.last_name || ''
            )
            if (res.success) {
                toast.success(res.message)
            } else {
                toast.error(res.error)
            }
        } catch (e) {
            toast.error("Enrollment failed")
        } finally {
            setIsLoading(null)
        }
    }

    const handleResetPassword = async () => {
        setIsLoading('reset-password')
        try {
            const res = await sendPasswordResetLink(contact.email)
            if (res.success) {
                toast.success(res.message)
            } else {
                toast.error(res.error)
            }
        } catch (e) {
            toast.error("An error occurred")
        } finally {
            setIsLoading(null)
        }
    }

    const handleToggleBan = async () => {
        const isBanned = contact.status === 'blocked'
        const action = isBanned ? 'Unban' : 'Ban'

        const confirmed = window.confirm(`Are you sure you want to ${action} this user?`)
        if (!confirmed) return

        setIsLoading('toggle-ban')
        try {
            const res = await toggleUserBan(contact.id, !isBanned, "Admin action")
            if (res.success) {
                toast.success(res.message)
                // In a real app we might want to refresh the parent data here
                // For now, the toast confirms success
            } else {
                toast.error(res.error)
            }
        } catch (e) {
            toast.error("Action failed")
        } finally {
            setIsLoading(null)
        }
    }

    const handleRevokeP2P = async () => {
        const confirmed = window.confirm(`Are you sure you want to REVOKE P2P access for ${contact.email}?`)
        if (!confirmed) return

        setIsLoading('revoke-p2p')
        try {
            const res = await revokeP2PAccess(contact.email)
            if (res.success) {
                toast.success(res.message)
            } else {
                toast.error(res.error)
            }
        } catch (e) {
            toast.error("Revocation failed")
        } finally {
            setIsLoading(null)
        }
    }

    const handleDeleteUser = async () => {
        const confirmed = window.confirm(`DANGER: Are you sure you want to PERMANENTLY DELETE ${contact.email}? \n\nThis will wipe ALL history including enrollments, transactions, and logs. This cannot be undone.`)
        if (!confirmed) return

        setIsLoading('delete-user')
        try {
            const res = await deleteUser(contact.id)
            if (res.success) {
                toast.success(res.message)
                // Ideally close drawer or redirect
                window.location.reload() // Force reload to clear drawer
            } else {
                toast.error(res.error)
            }
        } catch (e) {
            toast.error("Delete failed")
        } finally {
            setIsLoading(null)
        }
    }

    return (
        <div className="space-y-6">
            {/* Identity Actions */}
            <div className="space-y-2">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                    <Shield className="w-4 h-4" /> Identity & Access
                </h4>
                <div className="grid grid-cols-2 gap-2">
                    {/* Update Primary Email Dialog */}
                    <Dialog open={activeDialog === 'primary-email'} onOpenChange={(open) => {
                        if (!open) setActiveDialog(null)
                        setNewEmail("")
                    }}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="justify-start" onClick={() => setActiveDialog('primary-email')}>
                                Update Email
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Update Primary Email</DialogTitle>
                                <DialogDescription>
                                    This will change the user's login email and update all records.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="py-2 space-y-2">
                                <Label>New Email Address</Label>
                                <Input
                                    placeholder="new@example.com"
                                    value={newEmail}
                                    onChange={(e) => setNewEmail(e.target.value)}
                                />
                            </div>
                            <DialogFooter>
                                <Button variant="ghost" onClick={() => setActiveDialog(null)}>Cancel</Button>
                                <Button onClick={handleUpdatePrimaryEmail} disabled={isLoading === 'update-primary'}>
                                    {isLoading === 'update-primary' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    Update Email
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* Add Secondary Email Dialog */}
                    <Dialog open={activeDialog === 'secondary-email'} onOpenChange={(open) => {
                        if (!open) setActiveDialog(null)
                        setNewEmail("")
                    }}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="justify-start" onClick={() => setActiveDialog('secondary-email')}>
                                Add Secondary Email
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add Secondary Email</DialogTitle>
                                <DialogDescription>
                                    Add an alternative email for this user. Useful for linking Shopify orders using a different email.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="py-2 space-y-2">
                                <Label>Secondary Email</Label>
                                <Input
                                    placeholder="secondary@example.com"
                                    value={newEmail}
                                    onChange={(e) => setNewEmail(e.target.value)}
                                />
                            </div>
                            <DialogFooter>
                                <Button variant="ghost" onClick={() => setActiveDialog(null)}>Cancel</Button>
                                <Button onClick={handleAddSecondaryEmail} disabled={isLoading === 'add-secondary'}>
                                    {isLoading === 'add-secondary' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    Add Email
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <Button
                        variant="outline"
                        size="sm"
                        className="justify-start"
                        onClick={handleResetPassword}
                        disabled={isLoading === 'reset-password'}
                    >
                        {isLoading === 'reset-password' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Reset Password
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className={`justify-start ${contact.status === 'blocked' ? 'text-green-600 hover:text-green-700' : 'text-red-600 hover:text-red-700'}`}
                        onClick={handleToggleBan}
                        disabled={isLoading === 'toggle-ban'}
                    >
                        {isLoading === 'toggle-ban' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        {contact.status === 'blocked' ? 'Unban User' : 'Ban User'}
                    </Button>
                </div>
            </div>

            {/* Communication Actions */}
            <div className="space-y-2">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                    <Mail className="w-4 h-4" /> Communication
                </h4>
                <div className="grid grid-cols-2 gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="justify-start"
                        onClick={() => handleResendWelcome('P2P')}
                        disabled={!!isLoading}
                    >
                        {isLoading === 'resend-P2P' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                        Resend P2P Welcome
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="justify-start"
                        onClick={() => handleResendWelcome('Canva')}
                        disabled={!!isLoading}
                    >
                        {isLoading === 'resend-Canva' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                        Resend Canva Ebook
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="justify-start"
                        onClick={() => handleResendWelcome('Shopify')}
                        disabled={!!isLoading}
                    >
                        {isLoading === 'resend-Shopify' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                        Resend Shopify Confirm
                    </Button>
                </div>
            </div>

            {/* Commerce Actions */}
            <div className="space-y-2">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                    <ShoppingBag className="w-4 h-4" /> Commerce
                </h4>
                <div className="grid grid-cols-2 gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="justify-start"
                        onClick={handleEnrollP2P}
                        disabled={!!isLoading}
                    >
                        {isLoading === 'enroll-p2p' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                        Grant P2P Access
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="justify-start text-red-600 hover:text-red-700"
                        onClick={handleRevokeP2P}
                        disabled={!!isLoading}
                    >
                        {isLoading === 'revoke-p2p' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                        Revoke P2P Access
                    </Button>
                </div>
            </div>

            {/* Danger Zone */}
            <div className="space-y-2 pt-4 border-t">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-red-600">
                    <AlertTriangle className="w-4 h-4" /> Danger Zone
                </h4>
                <div className="grid grid-cols-1">
                    <Button
                        variant="destructive"
                        size="sm"
                        className="justify-start opacity-90 hover:opacity-100"
                        onClick={handleDeleteUser}
                        disabled={!!isLoading}
                    >
                        {isLoading === 'delete-user' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                        Permanently Delete User
                    </Button>
                </div>
            </div>
        </div>
    )
}
