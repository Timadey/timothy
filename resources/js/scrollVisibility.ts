import { useEffect, useState } from 'react';

const TOP_ZONE = 80;
const STEP = 3;

export function useScrollAwareVisibility(): boolean {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        let lastY = window.scrollY;
        const onScroll = () => {
            const y = window.scrollY;
            if (y <= TOP_ZONE || y < lastY - STEP) {
                setVisible(true);
            } else if (y > lastY + STEP) {
                setVisible(false);
            }
            lastY = y;
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return visible;
}
