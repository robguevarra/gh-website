// app/api/user-tags/route.ts
import { NextRequest, NextResponse } from 'next/server';
import * as tags from '@/lib/supabase/data-access/tags';

// GET: /api/user-tags?userId=... or /api/user-tags?tagId=...
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  const tagId = searchParams.get('tagId');
  try {
    if (userId) {
      const data = await tags.getTagsForUser(userId);
      return NextResponse.json({ data });
    } else if (tagId) {
      // Supports batching for large userbases
      const limit = Number(searchParams.get('limit')) || 1000;
      const offset = Number(searchParams.get('offset')) || 0;
      const data = await tags.getUsersForTag(tagId, limit, offset);
      return NextResponse.json({ data });
    } else {
      return NextResponse.json({ error: 'Missing userId or tagId' }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// POST: assign tags to users (batch)
export async function POST(req: NextRequest) {
  try {
    const { tagIds, userIds } = await req.json();
    await tags.assignTagsToUsers({ tagIds, userIds });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 400 });
  }
}

// DELETE: remove tags from users (batch)
export async function DELETE(req: NextRequest) {
  try {
    const { tagIds, userIds } = await req.json();
    await tags.removeTagsFromUsers({ tagIds, userIds });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 400 });
  }
}
