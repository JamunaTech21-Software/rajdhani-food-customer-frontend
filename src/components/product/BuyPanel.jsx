import { Download, Heart, Minus, Plus, Share2 } from "lucide-react";

import { Icon } from "../ui/Icon.jsx";
import { cn } from "../../lib/cn.js";
import { formatPrice, packDetails, sortedPackSizes } from "../../lib/productDetail.js";
import { Stars } from "../ui/Stars.jsx";

/**
 * Everything to the right of the gallery (§10.2).
 *
 * The pack-size criterion lands here: selecting a size changes SKU, price,
 * compare price and the discount badge together, because all four come from one
 * `packDetails(pack)` call rather than being read field-by-field. A price that
 * moves while the SKU beside it does not is the failure that guards against.
 */
export function BuyPanel({ product, pack, onSelectPack, quantity, onQuantity, brochure, onShare }) {
  const packs = sortedPackSizes(product.pack_sizes);
  const details = packDetails(pack);

  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">{product.name}</h1>

      {product.tagline ? (
        <p className="mt-2 text-lg font-medium text-brand">{product.tagline}</p>
      ) : null}

      {product.short_description ? (
        <p className="mt-4 max-w-prose leading-relaxed text-ink-muted">{product.short_description}</p>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <Stars value={product.rating_average} count={product.rating_count} />

        {/* The SKU of the *selected* pack, not the product — §10.2 is explicit,
            and the live data confirms it: RCB-250 and RCB-500 are different. */}
        {details.sku ? (
          <span className="text-ink-muted">
            SKU: <span className="font-mono text-ink">{details.sku}</span>
          </span>
        ) : null}
      </div>

      {product.highlights?.length ? (
        <ul className="mt-6 grid grid-cols-2 gap-4 border-y border-line py-5 sm:grid-cols-4">
          {product.highlights.map((highlight) => (
            <li key={highlight.id} className="flex flex-col items-center gap-2 text-center">
              <Icon name={highlight.icon_name} size={22} className="text-brand" />
              <span className="text-xs font-medium text-ink">{highlight.title}</span>
              {highlight.subtitle ? (
                <span className="text-xs text-ink-muted">{highlight.subtitle}</span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {packs.length ? (
        <fieldset className="mt-6">
          <legend className="text-sm font-semibold text-ink">Available pack sizes</legend>

          <div className="mt-3 flex flex-wrap gap-2">
            {packs.map((size) => {
              const selected = size.id === pack?.id;
              const available = size.is_available !== false;

              return (
                <button
                  key={size.id}
                  type="button"
                  onClick={() => onSelectPack(size)}
                  disabled={!available}
                  aria-pressed={selected}
                  className={cn(
                    "h-11 min-w-[4.5rem] rounded-md border px-4 text-sm font-medium transition-colors duration-(--duration-fast)",
                    selected
                      ? "border-brand bg-brand text-on-brand"
                      : "border-line text-ink hover:border-brand",
                    // Struck through rather than merely dimmed: "unavailable"
                    // and "not selected" must not look like the same state.
                    !available && "cursor-not-allowed line-through opacity-50 hover:border-line",
                  )}
                >
                  {size.label}
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      {details.price !== null ? (
        <div className="mt-6">
          <div className="flex flex-wrap items-baseline gap-3">
            <span className="font-display text-3xl font-bold text-brand">
              {formatPrice(details.price)}
            </span>

            {details.comparePrice !== null ? (
              <>
                <span className="text-lg text-ink-subtle line-through">
                  {formatPrice(details.comparePrice)}
                </span>
                <span className="rounded-full bg-success-tint px-2.5 py-1 text-xs font-semibold text-success">
                  {details.discountPercent}% OFF
                </span>
              </>
            ) : null}
          </div>

          {details.includesVat ? (
            <p className="mt-1 text-sm text-ink-subtle">(Inclusive of VAT)</p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-1">
          <label htmlFor="quantity" className="mr-2 text-sm font-medium text-ink">
            Quantity
          </label>
          <button
            type="button"
            onClick={() => onQuantity(Math.max(1, quantity - 1))}
            disabled={quantity <= 1}
            aria-label="Decrease quantity"
            className="grid size-10 place-items-center rounded-md border border-line text-ink disabled:opacity-40"
          >
            <Minus size={15} strokeWidth={2} aria-hidden="true" />
          </button>
          <input
            id="quantity"
            type="number"
            min="1"
            value={quantity}
            onChange={(event) => onQuantity(Math.max(1, Number(event.target.value) || 1))}
            className="h-10 w-16 rounded-md border border-line text-center text-sm text-ink"
          />
          <button
            type="button"
            onClick={() => onQuantity(quantity + 1)}
            aria-label="Increase quantity"
            className="grid size-10 place-items-center rounded-md border border-line text-ink"
          >
            <Plus size={15} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-md bg-brand px-6 text-sm font-medium text-on-brand transition-colors duration-(--duration-fast) hover:bg-brand-dark sm:flex-none"
        >
          Enquire Now
        </button>

        {/* Only rendered when the download actually resolves — see useDownload.
            A button that 404s is worse than no button. */}
        {brochure ? (
          <a
            href={brochure.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-line px-6 text-sm font-medium text-ink transition-colors duration-(--duration-fast) hover:border-brand hover:text-brand"
          >
            <Download size={16} strokeWidth={2} aria-hidden="true" />
            {brochure.title ?? "Download Brochure"}
          </a>
        ) : null}
      </div>

      <div className="mt-5 flex flex-wrap gap-5 text-sm">
        <button
          type="button"
          disabled
          title="Saving products arrives with customer accounts"
          className="inline-flex items-center gap-2 text-ink-subtle"
        >
          <Heart size={16} strokeWidth={1.75} aria-hidden="true" />
          Add to Wishlist
        </button>

        <button
          type="button"
          onClick={onShare}
          className="inline-flex items-center gap-2 text-ink-muted hover:text-brand"
        >
          <Share2 size={16} strokeWidth={1.75} aria-hidden="true" />
          Share
        </button>
      </div>
    </div>
  );
}
