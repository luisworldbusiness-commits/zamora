import { useEffect, useState, type FormEvent } from 'react';
import { Loader2, Send, MessageSquare, Phone } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { StarRating } from '@/components/ui/StarRating';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatPrice } from '@/lib/currency';
import { formatRelativeDate } from '@/lib/utils';
import type { Currency, ServiceProvider, ServiceProviderReview } from '@/types/db';

interface ServiceProviderModalProps {
  provider: ServiceProvider | null;
  currency: Currency;
  onClose: () => void;
  onReviewed: () => void;
}

export function ServiceProviderModal({ provider, currency, onClose, onReviewed }: ServiceProviderModalProps) {
  const { profile, language } = useApp();
  const { toast } = useToast();
  const tx = (es: string, en: string) => (language === 'es' ? es : en);

  const [reviews, setReviews] = useState<ServiceProviderReview[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const providerId = provider?.id;

  const loadReviews = async () => {
    if (!providerId) return;
    setLoading(true);
    setLoadError(false);
    const { data, error } = await supabase
      .from('service_provider_reviews')
      .select('*, reviewer:profiles(display_name, avatar_url)')
      .eq('provider_id', providerId)
      .order('created_at', { ascending: false });
    if (error) setLoadError(true);
    setReviews((data as ServiceProviderReview[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    setReviews([]);
    setRating(5);
    setComment('');
    setFormError('');
    void loadReviews();
  }, [providerId]);

  const alreadyReviewed = !!profile && reviews.some((r) => r.reviewer_id === profile.id);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!profile || !providerId) return;
    setSubmitting(true);
    setFormError('');
    const { error } = await supabase.from('service_provider_reviews').insert({
      provider_id: providerId,
      reviewer_id: profile.id,
      rating,
      comment: comment.trim(),
    });
    setSubmitting(false);
    if (error) {
      setFormError(
        error.code === '23505'
          ? tx('Ya dejaste una reseña para esta persona.', 'You already reviewed this person.')
          : tx('No se pudo publicar la reseña.', 'The review could not be posted.')
      );
      return;
    }
    setComment('');
    setRating(5);
    toast(tx('Reseña publicada', 'Review posted'), 'success');
    onReviewed();
    void loadReviews();
  };

  return (
    <Modal open={!!provider} onClose={onClose} title={provider?.full_name ?? ''} size="lg">
      {provider && (
        <div className="space-y-6">
          <div className="flex items-start gap-4">
            {provider.avatar_url ? (
              <img src={provider.avatar_url} alt="" className="h-16 w-16 shrink-0 rounded-2xl object-cover" />
            ) : (
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary-100 text-xl font-bold text-primary-700">
                {provider.full_name.charAt(0)}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-neutral-900">{provider.headline}</p>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                <StarRating rating={provider.score} showValue size={14} />
                <span className="text-xs text-neutral-500">
                  {provider.reviews_count} {tx('reseñas', 'reviews')}
                </span>
              </div>
              <p className="mt-2 text-sm font-semibold text-accent-700">
                {tx('Desde', 'From')} {formatPrice(provider.price, currency)}
              </p>
            </div>
          </div>

          {provider.bio && <p className="whitespace-pre-line text-sm leading-relaxed text-neutral-700">{provider.bio}</p>}

          {provider.phone && (
            <a href={`tel:${provider.phone}`} className="btn-outline w-full sm:w-auto">
              <Phone size={16} /> {provider.phone}
            </a>
          )}

          <section className="space-y-3">
            <h3 className="flex items-center gap-2 text-base font-bold text-neutral-900">
              <MessageSquare size={18} className="text-primary-600" />
              {tx('Reseñas', 'Reviews')}
            </h3>

            {profile && !alreadyReviewed && (
              <form onSubmit={handleSubmit} className="card space-y-3 p-4">
                <div>
                  <label className="label">{tx('Calificación', 'Rating')}</label>
                  <StarRating rating={rating} interactive onChange={setRating} size={22} />
                </div>
                <div>
                  <label className="label">{tx('Comentario', 'Comment')}</label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={3}
                    maxLength={1000}
                    className="input"
                    required
                  />
                </div>
                {formError && <p className="text-sm text-error-600">{formError}</p>}
                <button type="submit" disabled={submitting} className="btn-primary">
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  {tx('Publicar reseña', 'Post review')}
                </button>
              </form>
            )}

            {!profile && <p className="py-2 text-center text-sm text-neutral-500">{tx('Inicia sesión para dejar una reseña.', 'Sign in to leave a review.')}</p>}

            {loading ? (
              <div className="flex justify-center py-6"><Spinner /></div>
            ) : loadError ? (
              <p className="py-4 text-center text-sm text-error-600">{tx('No se pudieron cargar las reseñas.', 'Reviews could not be loaded.')}</p>
            ) : reviews.length === 0 ? (
              <EmptyState icon={MessageSquare} title={tx('Aún no hay reseñas', 'No reviews yet')} />
            ) : (
              <div className="space-y-3">
                {reviews.map((r) => (
                  <div key={r.id} className="card p-4">
                    <div className="mb-2 flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">
                        {(r.reviewer?.display_name || 'A').charAt(0)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-neutral-800">{r.reviewer?.display_name || tx('Anónimo', 'Anonymous')}</p>
                        <p className="text-xs text-neutral-400">{formatRelativeDate(r.created_at, language)}</p>
                      </div>
                      <StarRating rating={r.rating} size={14} />
                    </div>
                    {r.comment && <p className="text-sm text-neutral-700">{r.comment}</p>}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </Modal>
  );
}
