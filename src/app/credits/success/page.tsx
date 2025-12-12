"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [credits, setCredits] = useState<number | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setStatus("error");
      return;
    }

    // Verify the payment and get credits amount
    const verifyPayment = async () => {
      try {
        const response = await fetch(`/api/stripe/verify?session_id=${sessionId}`);

        if (!response.ok) {
          throw new Error("Failed to verify payment");
        }

        const data = await response.json();
        setCredits(data.credits_amount);
        setStatus("success");
      } catch {
        // Even if verification fails, the webhook will handle the credits
        // Show success anyway after a brief delay
        setTimeout(() => {
          setStatus("success");
        }, 2000);
      }
    };

    verifyPayment();
  }, [sessionId]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">מאמת את התשלום...</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="text-red-500 text-5xl mb-4">!</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">שגיאה</h1>
          <p className="text-gray-600 mb-8">
            משהו השתבש בתהליך התשלום. אם חויבת, הקרדיטים יתווספו בקרוב.
          </p>
          <Link
            href="/dashboard"
            className="inline-block bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            חזרה לדשבורד
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
        <div className="text-green-500 text-6xl mb-4">V</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          התשלום הושלם בהצלחה!
        </h1>
        {credits && (
          <p className="text-xl text-indigo-600 font-bold mb-4">
            {credits.toLocaleString()} קרדיטים נוספו לחשבונך
          </p>
        )}
        <p className="text-gray-600 mb-8">
          הקרדיטים כבר זמינים בחשבונך. תודה על הרכישה!
        </p>
        <div className="flex flex-col gap-4">
          <Link
            href="/dashboard"
            className="bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            חזרה לדשבורד
          </Link>
          <Link
            href="/credits"
            className="text-indigo-600 hover:underline"
          >
            רכישת קרדיטים נוספים
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
