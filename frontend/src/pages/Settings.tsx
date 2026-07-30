import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useTheme } from '@/context/ThemeContext';

export default function Settings() {
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [topic, setTopic] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { currentUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchUserData() {
      if (!currentUser) return;
      try {
        const token = await currentUser.getIdToken();
        const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
        const response = await fetch(`${API_URL}/api/user/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setFullName(data.full_name || '');
          setAge(data.age ? data.age.toString() : '');
          setTopic(data.interested_topic || '');
          setEmail(data.email || currentUser.email || '');
        } else {
          toast.error("Failed to load profile details");
        }
      } catch (error) {
        console.error("Failed to fetch user data", error);
        toast.error("An error occurred loading profile details");
      } finally {
        setLoading(false);
      }
    }
    fetchUserData();
  }, [currentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setSaving(true);

    try {
      const token = await currentUser.getIdToken();
      const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
      
      const response = await fetch(`${API_URL}/api/user/me`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          full_name: fullName,
          age: parseInt(age),
          interested_topic: topic
        })
      });

      if (response.ok) {
        toast.success("Profile updated successfully!");
        navigate('/dashboard');
      } else {
        const errorData = await response.json();
        toast.error(errorData.detail || "Failed to update profile");
      }
    } catch (error) {
      console.error("Error saving data:", error);
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="text-lg text-muted-foreground animate-pulse font-medium">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 animate-in fade-in duration-500">
      <h1 className="text-3xl font-sans mb-6">Account Settings</h1>
      
      <Card className="w-full shadow-sm border-border/50">
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6 mt-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email Address (Read-only)</Label>
              <Input 
                id="email" 
                type="email" 
                value={email} 
                disabled 
                className="h-12 bg-secondary/30 opacity-70 cursor-not-allowed"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-sm font-medium">Full Name</Label>
              <Input 
                id="fullName" 
                placeholder="Your name" 
                value={fullName} 
                onChange={(e) => setFullName(e.target.value)} 
                required 
                className="h-12"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="age" className="text-sm font-medium">Age</Label>
              <Input 
                id="age" 
                type="number" 
                min="1" 
                placeholder="25" 
                value={age} 
                onChange={(e) => setAge(e.target.value)} 
                required 
                className="h-12"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="topic" className="text-sm font-medium">Interested Quantum Topic</Label>
              <Select value={topic} onValueChange={setTopic} required>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select a topic" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Quantum Algorithms">Quantum Algorithms</SelectItem>
                  <SelectItem value="Quantum Cryptography">Quantum Cryptography</SelectItem>
                  <SelectItem value="Quantum Hardware">Quantum Hardware</SelectItem>
                  <SelectItem value="Quantum Machine Learning">Quantum Machine Learning</SelectItem>
                  <SelectItem value="General Physics">General Physics</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center justify-between space-x-2 py-4 border-t border-border mt-6">
              <div className="flex flex-col space-y-1">
                <Label htmlFor="theme-toggle" className="text-sm font-medium">Dark Mode</Label>
                <span className="text-sm text-muted-foreground">Switch between light and dark themes.</span>
              </div>
              <Switch 
                id="theme-toggle" 
                checked={theme === 'dark'} 
                onCheckedChange={toggleTheme} 
              />
            </div>
            
            <Button type="submit" className="w-full h-12 text-lg mt-4" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Saving Changes...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
