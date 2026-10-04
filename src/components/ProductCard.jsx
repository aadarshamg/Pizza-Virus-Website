import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { ImageOrEmoji, VegMark } from './ui';
import { getLowestPrice } from '../utils/pricing';

// `index` staggers the scroll reveal across a grid row (4 columns max).
export default function ProductCard({ product, badge, index = 0 }) {
    const price = getLowestPrice(product);
    return (
        // Outer wrapper owns the reveal (and its delay) so the hover lift below stays instant.
        <div className="reveal-zoom h-full" style={{ '--rd': `${(index % 4) * 90}ms` }}>
            <Link to={`/product/${product.id}`}
                className="group h-full bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden flex flex-col transition duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-green-900/10 active:scale-[0.98]">
                <div className="relative aspect-[4/3] overflow-hidden">
                    <ImageOrEmoji src={product.image_url} alt={product.name} className="w-full h-full group-hover:scale-110 transition duration-700 ease-out" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent opacity-0 group-hover:opacity-100 transition duration-500" aria-hidden />
                    <span className="absolute top-2.5 left-2.5 bg-white/95 rounded-md p-1 shadow"><VegMark isVeg={product.is_veg} /></span>
                    {badge && (
                        <span className="absolute top-2.5 right-2.5 bg-brand text-white text-[10px] font-extrabold tracking-wider px-2 py-1 rounded-lg">{badge}</span>
                    )}
                </div>
                <div className="p-3.5 flex flex-col flex-1">
                    <h3 className="font-extrabold text-ink leading-tight line-clamp-2 group-hover:text-brand transition-colors">{product.name}</h3>
                    <div className="flex-1">
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{product.description || 'Freshly baked'}</p>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                        <span className="font-extrabold text-ink">
                            {Number.isFinite(price) ? <>₹{price}</> : null}
                            {product.product_type === 'pizza' || !product.product_type ? <span className="text-[11px] text-slate-400 font-semibold ml-1">onwards</span> : null}
                        </span>
                        <span className="w-9 h-9 rounded-xl bg-brand-50 text-brand flex items-center justify-center group-hover:bg-brand group-hover:text-white group-hover:rotate-90 transition duration-300" aria-hidden>
                            <Plus size={18} strokeWidth={3} />
                        </span>
                    </div>
                </div>
            </Link>
        </div>
    );
}
