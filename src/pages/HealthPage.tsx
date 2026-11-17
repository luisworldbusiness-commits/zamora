import { useState } from 'react';
import { Phone, MapPin, Siren, Flame, Ambulance, Pill, Building2, Stethoscope, Hospital, HeartHandshake, MessageCircle } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useEmergencies } from '@/lib/hooks';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { cn } from '@/lib/utils';
import type { EmergencyContact } from '@/types/db';

const categoryConfig: Record<EmergencyContact['category'], { icon: typeof Siren; color: string; labelEs: string; labelEn: string }> = {
  police: { icon: Siren, color: 'bg-accent-50 text-accent-600', labelEs: 'Policía', labelEn: 'Police' },
  fire: { icon: Flame, color: 'bg-error-50 text-error-600', labelEs: 'Bomberos', labelEn: 'Fire' },
  ambulance: { icon: Ambulance, color: 'bg-error-50 text-error-600', labelEs: 'Ambulancia', labelEn: 'Ambulance' },
  pharmacy: { icon: Pill, color: 'bg-secondary-50 text-secondary-600', labelEs: 'Farmacia', labelEn: 'Pharmacy' },
  health_center: { icon: Building2, color: 'bg-primary-50 text-primary-600', labelEs: 'Centro de Salud', labelEn: 'Health Center' },
  doctor: { icon: Stethoscope, color: 'bg-primary-50 text-primary-600', labelEs: 'Doctor', labelEn: 'Doctor' },
  clinic: { icon: Hospital, color: 'bg-primary-50 text-primary-600', labelEs: 'Clínica', labelEn: 'Clinic' },
  funeral: { icon: HeartHandshake, color: 'bg-neutral-100 text-neutral-700', labelEs: 'Funeraria', labelEn: 'Funeral Services' },
};

export function HealthPage() {
  const { t, language } = useApp();
  const { emergencies, loading } = useEmergencies();
  const [filter, setFilter] = useState<string | null>(null);

  const categories = ['police', 'fire', 'ambulance', 'pharmacy', 'health_center', 'doctor', 'clinic', 'funeral'];
  const filtered = filter ? emergencies.filter((e) => e.category === filter) : emergencies;

  return (
    <div className="container-app py-8">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-1">
          {language === 'es' ? 'Salud & Emergencias' : 'Health & Emergencies'}
        </h1>
        <p className="text-sm text-neutral-500">
          {language === 'es' ? 'Números de emergencia y directorio de salud' : 'Emergency numbers and health directory'}
        </p>
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setFilter(null)}
          className={cn(
            'badge px-3 py-1.5 transition',
            !filter ? 'bg-primary-600 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
          )}
        >
          {t('common.all')}
        </button>
        {categories.map((c) => {
          const cfg = categoryConfig[c as keyof typeof categoryConfig];
          return (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={cn(
                'badge px-3 py-1.5 transition',
                filter === c ? 'bg-primary-600 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              )}
            >
              {language === 'es' ? cfg.labelEs : cfg.labelEn}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Siren} title={t('common.empty')} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((e) => {
            const cfg = categoryConfig[e.category];
            const Icon = cfg.icon;
            const phoneAvailable = e.phone !== 'No publicado';
            const primaryPhone = e.phone.split('/')[0].trim();
            const descriptionLines = e.description ? e.description.split('\n') : [];
            return (
              <div
                key={e.id}
                className="card p-5 hover:shadow-card-hover transition group flex flex-col"
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className={cn('rounded-xl p-2.5', cfg.color)}>
                    <Icon size={22} />
                  </span>
                  <div>
                    <p className="font-semibold text-neutral-900">{e.name}</p>
                    <p className="text-xs text-neutral-500">{language === 'es' ? cfg.labelEs : cfg.labelEn}</p>
                  </div>
                  {e.is_on_duty && (
                    <span className="ml-auto badge bg-success-100 text-success-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-success-500" />
                      {language === 'es' ? 'De turno' : 'On duty'}
                    </span>
                  )}
                </div>
                {descriptionLines.length > 0 && (
                  <ul className="mb-3 list-inside list-disc space-y-1 text-sm text-neutral-600">
                    {descriptionLines.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                )}
                {phoneAvailable ? (
                  <a
                    href={`tel:${primaryPhone}`}
                    className="flex items-center gap-2 text-base font-semibold text-primary-700 hover:text-primary-800 transition"
                  >
                    <Phone size={16} />
                    {e.phone}
                  </a>
                ) : (
                  <div className="flex items-center gap-2 text-base font-semibold text-neutral-500">
                    <Phone size={16} />
                    {language === 'es' ? 'Teléfono no publicado' : 'Phone not published'}
                  </div>
                )}
                {e.address && (
                  <div className="flex items-center gap-2 text-xs text-neutral-500 mt-1.5">
                    <MapPin size={12} /> {e.address}
                  </div>
                )}
                {e.whatsapp && (
                  <a
                    href={`https://wa.me/${e.whatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-auto pt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-success-600 px-4 py-2 text-sm font-semibold text-white hover:bg-success-700 transition"
                  >
                    <MessageCircle size={16} />
                    WhatsApp
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
