import { ChevronRight } from 'lucide-react';
import type { ServiceProvider, Currency } from '@/types/db';
import { useApp } from '@/context/AppContext';
import { formatPrice } from '@/lib/currency';
import { StarRating } from '@/components/ui/StarRating';

interface ServiceProviderCardProps {
  provider: ServiceProvider;
  currency: Currency;
  onOpen: (provider: ServiceProvider) => void;
}

export function ServiceProviderCard({ provider, currency, onOpen }: ServiceProviderCardProps) {
  const { language } = useApp();
  const tx = (es: string, en: string) => (language === 'es' ? es : en);

  return (
    <button
      type="button"
      onClick={() => onOpen(provider)}
      className="group card flex w-full items-center gap-4 p-5 text-left transition hover:shadow-card-hover"
    >
      {provider.avatar_url ? (
        <img src={provider.avatar_url} alt="" className="h-14 w-14 shrink-0 rounded-2xl object-cover" />
      ) : (
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-100 text-lg font-bold text-primary-700">
          {provider.full_name.charAt(0)}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-neutral-900">{provider.full_name}</p>
        <p className="truncate text-xs text-neutral-500">{provider.headline}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          <StarRating rating={provider.score} showValue size={12} />
          <span className="text-xs text-neutral-500">
            ({provider.reviews_count} {tx('reseñas', 'reviews')})
          </span>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-xs text-neutral-500">{tx('Desde', 'From')}</p>
        <p className="text-sm font-bold text-accent-700">{formatPrice(provider.price, currency)}</p>
        <span className="mt-1 hidden items-center gap-0.5 text-xs font-semibold text-primary-700 sm:inline-flex">
          {tx('Ver perfil', 'View profile')}
          <ChevronRight size={14} className="transition group-hover:translate-x-0.5" />
        </span>
      </div>
    </button>
  );
}
