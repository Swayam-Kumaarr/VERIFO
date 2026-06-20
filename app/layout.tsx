import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from './components/AuthContext';
import { ToastProvider } from './components/ToastContext';
import CustomCursor from './components/CustomCursor';

export const metadata: Metadata = {
  title: 'Nexora — Proof of Build',
  description: 'Verify what developers actually built — commit-level analysis, AI signature detection, and resume cross-check.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthProvider>
          <ToastProvider>
            <CustomCursor />
            <div className="page-enter">
              {children}
            </div>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
