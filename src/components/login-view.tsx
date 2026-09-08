import { useState } from "react"
import { useAuth } from "../lib/auth"
import { Lock, User, AlertCircle, ArrowRight, Loader2 } from "lucide-react"

export function LoginView() {
  const { login } = useAuth()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!username.trim()) {
      setError("Khawngaihin Username chhu lut rawh.")
      return
    }
    if (!password) {
      setError("Khawngaihin Password chhu lut rawh.")
      return
    }

    setIsSubmitting(true)
    const res = login(username, password)
    setIsSubmitting(false)

    if (!res.success) {
      setError(res.error || "Login theih a ni lo.")
    }
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-4 bg-muted/30">
      <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        {/* Card Header */}
        <div className="p-6 pb-4 text-center border-b border-border/50">
          <div className="inline-flex h-12 w-12 rounded-xl bg-primary text-primary-foreground items-center justify-center font-bold text-lg shadow-sm mb-3">
            MZ
          </div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Government of Mizoram
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Loan &amp; Advance Incumbency Portal
          </p>
        </div>

        {/* Card Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1">
            <h3 className="text-sm font-medium text-foreground">Sign In</h3>
            <p className="text-xs text-muted-foreground">
              Chhunzawm turin i account details chhu lut rawh le.
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 text-xs rounded-lg border border-destructive/20 bg-destructive/10 text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Username Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground block">
              Username
            </label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. admin1"
                className="w-full h-9 pl-9 pr-3 rounded-md border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                autoFocus
                autoComplete="username"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground block">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••"
                className="w-full h-9 pl-9 pr-3 rounded-md border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                autoComplete="current-password"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-9 mt-2 flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Checking...</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* Card Footer Note */}
        <div className="px-6 py-3 bg-muted/40 border-t border-border/50 text-center">
          <p className="text-[11px] text-muted-foreground">
            Authorised personnel only (admin1 - admin4)
          </p>
        </div>
      </div>
    </div>
  )
}
