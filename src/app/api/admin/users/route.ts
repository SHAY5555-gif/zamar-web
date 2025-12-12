import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const ADMIN_EMAIL = "yeshayaavitan@gmail.com";

// GET - Fetch all users (admin only)
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");

    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // First verify the requester is the admin
    const meResponse = await fetch(`${API_URL}/api/auth/me`, {
      headers: { Authorization: authHeader },
    });

    if (!meResponse.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const meData = await meResponse.json();

    if (meData.user?.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Forbidden - Admin access only" }, { status: 403 });
    }

    // Fetch all users from backend
    const usersResponse = await fetch(`${API_URL}/api/admin/users`, {
      headers: { Authorization: authHeader },
    });

    if (!usersResponse.ok) {
      // If backend doesn't have admin endpoint, return empty array
      // This might need backend implementation
      return NextResponse.json([]);
    }

    const users = await usersResponse.json();
    return NextResponse.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
