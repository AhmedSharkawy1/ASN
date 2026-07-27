"use client";

import { useEffect } from "react";

/**
 * Shared behaviour for the mobile slide-in drawers (public navbar + the two
 * admin sidebars). Each of them re-implemented "open" as nothing more than a
 * boolean, which left three gaps on a phone:
 *
 *   1. the page kept scrolling behind the open drawer
 *   2. Escape did nothing
 *   3. the drawer stayed open across a route change
 *
 * `overscroll-contain` on the drawer's own scroller stops a flick inside the
 * drawer from chaining to the page once it hits its end.
 */
export function useMobileDrawer(isOpen: boolean, close: () => void, routeKey?: string) {
    // Escape closes the drawer.
    useEffect(() => {
        if (!isOpen) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") close();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [isOpen, close]);

    // Freeze the page behind the drawer. Restoring the previous inline value
    // (rather than clearing it) keeps this safe if anything else locks scroll.
    useEffect(() => {
        if (!isOpen) return;
        const { body } = document;
        const previous = body.style.overflow;
        body.style.overflow = "hidden";
        return () => {
            body.style.overflow = previous;
        };
    }, [isOpen]);

    // Navigating away should never leave the drawer hanging open.
    useEffect(() => {
        if (isOpen) close();
        // Deliberately keyed on the route only: re-running on isOpen/close
        // would slam the drawer shut the moment it opens.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [routeKey]);
}
