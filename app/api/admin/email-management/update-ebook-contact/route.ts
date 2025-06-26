import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase/admin'

/**
 * Admin API: Update Ebook Contact Information
 * 
 * Allows administrators to update ebook contact information including:
 * - Email address changes
 * - Name corrections
 * - Phone number updates
 * - Metadata modifications
 * 
 * POST /api/admin/email-management/update-ebook-contact
 */
export async function POST(req: NextRequest) {
  try {
    const { currentEmail, updates } = await req.json()

    // Validate required fields
    if (!currentEmail) {
      return NextResponse.json(
        { error: 'Current email is required' },
        { status: 400 }
      )
    }

    if (!updates || Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'At least one update field is required' },
        { status: 400 }
      )
    }

    const supabase = getAdminClient()

    // Check if ebook contact exists
    const { data: existingContact, error: fetchError } = await supabase
      .from('ebook_contacts')
      .select('email, first_name, last_name, phone, metadata, created_at, updated_at')
      .eq('email', currentEmail)
      .maybeSingle()

    if (fetchError) {
      console.error('[Update Ebook Contact] Fetch error:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch ebook contact' },
        { status: 500 }
      )
    }

    if (!existingContact) {
      return NextResponse.json(
        { error: 'Ebook contact not found' },
        { status: 404 }
      )
    }

    // Prepare update data
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString()
    }

    // Handle email change (requires special handling since email is primary key)
    if (updates.email && updates.email !== currentEmail) {
      // Check if new email already exists
      const { data: emailExists, error: emailCheckError } = await supabase
        .from('ebook_contacts')
        .select('email')
        .eq('email', updates.email)
        .maybeSingle()

      if (emailCheckError && emailCheckError.code !== 'PGRST116') {
        console.error('[Update Ebook Contact] Email check error:', emailCheckError)
        return NextResponse.json(
          { error: 'Failed to validate new email' },
          { status: 500 }
        )
      }

      if (emailExists) {
        return NextResponse.json(
          { error: 'An ebook contact with this email already exists' },
          { status: 409 }
        )
      }

      // For email changes, we need to delete old record and insert new one
      const newContactData = {
        email: updates.email,
        first_name: updates.first_name ?? existingContact.first_name,
        last_name: updates.last_name ?? existingContact.last_name,
        phone: updates.phone ?? existingContact.phone,
        metadata: updates.metadata ?? existingContact.metadata,
        created_at: existingContact.created_at,
        updated_at: new Date().toISOString()
      }

      // Delete old record and insert new one in a transaction
      const { error: deleteError } = await supabase
        .from('ebook_contacts')
        .delete()
        .eq('email', currentEmail)

      if (deleteError) {
        console.error('[Update Ebook Contact] Delete error:', deleteError)
        return NextResponse.json(
          { error: 'Failed to delete old contact record' },
          { status: 500 }
        )
      }

      const { data: newContact, error: insertError } = await supabase
        .from('ebook_contacts')
        .insert(newContactData)
        .select()
        .single()

      if (insertError) {
        console.error('[Update Ebook Contact] Insert error:', insertError)
        // Try to restore the old record
        await supabase.from('ebook_contacts').insert(existingContact)
        return NextResponse.json(
          { error: 'Failed to create new contact record' },
          { status: 500 }
        )
      }

      console.log(`[Update Ebook Contact] Email successfully changed from ${currentEmail} to ${updates.email}`)
      
      return NextResponse.json({
        success: true,
        message: 'Ebook contact email updated successfully',
        contact: newContact,
        changes: {
          old_email: currentEmail,
          new_email: updates.email,
          other_updates: Object.keys(updates).filter(key => key !== 'email')
        }
      })
    }

    // Handle non-email updates
    if (updates.first_name !== undefined) {
      updateData.first_name = updates.first_name
    }
    if (updates.last_name !== undefined) {
      updateData.last_name = updates.last_name
    }
    if (updates.phone !== undefined) {
      updateData.phone = updates.phone
    }
    if (updates.metadata !== undefined) {
      updateData.metadata = updates.metadata
    }

    // Perform the update
    const { data: updatedContact, error: updateError } = await supabase
      .from('ebook_contacts')
      .update(updateData)
      .eq('email', currentEmail)
      .select()
      .single()

    if (updateError) {
      console.error('[Update Ebook Contact] Update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update ebook contact' },
        { status: 500 }
      )
    }

    console.log(`[Update Ebook Contact] Successfully updated contact for ${currentEmail}`)

    return NextResponse.json({
      success: true,
      message: 'Ebook contact updated successfully',
      contact: updatedContact,
      changes: Object.keys(updates)
    })

  } catch (error) {
    console.error('[Update Ebook Contact] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Only allow POST method
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
} 