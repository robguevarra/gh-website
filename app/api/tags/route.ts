// app/api/tags/route.ts
import { NextRequest, NextResponse } from 'next/server';
import * as tags from '@/lib/supabase/data-access/tags';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  try {
    const paramsForGetTags: { typeId?: string; parentId?: string | null } = {};

    const typeId = searchParams.get('typeId');
    if (typeId) {
      paramsForGetTags.typeId = typeId;
    }

    if (searchParams.has('parentId')) {
      const rawParentId = searchParams.get('parentId');
      paramsForGetTags.parentId = rawParentId === '' ? null : rawParentId; 
    } else {
      // If parentId is not in searchParams, parentId property will not be set on paramsForGetTags,
      // which means getTags will receive it as undefined (due to optional chaining or direct access to non-existent prop).
      // This aligns with GetTagsParams where parentId can be undefined.
    }
        
    const data = await tags.getTags(paramsForGetTags);
    return NextResponse.json({ data });
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.error('API Error in GET /api/tags:', errorMessage);
    return NextResponse.json({ error: `Failed to fetch tags: ${errorMessage}` }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = await tags.createTag(body);
    return NextResponse.json({ data });
  } catch (e) {
    let errorMessage = "An unknown error occurred";
    let errorDetails = {};
    if (e instanceof Error) {
      errorMessage = e.message;
      // Capture additional properties if they exist, like Supabase errors
      errorDetails = { ...e, stack: e.stack }; 
    } else if (typeof e === 'object' && e !== null) {
      errorMessage = JSON.stringify(e); // Fallback for non-Error objects
      errorDetails = { ...e };
    } else {
      errorMessage = String(e);
    }
    console.error('API Error in POST /api/tags:', errorMessage, 'Details:', errorDetails);
    return NextResponse.json({ error: `Failed to create tag: ${errorMessage}` }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, ...updates } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "Tag ID is required for updates." }, { status: 400 });
    }
    const data = await tags.updateTag(id, updates);
    return NextResponse.json({ data });
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.error('API Error in PATCH /api/tags:', errorMessage);
    return NextResponse.json({ error: `Failed to update tag: ${errorMessage}` }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "Tag ID is required for deletion." }, { status: 400 });
    }
    await tags.deleteTag(id);
    return NextResponse.json({ success: true });
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.error('API Error in DELETE /api/tags:', errorMessage);
    return NextResponse.json({ error: `Failed to delete tag: ${errorMessage}` }, { status: 400 });
  }
}
