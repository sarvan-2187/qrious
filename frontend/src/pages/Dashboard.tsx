import { useAuth } from '../context/AuthContext';
import { auth } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { FaUserCircle, FaSignOutAlt } from 'react-icons/fa';

export default function Dashboard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate('/');
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-2xl animate-in zoom-in-95 duration-500 shadow-xl">
        <CardHeader className="flex flex-col items-center">
          <div className="mb-4 text-primary">
            {currentUser?.photoURL ? (
              <img 
                src={currentUser.photoURL} 
                alt="Profile" 
                referrerPolicy="no-referrer"
                className="w-20 h-20 rounded-full shadow-lg border-2 border-primary" 
              />
            ) : (
              <FaUserCircle className="w-20 h-20" />
            )}
          </div>
          <CardTitle className="text-3xl text-center">
            Welcome to your Quantum Dashboard, {currentUser?.displayName || 'Explorer'}!
          </CardTitle>
          <CardDescription className="text-center text-lg mt-2">
            Your exploration into the quantum realm begins here.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="grid gap-4 mt-6">
          <div className="p-4 bg-muted rounded-lg border border-border">
            <h3 className="font-semibold mb-2">Account Status</h3>
            <p className="text-sm text-muted-foreground">Logged in as: {currentUser?.email}</p>
          </div>
        </CardContent>

        <CardFooter className="flex justify-center pt-6 pb-6">
          <Button variant="destructive" size="lg" onClick={handleLogout} className="px-8">
            <FaSignOutAlt className="mr-2" /> Logout
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
