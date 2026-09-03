import { motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { Card, CardHeader, CardContent, CardFooter } from '../../../components/ui/Card';
import { env } from '../../../config/env';
import { useEffect } from 'react';
import { toast } from 'sonner';

export default function LoginPage() {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('error')) {
      toast.error('Authentication failed. Please try again.');
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center shadow-sm">
            <span className="text-white text-xl font-bold">K</span>
          </div>
        </div>
        <h2 className="mt-2 text-center text-3xl font-bold tracking-tight text-primary">
          Log in to Keeper
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel py-8 px-4 shadow sm:rounded-2xl sm:px-10 text-center"
        >
          <a
            href={`${env.API_URL}/oauth/login/google`}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-border rounded-lg shadow-sm text-sm font-medium text-primary bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-all"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </a>
        </motion.div>
      </div>
    </div>
  );
}
