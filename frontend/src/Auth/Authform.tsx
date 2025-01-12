import React, { useState, FormEvent, ChangeEvent } from 'react';
import axios, { AxiosError } from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { jwtDecode } from 'jwt-decode';

// Types
interface User {
  id: string;
  username: string;
  role: string;
}

interface AuthFormProps {
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

interface LoginResponse {
  token: string;
  username: string;
  role: string;
}

interface DecodedToken {
  id: string;
  username: string;
  role: string;
  exp: number;
}

interface ApiError {
  error: string;
}

const AuthForm: React.FC<AuthFormProps> = ({ setUser }) => {
  // State
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Handlers
  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Updated endpoints to match new backend structure
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const { data } = await axios.post<LoginResponse>(
        `http://localhost:3000${endpoint}`,
        formData
      );

      const token = data.token;
      localStorage.setItem('token', token);
      
      try {
        const decodedToken = jwtDecode<DecodedToken>(token);
        
        // Add token expiration check
        if (decodedToken.exp < Date.now() / 1000) {
          throw new Error('Token has expired');
        }
        
        // Create user object with role
        const user: User = {
          id: decodedToken.id,
          username: decodedToken.username,
          role: decodedToken.role
        };
        
        // Set up axios default authorization header for future requests
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        setUser(user);
      } catch (decodeError) {
        setError('Invalid token received');
        localStorage.removeItem('token');
        delete axios.defaults.headers.common['Authorization'];
      }
    } catch (err) {
      const error = err as AxiosError<ApiError>;
      if (error.response?.status === 400) {
        // Handle specific error cases
        setError(error.response.data.error || 'Invalid credentials');
      } else if (error.response?.status === 403) {
        setError('Account has been deactivated');
      } else {
        setError('An error occurred. Please try again.');
      }
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const toggleIsLogin = (): void => {
    setIsLogin(!isLogin);
    setError('');
    setFormData({ username: '', password: '' });
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{isLogin ? 'Login' : 'Register'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="text"
                name="username"
                placeholder="Username"
                value={formData.username}
                onChange={handleInputChange}
                disabled={isLoading}
                required
                minLength={3}
                maxLength={20}
              />
            </div>
            <div className="space-y-2">
              <Input
                type="password"
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleInputChange}
                disabled={isLoading}
                required
                minLength={6}
              />
            </div>
            {error && (
              <div className="text-red-500 text-sm bg-red-50 p-2 rounded">
                {error}
              </div>
            )}
            <Button 
              type="submit" 
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : (isLogin ? 'Login' : 'Register')}
            </Button>
            <Button
              type="button"
              variant="link"
              className="w-full"
              onClick={toggleIsLogin}
              disabled={isLoading}
            >
              {isLogin ? 'Need an account? Register' : 'Have an account? Login'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthForm;