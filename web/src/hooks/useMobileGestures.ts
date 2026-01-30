import { useState, useEffect, useRef } from 'react';

interface MobileGesturesState {
    isMobile: boolean;
    sidebarCollapsed: boolean;
    membersCollapsed: boolean;
}

interface MobileGesturesActions {
    setSidebarCollapsed: (collapsed: boolean) => void;
    setMembersCollapsed: (collapsed: boolean) => void;
}

interface TouchHandlers {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: () => void;
}

type UseMobileGesturesReturn = MobileGesturesState & MobileGesturesActions & TouchHandlers;

export function useMobileGestures(): UseMobileGesturesReturn {
    const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => window.innerWidth < 768);
    const [membersCollapsed, setMembersCollapsed] = useState(() => window.innerWidth < 768);

    // Touch gesture refs
    const touchStart = useRef<number | null>(null);
    const touchEnd = useRef<number | null>(null);

    // Mobile viewport detection
    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            // Auto-collapse sidebars when switching to mobile
            if (mobile) {
                setSidebarCollapsed(true);
                setMembersCollapsed(true);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Touch handlers for swipe gestures
    const onTouchStart = (e: React.TouchEvent) => {
        touchEnd.current = null;
        touchStart.current = e.targetTouches[0].clientX;
    };

    const onTouchMove = (e: React.TouchEvent) => {
        touchEnd.current = e.targetTouches[0].clientX;
    };

    const onTouchEnd = () => {
        if (!touchStart.current || !touchEnd.current) return;
        const distance = touchStart.current - touchEnd.current;
        const isLeftSwipe = distance > 50;
        const isRightSwipe = distance < -50;

        if (isLeftSwipe) {
            // Swiped Left: Open Members or Close Channels (if open)
            if (!sidebarCollapsed) {
                setSidebarCollapsed(true); // Close left sidebar
            } else if (membersCollapsed) {
                setMembersCollapsed(false); // Open right sidebar
            }
        }

        if (isRightSwipe) {
            // Swiped Right: Open Channels or Close Members (if open)
            if (!membersCollapsed) {
                setMembersCollapsed(true); // Close right sidebar
            } else if (sidebarCollapsed) {
                setSidebarCollapsed(false); // Open left sidebar
            }
        }
    };

    return {
        isMobile,
        sidebarCollapsed,
        membersCollapsed,
        setSidebarCollapsed,
        setMembersCollapsed,
        onTouchStart,
        onTouchMove,
        onTouchEnd,
    };
}
