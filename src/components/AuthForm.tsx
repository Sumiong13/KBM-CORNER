import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import { Info } from 'lucide-react';
import clubLogo from 'figma:asset/ade13b6fb51eb9b3ff7200cf4269cebe703dd1ea.png';
import { ForgotPasswordDialog } from './ForgotPasswordDialog';

interface AuthFormProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onSignup: (email: string, password: string, name: string, role?: string) => Promise<any>;
}

export function AuthForm({ onLogin, onSignup }: AuthFormProps) {
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupRole, setSignupRole] = useState<'student' | 'committee' | 'tutor'>('student');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);
    try {
      await onLogin(loginEmail, loginPassword);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);
    try {
      const response = await onSignup(signupEmail, signupPassword, signupName, signupRole);
      
      // Check if email verification is required
      if (response?.requiresEmailVerification) {
        setSuccessMessage('Verification code sent! Please check your email.');
        // Keep form data in case user needs to retry
      } else if (response?.requiresVerification) {
        // Admin verification for committee/tutor
        setSuccessMessage('Account created successfully! Please wait for admin verification before logging in.');
        // Clear form
        setSignupEmail('');
        setSignupPassword('');
        setSignupName('');
      }
      // If no verification required, user will be auto-logged in by the parent
    } catch (err: any) {
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-yellow-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <img src={clubLogo} alt="UTM Mandarin Club" className="w-16 h-16 object-contain" />
          </div>
          <CardTitle className="text-center text-2xl">UTM Mandarin Club</CardTitle>
          <CardDescription className="text-center">
            Welcome! Login or create an account to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="you@example.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="login-password">Password</Label>
                    <ForgotPasswordDialog />
                  </div>
                  <Input
                    id="login-password"
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                  />
                </div>
                {error && (
                  <p className="text-sm text-red-600">{error}</p>
                )}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Logging in...' : 'Login'}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-role">I am a...</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setSignupRole('student')}
                      className={`p-3 border-2 rounded-lg transition-all ${
                        signupRole === 'student'
                          ? 'border-red-600 bg-red-50 text-red-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-center">
                        <p className="font-medium">Student</p>
                        <p className="text-xs text-gray-600 mt-1">Instant access</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSignupRole('committee')}
                      className={`p-3 border-2 rounded-lg transition-all ${
                        signupRole === 'committee'
                          ? 'border-red-600 bg-red-50 text-red-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-center">
                        <p className="font-medium">Committee</p>
                        <p className="text-xs text-gray-600 mt-1">Needs approval</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSignupRole('tutor')}
                      className={`p-3 border-2 rounded-lg transition-all ${
                        signupRole === 'tutor'
                          ? 'border-red-600 bg-red-50 text-red-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-center">
                        <p className="font-medium">Tutor</p>
                        <p className="text-xs text-gray-600 mt-1">Needs approval</p>
                      </div>
                    </button>
                  </div>
                </div>

                {signupRole === 'committee' && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Committee accounts require admin verification before you can login.
                    </AlertDescription>
                  </Alert>
                )}

                {signupRole === 'tutor' && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Tutor accounts require admin verification before you can login.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="signup-name">Full Name</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Your Name"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@example.com"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                  <p className="text-xs text-gray-500">Must be at least 6 characters</p>
                </div>
                {error && (
                  <p className="text-sm text-red-600">{error}</p>
                )}
                {successMessage && (
                  <p className="text-sm text-green-600">{successMessage}</p>
                )}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Creating account...' : `Sign Up as ${signupRole === 'student' ? 'Student' : signupRole === 'committee' ? 'Committee' : 'Tutor'}`}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}