import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center px-5 text-center">
      <div className="font-mono text-[80px] font-bold text-[#1e1e28] leading-none select-none">404</div>
      <div className="font-mono text-xs text-[#6c63ff] mt-2 mb-4">page_not_found</div>
      <h1 className="text-xl font-bold text-white mb-2">Nothing here</h1>
      <p className="text-[#52525b] text-sm font-mono max-w-xs">
        This route doesn&apos;t exist. Check the URL or head back to the dashboard.
      </p>
      <Link
        href="/dashboard"
        className="mt-8 px-5 py-2.5 rounded-lg bg-[#6c63ff] text-white text-sm font-semibold hover:bg-[#7c73ff] hover:-translate-y-px transition-all"
      >
        back to dashboard →
      </Link>
    </div>
  );
}
