import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Store, UserX, Wrench } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useService, useServiceProviders } from '@/lib/hooks';
import { formatPrice } from '@/lib/currency';
import { ServiceProviderCard } from '@/components/cards/ServiceProviderCard';
import { ServiceProviderModal } from '@/components/services/ServiceProviderModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';

export function ServiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { currency, language } = useApp();
  const tx = (es: string, en: string) => (language === 'es' ? es : en);
  const { service, loading: serviceLoading, error: serviceError } = useService(id);
  const { providers, loading: providersLoading, error: providersError, reload } = useServiceProviders(id);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected: ServiceProvider | null = providers.find((p) => p.id === selectedId) ?? null;

  if (serviceLoading) return <div className="flex justify-center py-20"><Spinner /></div>;

  if (serviceError || !service) {
    return (
      <div className="container-app py-16">
        <EmptyState icon={Wrench} title={tx('No encontramos este servicio', 'We could not find this service')} />
        <div className="mt-6 text-center">
          <Link to="/services" className="btn-outline">{tx('Volver a servicios', 'Back to services')}</Link>
        </div>
      </div>
    );
  }

  const priceRange = `${formatPrice(service.price_from, currency)}${service.price_to > service.price_from ? ` – ${formatPrice(service.price_to, currency)}` : ''}`;

  return (
    <div className="container-app py-8">
      <Link to="/services" className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-700 hover:underline">
        <ArrowLeft size={16} /> {tx('Volver a servicios', 'Back to services')}
      </Link>

      <section className="card mb-8 flex flex-col gap-6 p-6 md:flex-row md:items-center">
        <div className="h-28 w-28 shrink-0 overflow-hidden rounded-2xl bg-accent-50">
          {service.image_url ? (
            <img src={service.image_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-accent-600">
              <Wrench size={36} />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="mb-1 text-2xl font-bold text-neutral-900 md:text-3xl">{service.name}</h1>
          {service.business && (
            <Link to={`/business/${service.business.slug}`} className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-primary-700">
              <Store size={14} /> {service.business.name}
            </Link>
          )}
          {service.description && <p className="mt-3 text-sm leading-relaxed text-neutral-600">{service.description}</p>}
        </div>
        <div className="shrink-0 rounded-xl bg-accent-50 px-4 py-3 text-center">
          <p className="text-xs text-neutral-500">{tx('Precio estimado', 'Estimated price')}</p>
          <p className="text-sm font-bold text-accent-700">{priceRange}</p>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-neutral-900">{tx('Personas disponibles', 'Available people')}</h2>
          <p className="text-sm text-neutral-500">{tx('Ordenadas por calificación. Revisa su perfil y sus reseñas antes de contratar.', 'Sorted by rating. Check their profile and reviews before hiring.')}</p>
        </div>

        {providersLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : providersError ? (
          <p className="py-10 text-center text-sm text-error-600">{tx('No se pudieron cargar las personas. Intenta de nuevo más tarde.', 'People could not be loaded. Please try again later.')}</p>
        ) : providers.length === 0 ? (
          <EmptyState icon={UserX} title={tx('Aún no hay personas listadas para este servicio', 'No people listed for this service yet')} />
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {providers.map((provider) => (
              <ServiceProviderCard key={provider.id} provider={provider} currency={currency} onOpen={(p) => setSelectedId(p.id)} />
            ))}
          </div>
        )}
      </section>

      <ServiceProviderModal
        provider={selected}
        currency={currency}
        onClose={() => setSelectedId(null)}
        onReviewed={reload}
      />
    </div>
  );
}
