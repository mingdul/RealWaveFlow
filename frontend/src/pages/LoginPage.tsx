import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'
import { AuthFormWrapper, Input, Button, AuthSocialButtons } from '../components';
import { useAuth } from '../contexts/AuthContext';


const LoginPage = () => {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      await login({ email, password });  
      navigate('/dashboard')
      console.log('navigate 실행됨');
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthFormWrapper
      title="Login"
      linkText="Don't have an account yet?"
      linkUrl="/signup"
      linkLabel="Register for free"
      socialButtonsComponent={<AuthSocialButtons />}
    >
      {error && (
        <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500 px-4 py-3 text-red-500 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Email Field */}
        <Input
          type="email"
          label="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="username@gmail.com"
          required
        />

        {/* Password Field */}
        <Input
          type="password"
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
        />

        {/* Forgot Password Link */}
        <div className="text-right">
          <a
            href="#"
            className="text-sm text-blue-400 transition-colors hover:text-blue-300"
          >
            Forgot Password?
          </a>
        </div>

        {/* Sign In Button */}
        <Button
          type="submit"
          variant="primary"
          className="w-full"
          isLoading={isLoading}
        >
          Log in
        </Button>
      </form>
    </AuthFormWrapper>
  );
};

export default LoginPage;
