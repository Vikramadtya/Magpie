import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function AuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // The token is usually appended as a URL fragment #access_token=... by Micronaut Bearer redirect
    const hash = location.hash;
    const query = new URLSearchParams(location.search);
    
    // Check both hash and query parameters for token
    let token = query.get('access_token');
    
    if (!token && hash) {
      const hashParams = new URLSearchParams(hash.substring(1));
      token = hashParams.get('access_token');
    }

    if (token) {
      localStorage.setItem('token', token);
      
      // Attempt to extract workspaceId and user details from JWT token payload
      try {
        const payloadBase64 = token.split('.')[1];
        const payload = JSON.parse(atob(payloadBase64));
        if (payload.workspaceId) {
          localStorage.setItem('workspaceId', payload.workspaceId);
        }
      } catch (e) {
        console.error("Failed to parse token payload", e);
      }
      
      navigate('/', { replace: true });
    } else {
      console.error("No token found in URL");
      navigate('/login?error=true', { replace: true });
    }
  }, [navigate, location]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-4 text-text">Authenticating...</h2>
        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto"></div>
      </div>
    </div>
  );
}
