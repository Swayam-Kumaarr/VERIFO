'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './components/AuthContext';

export default function Root() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) router.replace(user ? '/dashboard' : '/login');
  }, [user, loading, router]);

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="w-5 h-5 border-2 border-[#6c63ff]/30 border-t-[#6c63ff] rounded-full animate-spin" />
    </div>
  );
}
