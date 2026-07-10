import type { Metadata } from 'next';
import Link from 'next/link';
import NavLinks from './components/NavLinks';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI Toolkit UI',
  description: 'Web interface for evaluation-driven prompt development with promptfoo',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <aside className="sidebar">
            <Link href="/" className="brand" title="AI Toolkit UI">
              <span className="navlink-icon">⚡</span>
              <span className="navlink-label">
                AI Toolkit <span>UI</span>
              </span>
            </Link>
            <NavLinks />
          </aside>
          <main className="page">{children}</main>
        </div>
      </body>
    </html>
  );
}
