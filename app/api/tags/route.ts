// app/api/tags/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getTags, createTag, updateTag, deleteTag } from '@/lib/supabase/data-access/tags';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const typeId = url.searchParams.get('typeId') || undefined;
    const tags = await getTags({ typeId });
    return NextResponse.json(tags);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const tag = await createTag(body);
    return NextResponse.json(tag, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...patch } = body;
    if (!id) return NextResponse.json({ error: 'Missing tag id' }, { status: 400 });
    const tag = await updateTag(id, patch);
    return NextResponse.json(tag);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing tag id' }, { status: 400 });
    await deleteTag(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
