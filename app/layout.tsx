import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI Toolkit UI',
  description: 'Web interface for evaluation-driven prompt development with promptfoo',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="topnav">
          <Link href="/" className="brand">
            ⚡ AI Toolkit <span>UI</span>
          </Link>
          <nav>
            <Link href="/">Dashboard</Link>
            <Link href="/runs">Runs</Link>
          </nav>
        </header>
        <main className="page">{children}</main>
      </body>
    </html>
  );
}
