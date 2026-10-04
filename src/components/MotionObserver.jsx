import { useEffect } from 'react';

// Site-wide scroll reveal. Any element with .reveal / .reveal-left / .reveal-right /
// .reveal-zoom fades in once it scrolls into view. A MutationObserver picks up
// elements that render later (after data loads or on route changes).
const SELECTOR = '.reveal, .reveal-left, .reveal-right, .reveal-zoom';

export default function MotionObserver() {
    useEffect(() => {
        const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        const show = (el) => el.classList.add('is-visible');

        if (reduce || !('IntersectionObserver' in window)) {
            const showAll = () => document.querySelectorAll(SELECTOR).forEach(show);
            showAll();
            const mo = new MutationObserver(showAll);
            mo.observe(document.body, { childList: true, subtree: true });
            return () => mo.disconnect();
        }

        const io = new IntersectionObserver((entries) => {
            entries.forEach((e) => {
                if (e.isIntersecting) {
                    show(e.target);
                    io.unobserve(e.target);
                }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

        const watch = (root) => {
            if (root.nodeType !== 1) return;
            if (root.matches?.(SELECTOR) && !root.classList.contains('is-visible')) io.observe(root);
            root.querySelectorAll?.(SELECTOR).forEach((el) => { if (!el.classList.contains('is-visible')) io.observe(el); });
        };
        watch(document.body);

        const mo = new MutationObserver((muts) => muts.forEach((m) => m.addedNodes.forEach(watch)));
        mo.observe(document.body, { childList: true, subtree: true });

        return () => { io.disconnect(); mo.disconnect(); };
    }, []);
    return null;
}
