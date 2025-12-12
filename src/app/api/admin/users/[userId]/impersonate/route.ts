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

// POST - Generate impersonation token for a specific user (admin only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const { userId } = await params;

    if (!await verifyAdmin(authHeader)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const response = await fetch(`${API_URL}/api/admin/users/${userId}/impersonate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader!,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error creating impersonation token:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
