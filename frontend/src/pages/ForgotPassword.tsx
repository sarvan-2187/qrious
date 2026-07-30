import { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess('Password reset link sent! Check your inbox (and spam folder) if you don\'t see it.');
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex">
      {/* Left Column - Image & Branding */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 relative overflow-hidden bg-black text-white">
        <div className="absolute inset-0 z-0">
          <img 
            src="/bloch_sphere.png" 
            alt="Quantum Bloch Sphere" 
            className="w-full h-full object-cover opacity-90 mix-blend-screen"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
          <div className="absolute inset-0 bg-emerald-900/20 mix-blend-overlay"></div>
        </div>
        
        <div className="relative z-10">
          <Link to="/" className="flex items-center gap-3 text-2xl font-sans">
            <img src="/apple-touch-icon.png" alt="Qrious Logo" className="w-10 h-10 rounded-full" />
            Qrious
          </Link>
        </div>

        <div className="relative z-10 max-w-lg mt-auto">
          <h2 className="text-5xl font-sans leading-tight mb-6">
            Recover your access.
          </h2>
          <p className="text-lg text-white/80">
            Don't worry, we'll help you get back to building quantum circuits in no time.
          </p>
        </div>
      </div>

      {/* Right Column - Forgot Password Panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="text-center">
            <h1 className="text-4xl font-sans tracking-tight mb-2">Reset Password</h1>
            <p className="text-muted-foreground text-lg">
              Enter your email to receive a reset link
            </p>
          </div>

          <form onSubmit={handleResetPassword} className="space-y-4 mt-8">
            {error && (
              <div className="p-3 rounded-md bg-destructive/15 text-destructive text-sm font-medium">
                {error}
              </div>
            )}

            {success && (
              <div className="p-3 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-sm font-medium border border-emerald-500/20">
                {success}
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email"
                type="email" 
                placeholder="you@example.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12"
              />
            </div>

            <Button type="submit" className="w-full h-12 text-lg mt-6" disabled={loading || !!success}>
              {loading ? "Sending..." : "Send reset link"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-8">
            Remember your password?{' '}
            <Link to="/login" className="font-medium text-primary hover:underline">
              Back to Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
