import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');

export async function POST(request: NextRequest) {
  try {
    const { price_id, credits_amount } = await request.json();

    // Get auth token from Authorization header
    const authHeader = request.headers.get("Authorization");
    const authToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!authToken) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    // Verify token and get user info from backend
    const userResponse = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/auth/me`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    if (!userResponse.ok) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const userData = await userResponse.json();
    const user = userData.user;

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer_email: user.email,
      payment_method_types: ["card"],
      line_items: [
        {
          price: price_id,
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_WEB_URL}/credits/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_WEB_URL}/credits`,
      metadata: {
        user_id: user._id || user.id,
        credits_amount: credits_amount.toString(),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: "שגיאה ביצירת ההזמנה" },
      { status: 500 }
    );
  }
}
