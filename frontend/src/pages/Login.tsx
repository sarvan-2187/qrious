import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider, githubProvider } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { FaGoogle, FaGithub, FaAtom } from 'react-icons/fa';

export default function Login() {
  const navigate = useNavigate();

  const handleLoginSuccess = async (user: any) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/user/${user.uid}`);
      if (response.ok) {
        navigate('/dashboard');
      } else {
        navigate('/onboarding');
      }
    } catch (error) {
      console.error("Failed to fetch user data", error);
      navigate('/onboarding');
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await handleLoginSuccess(result.user);
    } catch (error) {
      console.error("Google login failed", error);
    }
  };

  const handleGithubLogin = async () => {
    try {
      const result = await signInWithPopup(auth, githubProvider);
      await handleLoginSuccess(result.user);
    } catch (error) {
      console.error("Github login failed", error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md animate-in zoom-in-95 duration-500 shadow-2xl">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-2">
            <FaAtom className="w-10 h-10 text-primary animate-spin-slow" />
          </div>
          <CardTitle className="text-3xl font-bold">Welcome Back</CardTitle>
          <CardDescription>Sign in to continue your quantum journey</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <Button 
            variant="outline" 
            size="lg" 
            className="w-full text-lg h-14" 
            onClick={handleGoogleLogin}
          >
            <FaGoogle className="text-red-500" /> Continue with Google
          </Button>
          <Button 
            variant="outline" 
            size="lg" 
            className="w-full text-lg h-14" 
            onClick={handleGithubLogin}
          >
            <FaGithub /> Continue with GitHub
          </Button>
        </CardContent>
        <CardFooter className="justify-center text-sm text-muted-foreground pt-4">
          By signing in, you agree to our Terms of Service.
        </CardFooter>
      </Card>
    </div>
  );
}
