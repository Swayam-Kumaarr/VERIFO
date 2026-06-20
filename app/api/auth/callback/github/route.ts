import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  if (!code) {
    return NextResponse.redirect('http://localhost:3000/login?error=no_code');
  }

  // Exchange code for access token
  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });

  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;

  if (!accessToken) {
    return NextResponse.redirect('http://localhost:3000/login?error=token_failed');
  }

  // Fetch GitHub user profile
  const userRes = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
    },
  });
  const githubUser = await userRes.json();

  // Pass everything to the client-side success page via search params
  const params = new URLSearchParams({
    token: accessToken,
    username: githubUser.login ?? '',
    name: githubUser.name ?? githubUser.login ?? '',
    avatar_url: githubUser.avatar_url ?? '',
    email: githubUser.email ?? '',
  });

  return NextResponse.redirect(
    `http://localhost:3000/auth/github/success?${params}`
  );
}
