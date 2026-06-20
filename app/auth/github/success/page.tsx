'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

// This page lives inside the OAuth popup.
// It sends the token back to the opener via postMessage, then closes itself.
export default function GitHubSuccessPage() {
  const params = useSearchParams();

  useEffect(() => {
    const token = params.get('token');
    const username = params.get('username');
    const name = params.get('name');
    const avatarUrl = params.get('avatar_url');
    const email = params.get('email');

    if (token && username && window.opener) {
      window.opener.postMessage(
        { type: 'github-connected', payload: { token, username, name, avatarUrl, email } },
        window.location.origin
      );
      window.close();
    } else {
      // Fallback: not in a popup — redirect normally
      window.location.replace('/dashboard');
    }
  }, [params]);

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center gap-3">
      <div className="w-5 h-5 border-2 border-[#6c63ff]/30 border-t-[#6c63ff] rounded-full animate-spin" />
      <p className="font-mono text-xs text-[#52525b]">connecting...</p>
    </div>
  );
}
