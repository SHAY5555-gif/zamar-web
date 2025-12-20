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

// GET - Fetch all setlists from all users (admin only)
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");

    if (!await verifyAdmin(authHeader)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch all setlists from backend
    const response = await fetch(`${API_URL}/api/admin/all-setlists`, {
      headers: { Authorization: authHeader! },
    });

    if (!response.ok) {
      // If backend doesn't support this endpoint yet, return empty array
      return NextResponse.json([]);
    }

    const setlists = await response.json();
    return NextResponse.json(setlists);
  } catch (error) {
    console.error("Error fetching all setlists:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
