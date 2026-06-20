import { NextResponse } from 'next/server';

export async function GET() {
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID!,
    scope: 'read:user repo',
    redirect_uri: 'http://localhost:3000/api/auth/callback/github',
  });
  return NextResponse.redirect(
    `https://github.com/login/oauth/authorize?${params}`
  );
}
