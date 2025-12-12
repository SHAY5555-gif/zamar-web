import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 }
      );
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        const userId = session.metadata?.user_id;
        const creditsAmount = session.metadata?.credits_amount;

        if (!userId || !creditsAmount) {
          console.error("Missing metadata in checkout session:", session.id);
          break;
        }

        // Call backend API to add credits
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/stripe/add-credits`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-webhook-secret": process.env.STRIPE_WEBHOOK_SECRET!,
            },
            body: JSON.stringify({
              user_id: userId,
              credits_amount: parseInt(creditsAmount),
              stripe_session_id: session.id,
              stripe_payment_intent_id: session.payment_intent,
            }),
          }
        );

        if (!response.ok) {
          console.error("Failed to add credits:", await response.text());
        } else {
          console.log(`Added ${creditsAmount} credits to user ${userId}`);
        }
        break;
      }

      case "setup_intent.succeeded": {
        // Payment method saved successfully
        const setupIntent = event.data.object as Stripe.SetupIntent;
        console.log(
          `SetupIntent succeeded: ${setupIntent.id} for customer ${setupIntent.customer}`
        );
        // The frontend will call /api/stripe/confirm-setup to finalize
        break;
      }

      case "payment_intent.succeeded": {
        // Handle successful payments (including auto-reload)
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const metadata = paymentIntent.metadata;

        if (metadata?.type === "auto_reload" || metadata?.type === "manual_reload") {
          console.log(
            `Reload payment succeeded: ${paymentIntent.id} for user ${metadata.user_id}`
          );
          // Note: Auto-reload transactions are already created in the backend
          // This webhook is just for logging/monitoring
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const metadata = paymentIntent.metadata;

        console.error(
          `Payment failed: ${paymentIntent.id}`,
          paymentIntent.last_payment_error?.message
        );

        if (metadata?.type === "auto_reload") {
          console.error(
            `Auto-reload failed for user ${metadata.user_id}:`,
            paymentIntent.last_payment_error?.message
          );
          // Note: Auto-reload failure is already handled in the backend service
        }
        break;
      }

      case "payment_method.detached": {
        // Card was removed (possibly externally)
        const paymentMethod = event.data.object as Stripe.PaymentMethod;
        console.log(
          `Payment method detached: ${paymentMethod.id} from customer ${paymentMethod.customer}`
        );
        // Note: If this was the default payment method, the delete endpoint
        // in the backend already handles disabling auto-reload
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
