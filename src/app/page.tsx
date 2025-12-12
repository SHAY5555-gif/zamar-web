import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-600 to-indigo-800">
      <main className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center text-white mb-16">
          <h1 className="text-5xl font-bold mb-6">Zamar</h1>
          <p className="text-2xl mb-8">ניהול הופעות חכם למוזיקאים</p>
          <p className="text-lg text-indigo-200 max-w-2xl mx-auto">
            נהלו את השירים שלכם, צרו רשימות הופעות והציגו מילים בזמן אמת במהלך
            ההופעה
          </p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white/10 backdrop-blur rounded-xl p-6 text-white">
            <div className="text-3xl mb-4">📚</div>
            <h3 className="text-xl font-bold mb-2">ספריית שירים</h3>
            <p className="text-indigo-200">
              שמרו את כל השירים שלכם במקום אחד עם תמיכה מלאה בעברית וערבית
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-xl p-6 text-white">
            <div className="text-3xl mb-4">📋</div>
            <h3 className="text-xl font-bold mb-2">רשימות הופעות</h3>
            <p className="text-indigo-200">
              צרו וארגנו רשימות שירים להופעות שלכם בקלות ובמהירות
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-xl p-6 text-white">
            <div className="text-3xl mb-4">🎤</div>
            <h3 className="text-xl font-bold mb-2">מצב הופעה</h3>
            <p className="text-indigo-200">
              הציגו מילים במסך מלא והעבירו בין שירים בלחיצה אחת
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/login"
              className="bg-white text-indigo-600 font-bold py-3 px-8 rounded-full hover:bg-indigo-100 transition-colors"
            >
              התחברות
            </Link>
            <Link
              href="/auth/register"
              className="bg-transparent border-2 border-white text-white font-bold py-3 px-8 rounded-full hover:bg-white/10 transition-colors"
            >
              הרשמה
            </Link>
          </div>
          <p className="text-indigo-200 mt-8">
            יש לכם כבר את האפליקציה?{" "}
            <a
              href="https://apps.apple.com/app/zamar"
              className="underline hover:text-white"
            >
              הורידו מה-App Store
            </a>
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-indigo-900 text-indigo-200 py-8">
        <div className="container mx-auto px-4 text-center">
          <p>Zamar - ניהול הופעות חכם</p>
          <div className="flex justify-center gap-4 mt-4">
            <Link href="/privacy" className="hover:text-white">
              מדיניות פרטיות
            </Link>
            <Link href="/terms" className="hover:text-white">
              תנאי שימוש
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
