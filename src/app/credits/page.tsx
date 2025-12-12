"use client";

import { useState, useEffect } from "react";
import { getToken, getAuthHeaders, getCurrentUser, AuthUser } from "@/lib/auth";

// Predefined reload amounts in dollars
const RELOAD_AMOUNTS = [5, 10, 25, 50, 100];

interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  is_default: boolean;
}

export default function CreditsPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedAmount, setSelectedAmount] = useState(10);
  const [customAmount, setCustomAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!getToken()) {
      window.location.href = "/auth/login";
      return;
    }

    loadData();
  }, []);

  const loadData = async () => {
    setPageLoading(true);
    try {
      const [userData, methodsRes] = await Promise.all([
        getCurrentUser(),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/stripe/payment-methods`, {
          headers: getAuthHeaders(),
        }),
      ]);

      setUser(userData);

      if (methodsRes.ok) {
        const data = await methodsRes.json();
        setPaymentMethods(data.payment_methods || []);
      }
    } catch (err) {
      console.error("Error loading data:", err);
    } finally {
      setPageLoading(false);
    }
  };

  const handleReload = async () => {
    const amount = customAmount ? parseFloat(customAmount) : selectedAmount;

    if (isNaN(amount) || amount < 5) {
      setError("Minimum reload amount is $5");
      return;
    }

    if (paymentMethods.length === 0) {
      setError("Please add a payment method first");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/stripe/reload`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          body: JSON.stringify({ amount }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Payment failed");
      }

      setSuccess(`Successfully added $${amount.toFixed(2)} to your balance!`);
      setUser((prev) =>
        prev
          ? {
              ...prev,
              credits: { count: data.new_balance, last_updated: new Date().toISOString() },
            }
          : null
      );
      setCustomAmount("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setLoading(false);
    }
  };

  const currentBalance = (user?.credits?.count || 0) / 100;
  const defaultCard = paymentMethods.find((pm) => pm.is_default);

  if (pageLoading) {
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
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            הטענת יתרה
          </h1>
          <p className="text-gray-600">
            היתרה משמשת לייבוא שירים באמצעות AI ותכונות פרימיום נוספות
          </p>
        </div>

        {/* Current Balance Card */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between">
            <a
              href="/billing"
              className="text-indigo-600 hover:text-indigo-800 text-sm"
            >
              הגדרות חיוב →
            </a>
            <div className="text-right">
              <p className="text-gray-500 text-sm">יתרה נוכחית</p>
              <p className="text-4xl font-bold text-indigo-600">
                ${currentBalance.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-right">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6 text-right">
            {success}
          </div>
        )}

        {/* Reload Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6 text-right">
            הוספת יתרה
          </h2>

          {/* Amount Selection */}
          <div className="mb-6">
            <p className="text-gray-600 mb-3 text-right">בחר סכום:</p>
            <div className="grid grid-cols-5 gap-2 mb-4">
              {RELOAD_AMOUNTS.map((amount) => (
                <button
                  key={amount}
                  onClick={() => {
                    setSelectedAmount(amount);
                    setCustomAmount("");
                  }}
                  className={`py-3 px-4 rounded-lg border-2 font-bold transition-colors ${
                    selectedAmount === amount && !customAmount
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                      : "border-gray-200 hover:border-indigo-300"
                  }`}
                >
                  ${amount}
                </button>
              ))}
            </div>

            {/* Custom Amount */}
            <div className="flex items-center gap-3">
              <span className="text-gray-500">או סכום אחר:</span>
              <div className="relative flex-1">
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  $
                </span>
                <input
                  type="number"
                  min="5"
                  step="0.01"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder="סכום (מינימום $5)"
                  className="w-full pr-8 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-right"
                />
              </div>
            </div>
          </div>

          {/* Payment Method Info */}
          <div className="mb-6">
            {paymentMethods.length === 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg text-right">
                <p className="text-yellow-800 mb-2">
                  לא נמצא אמצעי תשלום שמור
                </p>
                <a
                  href="/billing"
                  className="text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  הוסף כרטיס אשראי →
                </a>
              </div>
            ) : defaultCard ? (
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <a
                  href="/billing"
                  className="text-indigo-600 hover:text-indigo-800 text-sm"
                >
                  שנה
                </a>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">
                    {defaultCard.brand.toUpperCase()} ****{defaultCard.last4}
                  </span>
                  <span className="text-gray-400">💳</span>
                </div>
              </div>
            ) : null}
          </div>

          {/* Reload Button */}
          <button
            onClick={handleReload}
            disabled={loading || paymentMethods.length === 0}
            className="w-full bg-indigo-600 text-white font-bold py-4 px-6 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg"
          >
            {loading
              ? "מעבד..."
              : `הטען $${customAmount || selectedAmount}`}
          </button>
        </div>

        {/* Info Section */}
        <div className="text-center text-gray-500 text-sm space-y-1">
          <p>התשלום מאובטח באמצעות Stripe</p>
          <p>היתרה תתווסף מיד לאחר התשלום</p>
          <p>מינימום הטענה: $5</p>
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
