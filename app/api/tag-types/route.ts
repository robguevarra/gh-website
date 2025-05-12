// app/api/tag-types/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getTagTypes, createTagType, updateTagType, deleteTagType } from '@/lib/supabase/data-access/tags';

export async function GET() {
  try {
    const types = await getTagTypes();
    return NextResponse.json(types);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const type = await createTagType(body);
    return NextResponse.json(type, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...patch } = body;
    if (!id) return NextResponse.json({ error: 'Missing tag type id' }, { status: 400 });
    const type = await updateTagType(id, patch);
    return NextResponse.json(type);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing tag type id' }, { status: 400 });
    await deleteTagType(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
