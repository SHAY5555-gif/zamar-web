"use client";

import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { getToken, getAuthHeaders, getCurrentUser, AuthUser } from "@/lib/auth";

// Load Stripe
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
  is_default: boolean;
}

interface AutoReloadSettings {
  enabled: boolean;
  threshold: number;
  reload_amount: number;
  has_payment_method: boolean;
  last_reload_at: string | null;
  failed_attempts: number;
  paused_until: string | null;
}

// Add Card Form Component
function AddCardForm({
  clientSecret,
  onSuccess,
  onCancel,
}: {
  clientSecret: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setLoading(true);
    setError("");

    try {
      const { error: submitError, setupIntent } = await stripe.confirmSetup({
        elements,
        redirect: "if_required",
      });

      if (submitError) {
        setError(submitError.message || "Error saving card");
        return;
      }

      if (setupIntent?.status === "succeeded") {
        // Confirm setup on backend
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/stripe/confirm-setup`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...getAuthHeaders(),
            },
            body: JSON.stringify({
              setup_intent_id: setupIntent.id,
              payment_method_id: setupIntent.payment_method,
            }),
          }
        );

        if (!response.ok) {
          throw new Error("Failed to save card");
        }

        onSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error saving card");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />

      {error && (
        <div className="text-red-600 text-sm bg-red-50 p-3 rounded">{error}</div>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={!stripe || loading}
          className="flex-1 bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          {loading ? "שומר..." : "שמור כרטיס"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          ביטול
        </button>
      </div>
    </form>
  );
}

// Main Billing Page Component
export default function BillingPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [autoReload, setAutoReload] = useState<AutoReloadSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddCard, setShowAddCard] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [deletingCard, setDeletingCard] = useState<string | null>(null);
  const [savingAutoReload, setSavingAutoReload] = useState(false);

  // Check auth and load data
  useEffect(() => {
    if (!getToken()) {
      window.location.href = "/auth/login";
      return;
    }

    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [userData, methodsRes, autoReloadRes] = await Promise.all([
        getCurrentUser(),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/stripe/payment-methods`, {
          headers: getAuthHeaders(),
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/stripe/auto-reload`, {
          headers: getAuthHeaders(),
        }),
      ]);

      setUser(userData);

      if (methodsRes.ok) {
        const data = await methodsRes.json();
        setPaymentMethods(data.payment_methods || []);
      }

      if (autoReloadRes.ok) {
        const data = await autoReloadRes.json();
        setAutoReload(data);
      }
    } catch (err) {
      setError("Error loading data");
    } finally {
      setLoading(false);
    }
  };

  const handleAddCard = async () => {
    try {
      setError("");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/stripe/setup-intent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to create setup intent");
      }

      const data = await response.json();
      setClientSecret(data.client_secret);
      setShowAddCard(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error adding card");
    }
  };

  const handleCardSaved = () => {
    setShowAddCard(false);
    setClientSecret(null);
    loadData();
  };

  const handleDeleteCard = async (paymentMethodId: string) => {
    if (!confirm("Are you sure you want to remove this card?")) return;

    setDeletingCard(paymentMethodId);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/stripe/payment-methods/${paymentMethodId}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete card");
      }

      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error deleting card");
    } finally {
      setDeletingCard(null);
    }
  };

  const handleAutoReloadToggle = async () => {
    if (!autoReload) return;

    const newEnabled = !autoReload.enabled;

    // Cannot enable without payment method
    if (newEnabled && paymentMethods.length === 0) {
      setError("Please add a card before enabling auto-reload");
      return;
    }

    setSavingAutoReload(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/stripe/auto-reload`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          body: JSON.stringify({ enabled: newEnabled }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update auto-reload");
      }

      const data = await response.json();
      setAutoReload((prev) => (prev ? { ...prev, enabled: data.enabled } : null));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error updating settings");
    } finally {
      setSavingAutoReload(false);
    }
  };

  const getBrandIcon = (brand: string) => {
    const icons: Record<string, string> = {
      visa: "💳",
      mastercard: "💳",
      amex: "💳",
      discover: "💳",
    };
    return icons[brand] || "💳";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 text-right">
            הגדרות חיוב
          </h1>
          <p className="text-gray-600 text-right mt-2">
            ניהול אמצעי תשלום והטענה אוטומטית
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-right">
            {error}
            <button
              onClick={() => setError("")}
              className="float-left text-red-500 hover:text-red-700"
            >
              ✕
            </button>
          </div>
        )}

        {/* Current Balance */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 text-right">
            יתרה
          </h2>
          <div className="text-4xl font-bold text-indigo-600 text-right">
            ${((user?.credits?.count || 0) / 100).toFixed(2)}
          </div>
          <a
            href="/credits"
            className="inline-block mt-4 text-indigo-600 hover:text-indigo-800"
          >
            הטענת יתרה →
          </a>
        </div>

        {/* Payment Methods */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={handleAddCard}
              className="text-indigo-600 hover:text-indigo-800 font-medium"
            >
              + הוספת כרטיס
            </button>
            <h2 className="text-xl font-bold text-gray-900">אמצעי תשלום</h2>
          </div>

          {/* Add Card Form */}
          {showAddCard && clientSecret && (
            <div className="mb-6 p-4 border border-gray-200 rounded-lg">
              <h3 className="font-bold text-gray-900 mb-4 text-right">
                הוספת כרטיס חדש
              </h3>
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret,
                  appearance: {
                    theme: "stripe",
                    variables: {
                      colorPrimary: "#4f46e5",
                    },
                  },
                }}
              >
                <AddCardForm
                  clientSecret={clientSecret}
                  onSuccess={handleCardSaved}
                  onCancel={() => {
                    setShowAddCard(false);
                    setClientSecret(null);
                  }}
                />
              </Elements>
            </div>
          )}

          {/* Payment Methods List */}
          {paymentMethods.length === 0 ? (
            <p className="text-gray-500 text-right">
              לא נמצאו אמצעי תשלום שמורים
            </p>
          ) : (
            <div className="space-y-3">
              {paymentMethods.map((pm) => (
                <div
                  key={pm.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                >
                  <button
                    onClick={() => handleDeleteCard(pm.id)}
                    disabled={deletingCard === pm.id}
                    className="text-red-600 hover:text-red-800 text-sm disabled:opacity-50"
                  >
                    {deletingCard === pm.id ? "מוחק..." : "הסר"}
                  </button>
                  <div className="flex items-center gap-3">
                    {pm.is_default && (
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                        ברירת מחדל
                      </span>
                    )}
                    <div className="text-right">
                      <div className="font-medium text-gray-900">
                        {getBrandIcon(pm.brand)} {pm.brand.toUpperCase()} ****
                        {pm.last4}
                      </div>
                      <div className="text-sm text-gray-500">
                        תוקף: {pm.exp_month}/{pm.exp_year}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Auto-Reload Settings */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 text-right">
            הטענה אוטומטית
          </h2>

          <div className="flex items-center justify-between mb-4">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoReload?.enabled || false}
                onChange={handleAutoReloadToggle}
                disabled={savingAutoReload}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
            <span className="text-gray-700">הפעל הטענה אוטומטית</span>
          </div>

          {autoReload?.enabled && (
            <div className="bg-gray-50 p-4 rounded-lg text-right">
              <p className="text-gray-600 mb-2">
                כאשר היתרה יורדת ל-
                <span className="font-bold">${autoReload.threshold}</span>, יחויב
                אוטומטית סכום של{" "}
                <span className="font-bold">${autoReload.reload_amount}</span>
              </p>

              {autoReload.last_reload_at && (
                <p className="text-sm text-gray-500">
                  הטענה אחרונה:{" "}
                  {new Date(autoReload.last_reload_at).toLocaleDateString("he-IL")}
                </p>
              )}

              {autoReload.failed_attempts > 0 && (
                <p className="text-sm text-red-600 mt-2">
                  ניסיונות נכשלים: {autoReload.failed_attempts}/3
                </p>
              )}

              {autoReload.paused_until && (
                <p className="text-sm text-orange-600 mt-2">
                  הטענה אוטומטית מושהית עד:{" "}
                  {new Date(autoReload.paused_until).toLocaleDateString("he-IL")}
                </p>
              )}
            </div>
          )}

          {!autoReload?.enabled && paymentMethods.length === 0 && (
            <p className="text-gray-500 text-right text-sm">
              יש להוסיף כרטיס לפני הפעלת הטענה אוטומטית
            </p>
          )}
        </div>

        {/* Back to Dashboard */}
        <div className="mt-8 text-center">
          <a
            href="/dashboard"
            className="text-indigo-600 hover:text-indigo-800"
          >
            ← חזרה לדשבורד
          </a>
        </div>
      </div>
    </div>
  );
}
