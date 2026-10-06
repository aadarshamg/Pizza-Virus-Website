// Floating "Chat on WhatsApp" button, bottom-right on every page.
// Number is the support line from the Help & Support page (+91 70870 41010).
const WHATSAPP_NUMBER = '917087041010';
const DEFAULT_MESSAGE = 'Hi Pizza Virus! I have a question about my order.';

export default function WhatsAppButton({ raised = false }) {
    const href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(DEFAULT_MESSAGE)}`;
    // On phones it sits above the bottom nav; on the product page also above the Add to Cart bar.
    const bottom = raised ? 'bottom-40 md:bottom-6' : 'bottom-24 md:bottom-6';
    return (
        <a href={href} target="_blank" rel="noopener noreferrer" aria-label="Chat with Pizza Virus on WhatsApp"
            className={`group fixed right-4 md:right-6 ${bottom} z-40 flex items-center anim-pop`} style={{ '--d': '1200ms' }}>
            {/* Label slides out on hover (desktop) */}
            <span className="hidden md:block mr-3 bg-white text-ink text-sm font-extrabold rounded-2xl px-4 py-2.5 shadow-xl border-[3px] border-pv-ink opacity-0 translate-x-3 pointer-events-none transition duration-300 group-hover:opacity-100 group-hover:translate-x-0">
                Chat with us
            </span>
            <span className="relative flex w-14 h-14">
                <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-30" aria-hidden />
                <span className="relative w-14 h-14 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-[0_10px_30px_-6px_rgba(37,211,102,0.7)] transition duration-300 group-hover:scale-110 group-hover:-rotate-6 group-active:scale-95">
                    <svg viewBox="0 0 32 32" className="w-[1.875rem] h-[1.875rem]" fill="currentColor" aria-hidden>
                        <path d="M16.04 3C8.86 3 3.03 8.82 3.03 16c0 2.29.6 4.53 1.74 6.5L3 29l6.68-1.75A12.95 12.95 0 0 0 16.04 29C23.2 29 29.04 23.18 29.04 16S23.2 3 16.04 3Zm0 23.64c-1.95 0-3.86-.52-5.53-1.51l-.4-.24-3.96 1.04 1.06-3.86-.26-.4A10.6 10.6 0 0 1 5.4 16c0-5.87 4.77-10.64 10.64-10.64S26.67 10.13 26.67 16 21.9 26.64 16.04 26.64Zm5.83-7.97c-.32-.16-1.89-.93-2.18-1.04-.29-.11-.5-.16-.72.16-.21.32-.82 1.04-1.01 1.25-.19.21-.37.24-.69.08-.32-.16-1.35-.5-2.57-1.59-.95-.85-1.59-1.9-1.78-2.22-.19-.32-.02-.49.14-.65.14-.14.32-.37.48-.56.16-.19.21-.32.32-.53.11-.21.05-.4-.03-.56-.08-.16-.72-1.73-.98-2.37-.26-.62-.52-.54-.72-.55h-.61c-.21 0-.56.08-.85.4-.29.32-1.11 1.09-1.11 2.65s1.14 3.08 1.3 3.29c.16.21 2.24 3.42 5.43 4.8.76.33 1.35.52 1.81.67.76.24 1.45.21 2 .13.61-.09 1.89-.77 2.15-1.52.27-.75.27-1.39.19-1.52-.08-.13-.29-.21-.61-.37Z" />
                    </svg>
                </span>
            </span>
        </a>
    );
}
