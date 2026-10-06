import { Link } from 'react-router-dom';
import { ImageOrEmoji, VegMark } from './ui';
import { getLowestPrice, getSizes } from '../utils/pricing';

// Compact menu row (Swiggy / Zomato style): details on the left, photo + ADD on the right.
// The whole row opens the product page, where size / crust / toppings are chosen.
export default function MenuItemRow({ product, delay = 0 }) {
    const price = getLowestPrice(product);
    const customisable = getSizes(product).length > 1;
    return (
        <Link to={`/product/${product.id}`} style={{ '--rd': `${delay}ms` }}
            className="reveal group flex gap-4 sm:gap-6 py-5 px-2 sm:px-3 -mx-2 sm:-mx-3 rounded-2xl hover:bg-white transition-colors">
            <div className="flex-1 min-w-0">
                <VegMark isVeg={product.is_veg} />
                <h3 className="font-extrabold text-ink text-base sm:text-lg leading-snug mt-1.5 group-hover:text-brand transition-colors">
                    {product.name}
                </h3>
                {Number.isFinite(price) && (
                    <p className="font-extrabold text-ink mt-1">
                        ₹{price}
                        {customisable && <span className="text-xs font-semibold text-slate-400 ml-1.5">onwards</span>}
                    </p>
                )}
                {product.description && (
                    <p className="text-sm text-slate-500 mt-2 line-clamp-2 leading-relaxed">{product.description}</p>
                )}
            </div>

            <div className="relative shrink-0 w-28 sm:w-36 self-start pb-3">
                <div className="w-28 h-28 sm:w-36 sm:h-32 rounded-2xl overflow-hidden bg-brand-cream border-[3px] border-pv-ink">
                    <ImageOrEmoji src={product.image_url} alt={product.name} emojiSize="text-4xl"
                        className="w-full h-full group-hover:scale-110 transition duration-500 ease-out" />
                </div>
                <span className="absolute left-1/2 -translate-x-1/2 top-[6.25rem] sm:top-[7.25rem] bg-pv-yellow text-pv-ink border-[3px] border-pv-ink shadow-brut-sm rounded-xl px-6 py-1.5 text-sm font-extrabold tracking-wide transition-all group-hover:shadow-none group-hover:translate-x-[2px] group-hover:translate-y-[2px]">
                    ADD
                </span>
                {customisable && (
                    <span className="block text-center text-[0.625rem] font-semibold text-slate-500 mt-8">Customisable</span>
                )}
            </div>
        </Link>
    );
}
