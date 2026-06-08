import { useState } from "react";
import { useSession } from "@/contexts/SessionContext";
import { Server, Lock, Mail, AlertTriangle, Eye, EyeOff } from "lucide-react";

export default function Login() {
  const { login } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setError("");
    setLoading(true);
    const ok = await login(email.trim(), password);
    if (!ok) setError("Invalid email or password. Please try again.");
    setLoading(false);
  };

  return (
    <div
      className="min-h-screen flex"
      style={{ background: "#f4f5f7", fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif' }}
    >
      {/* Left accent panel */}
      <div
        className="hidden lg:flex lg:w-[420px] flex-col justify-between p-12"
        style={{ background: "#0f172a" }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-[#3b82f6] flex items-center justify-center">
            <Server className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-white tracking-tight text-base">DeployDash</span>
        </div>

        <div>
          <blockquote className="text-slate-300 text-lg leading-relaxed mb-6">
            "DeployDash gives our team the confidence to ship — every step tracked, every release audited."
          </blockquote>
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold text-white"
              style={{ background: "linear-gradient(135deg, #3b82f6, #1e2a42)" }}
            >
              SL
            </div>
            <div>
              <div className="text-white text-sm font-medium">Sarah Lin</div>
              <div className="text-slate-500 text-xs">VP Engineering, Climagro</div>
            </div>
          </div>
        </div>

        <div className="flex gap-6 text-xs text-slate-600">
          <span>Privacy Policy</span>
          <span>Terms of Service</span>
          <span>Support</span>
        </div>
      </div>

      {/* Right login panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2.5 mb-10">
            <div className="w-7 h-7 rounded-md bg-[#3b82f6] flex items-center justify-center">
              <Server className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-slate-900 tracking-tight">DeployDash</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mb-1">Welcome back</h1>
            <p className="text-sm text-slate-500">Sign in to your DeployDash account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="login-email" className="text-sm font-medium text-slate-700 block">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  id="login-email"
                  type="email"
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#3b82f6] focus:border-transparent shadow-sm transition-all"
                  placeholder="you@company.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="login-password" className="text-sm font-medium text-slate-700 block">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  className="w-full pl-9 pr-10 py-2.5 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#3b82f6] focus:border-transparent shadow-sm transition-all"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 px-3 py-2.5 rounded-lg">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!email.trim() || !password || loading}
              className="w-full py-2.5 px-4 text-sm font-medium rounded-lg transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-[#3b82f6] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: "#0f172a", color: "white" }}
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-200">
            <p className="text-xs text-slate-400 mb-2">Default credentials (first run)</p>
            <div className="bg-white border border-slate-200 rounded-lg px-4 py-3 text-xs font-mono text-slate-600 space-y-1 shadow-sm">
              <div><span className="text-slate-400">email: </span>admin@deploydash.local</div>
              <div><span className="text-slate-400">pass: &nbsp;</span>admin123</div>
            </div>
          </div>

          <p className="text-xs text-slate-400 text-center mt-6">
            Contact your administrator to request access
          </p>
        </div>
      </div>
    </div>
  );
}
