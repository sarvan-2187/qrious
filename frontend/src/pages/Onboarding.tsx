import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function Onboarding() {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setLoading(true);

    try {
      const response = await fetch('http://127.0.0.1:8000/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firebase_uid: currentUser.uid,
          email: currentUser.email,
          name,
          age: parseInt(age),
          topic
        })
      });

      if (response.ok) {
        navigate('/dashboard');
      } else {
        console.error("Failed to save onboarding data");
      }
    } catch (error) {
      console.error("Error saving data:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-lg shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
        <CardHeader>
          <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
          <CardDescription>Tell us a bit about yourself to personalize your experience.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input 
                id="name" 
                placeholder="Ada Lovelace" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                required 
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="age">Age</Label>
              <Input 
                id="age" 
                type="number" 
                min="1" 
                placeholder="25" 
                value={age} 
                onChange={(e) => setAge(e.target.value)} 
                required 
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="topic">Interested Quantum Topic</Label>
              <Select value={topic} onValueChange={setTopic} required>
                <SelectTrigger>
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
            
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? "Saving..." : "Continue to Dashboard"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
