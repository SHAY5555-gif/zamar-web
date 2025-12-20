import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const ADMIN_EMAIL = "yeshayaavitan@gmail.com";

async function verifyAdmin(authHeader: string | null): Promise<boolean> {
  if (!authHeader) return false;

  try {
    const meResponse = await fetch(`${API_URL}/api/auth/me`, {
      headers: { Authorization: authHeader },
    });

    if (!meResponse.ok) return false;

    const meData = await meResponse.json();
    return meData.user?.email === ADMIN_EMAIL;
  } catch {
    return false;
  }
}

// POST - Assign (copy) a song to a specific user (admin only)
// This creates a duplicate of the song for the target user
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");

    if (!await verifyAdmin(authHeader)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { songId, targetUserId } = body;

    if (!songId || !targetUserId) {
      return NextResponse.json(
        { error: "songId and targetUserId are required" },
        { status: 400 }
      );
    }

    // Call backend to assign song (backend will copy the song to target user)
    const response = await fetch(`${API_URL}/api/admin/assign-song`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader!,
      },
      body: JSON.stringify({ songId, targetUserId }),
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error assigning song:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
