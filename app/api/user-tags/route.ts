// app/api/user-tags/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getUserTags, getUsersByTag, assignTagsToUsers, removeTagsFromUsers } from '@/lib/supabase/data-access/tags';

// GET /api/user-tags?userId=... OR ?tagId=... (with pagination)
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');
    const tagId = url.searchParams.get('tagId');
    const limit = parseInt(url.searchParams.get('limit') || '1000', 10);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);
    if (userId) {
      const tags = await getUserTags(userId);
      return NextResponse.json(tags);
    } else if (tagId) {
      const users = await getUsersByTag(tagId, { limit, offset });
      return NextResponse.json(users);
    } else {
      return NextResponse.json({ error: 'Missing userId or tagId param' }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

// POST /api/user-tags (assign tags to users in batch)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tagIds, userIds } = body;
    if (!Array.isArray(tagIds) || !Array.isArray(userIds)) {
      return NextResponse.json({ error: 'tagIds and userIds must be arrays' }, { status: 400 });
    }
    await assignTagsToUsers({ tagIds, userIds });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

// DELETE /api/user-tags (remove tags from users in batch)
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { tagIds, userIds } = body;
    if (!Array.isArray(tagIds) || !Array.isArray(userIds)) {
      return NextResponse.json({ error: 'tagIds and userIds must be arrays' }, { status: 400 });
    }
    await removeTagsFromUsers({ tagIds, userIds });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
