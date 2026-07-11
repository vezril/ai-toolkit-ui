'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavEntry {
  href: string;
  label: string;
  icon: string;
  isActive: (pathname: string) => boolean;
}

const TOOLS: NavEntry[] = [
  {
    href: '/',
    label: 'Dashboard',
    icon: '▦',
    // /config pages are opened from dashboard cards — same tool.
    isActive: (p) => p === '/' || p.startsWith('/config'),
  },
  {
    href: '/new',
    label: 'New evaluation',
    icon: '✚',
    isActive: (p) => p.startsWith('/new'),
  },
  {
    href: '/runs',
    label: 'Runs',
    icon: '▶',
    isActive: (p) => p.startsWith('/runs'),
  },
  {
    href: '/skills',
    label: 'Skills',
    icon: '⬡',
    isActive: (p) => p.startsWith('/skills'),
  },
  {
    href: '/agents',
    label: 'Agents',
    icon: '⚇',
    isActive: (p) => p.startsWith('/agents'),
  },
  {
    href: '/workflows',
    label: 'Workflows',
    icon: '◈',
    isActive: (p) => p.startsWith('/workflows'),
  },
];

const SETTINGS: NavEntry = {
  href: '/settings',
  label: 'Settings',
  icon: '⚙',
  isActive: (p) => p.startsWith('/settings'),
};

function NavLink({ entry, pathname }: { entry: NavEntry; pathname: string }) {
  return (
    <Link
      href={entry.href}
      className={`navlink ${entry.isActive(pathname) ? 'active' : ''}`}
      title={entry.label}
      aria-label={entry.label}
    >
      <span className="navlink-icon">{entry.icon}</span>
      <span className="navlink-label">{entry.label}</span>
    </Link>
  );
}

export default function NavLinks() {
  const pathname = usePathname();
  return (
    <>
      <nav className="sidebar-tools">
        {TOOLS.map((e) => (
          <NavLink entry={e} pathname={pathname} key={e.href} />
        ))}
      </nav>
      <nav className="sidebar-bottom">
        <NavLink entry={SETTINGS} pathname={pathname} />
      </nav>
    </>
  );
}
