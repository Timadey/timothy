export type NavItem = { label: string; href: string; separatorBefore?: boolean };

export const navItems: NavItem[] = [
    { label: 'Home', href: '/' },
    { label: 'Writing', href: '/writing' },
    { label: 'Notes', href: '/notes' },
    { label: 'Projects', href: '/projects' },
    { label: 'Collected', href: '/collected' },
    // { label: 'Now', href: '/now' }, // hidden from nav by request; /now stays routable
    { label: 'About', href: '/about', separatorBefore: true },
    { label: 'Ask', href: '/ask' },
];
