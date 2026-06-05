import { Inter } from "next/font/google";
import Image from "next/image";
import LoginForm from "./login-form";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata = {
  title: "Login | Nuanu HR Recruitment ATS",
  description: "Secure sign-in to Nuanu HR Platform",
};

export default function LoginPage() {
  return (
    <main
      className={`${inter.className} relative min-h-screen w-full flex items-center justify-center bg-[#0f172a] overflow-hidden`}
    >
      {/* Background Decor - CSS based to avoid image load delays */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-nuanu-green/10 blur-[120px]" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] rounded-full bg-nuanu-navy/20 blur-[120px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center w-full max-w-md px-4">
        {/* Logo - Priority loading to fix LCP */}
        <div className="mb-8 flex flex-col items-center animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="relative w-20 h-20 mb-4 rounded-3xl bg-white shadow-2xl overflow-hidden">
            <Image
              src="/logo.png"
              alt="Nuanu Logo"
              fill
              priority
              className="object-contain p-2"
              sizes="80px"
            />
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">
            Nuanu
          </h1>
          <p className="text-nuanu-gray-400 text-sm uppercase tracking-widest mt-1">
            HR Recruitment ATS
          </p>
        </div>

        {/* Login Form - Client Component isolated here */}
        <div className="w-full animate-in fade-in zoom-in-95 duration-700 delay-150">
          <LoginForm />
        </div>

        <footer className="mt-8 text-nuanu-gray-500 text-xs text-center">
          © 2026 Nuanu - Enterprise HR Platform
        </footer>
      </div>
    </main>
  );
}
