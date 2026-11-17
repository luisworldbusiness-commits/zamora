import { useState, type FormEvent } from 'react';
import { Loader2, Plus, Trash2, UserX } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { StarRating } from '@/components/ui/StarRating';
import { useServiceProviders } from '@/lib/hooks';
import type { Service } from '@/types/db';

interface ServiceProvidersModalProps {
  service: Service | null;
  onClose: () => void;
}

const emptyForm = { full_name: '', headline: '', bio: '', phone: '', price: '' };

export function ServiceProvidersModal({ service, onClose }: ServiceProvidersModalProps) {
  const { language } = useApp();
  const { toast } = useToast();
  const tx = (es: string, en: string) => (language === 'es' ? es : en);
  const { providers, loading, error, reload } = useServiceProviders(service?.id);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const update = (field: keyof typeof emptyForm) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [field]: event.target.value }));

  const handleAdd = async (event: FormEvent) => {
    event.preventDefault();
    if (!service) return;
    const price = Number(form.price || 0);
    if (!Number.isFinite(price) || price < 0) {
      setFormError(tx('El precio debe ser un número mayor o igual a cero.', 'The price must be zero or more.'));
      return;
    }
    setSaving(true);
    setFormError('');
    const { error: insertError } = await supabase.from('service_providers').insert({
      service_id: service.id,
      full_name: form.full_name.trim(),
      headline: form.headline.trim(),
      bio: form.bio.trim(),
      phone: form.phone.trim(),
      price,
    });
    setSaving(false);
    if (insertError) {
      setFormError(tx('No se pudo agregar la persona.', 'The person could not be added.'));
      return;
    }
    setForm(emptyForm);
    toast(tx('Persona agregada', 'Person added'), 'success');
    reload();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(tx('¿Quitar a esta persona del servicio?', 'Remove this person from the service?'))) return;
    const { error: deleteError } = await supabase.from('service_providers').delete().eq('id', id);
    if (deleteError) {
      toast(tx('No se pudo quitar a la persona.', 'The person could not be removed.'), 'error');
      return;
    }
    reload();
  };

  return (
    <Modal open={!!service} onClose={onClose} title={tx(`Personas de "${service?.name ?? ''}"`, `People for "${service?.name ?? ''}"`)} size="lg">
      <div className="space-y-6">
        <form onSubmit={handleAdd} className="card space-y-3 p-4">
          <h3 className="flex items-center gap-2 font-semibold text-neutral-900"><Plus size={16} className="text-primary-600" /> {tx('Agregar persona', 'Add person')}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">{tx('Nombre completo', 'Full name')}</label>
              <input value={form.full_name} onChange={update('full_name')} className="input" required maxLength={120} />
            </div>
            <div>
              <label className="label">{tx('Especialidad', 'Specialty')}</label>
              <input value={form.headline} onChange={update('headline')} className="input" placeholder={tx('Ej. Limpieza profunda', 'E.g. Deep cleaning')} maxLength={120} />
            </div>
            <div>
              <label className="label">{tx('Teléfono', 'Phone')}</label>
              <input value={form.phone} onChange={update('phone')} className="input" maxLength={40} />
            </div>
            <div>
              <label className="label">{tx('Precio desde', 'Price from')}</label>
              <input type="number" min="0" step="0.01" value={form.price} onChange={update('price')} className="input" />
            </div>
          </div>
          <div>
            <label className="label">{tx('Descripción', 'Description')}</label>
            <textarea value={form.bio} onChange={update('bio')} rows={3} className="input" maxLength={1000} />
          </div>
          {formError && <p className="text-sm text-error-600">{formError}</p>}
          <button type="submit" disabled={saving} className="btn-primary">
            {saving && <Loader2 size={16} className="animate-spin" />} {tx('Agregar', 'Add')}
          </button>
        </form>

        {loading ? (
          <div className="flex justify-center py-6"><Spinner /></div>
        ) : error ? (
          <p className="py-4 text-center text-sm text-error-600">{tx('No se pudieron cargar las personas.', 'People could not be loaded.')}</p>
        ) : providers.length === 0 ? (
          <EmptyState icon={UserX} title={tx('Aún no agregas personas a este servicio', 'No people added to this service yet')} />
        ) : (
          <div className="divide-y divide-neutral-100 rounded-xl border border-neutral-200">
            {providers.map((provider) => (
              <div key={provider.id} className="flex items-center gap-3 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-neutral-900">{provider.full_name}</p>
                  <div className="flex items-center gap-2">
                    <StarRating rating={provider.score} size={12} />
                    <span className="text-xs text-neutral-500">({provider.reviews_count})</span>
                  </div>
                </div>
                <button type="button" onClick={() => handleDelete(provider.id)} className="rounded-lg p-1.5 text-error-500 hover:bg-error-50" aria-label={tx('Quitar', 'Remove')}>
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
