import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function VerifyEmail() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-8 bg-background">
      <div className="w-full max-w-md space-y-8 text-center animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="flex justify-center mb-6">
          <img src="/apple-touch-icon.png" alt="Qrious Logo" className="w-16 h-16 rounded-full" />
        </div>
        <h1 className="text-4xl font-sans tracking-tight mb-4">Verify your email</h1>
        <p className="text-muted-foreground text-lg mb-8">
          We've sent a verification link to your email address. Please click the link to verify your account before logging in.
        </p>
        <div className="space-y-4">
          <Link to="/login">
            <Button className="w-full h-12 text-lg">
              Return to Login
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
