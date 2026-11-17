import { useState, type FormEvent } from 'react';
import { Loader2, Lock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { parseEuroRate } from '@/lib/currency';
import { cn, formatRelativeDate } from '@/lib/utils';

type ItemKind = 'business' | 'product' | 'user';

interface PanelItem {
  id: string;
  name: string;
  status: string;
  note?: string | null;
  role?: string;
  created_at: string;
}

interface PanelData {
  tasa_euro: string;
  businesses: PanelItem[];
  products: PanelItem[];
  users: PanelItem[];
}

type Approvals = Record<string, boolean>;

interface AdminPanelModalProps {
  open: boolean;
  onClose: () => void;
}

const keyOf = (kind: ItemKind, id: string) => `${kind}:${id}`;

function isPanelData(value: unknown): value is PanelData {
  if (!value || typeof value !== 'object') return false;
  const panel = value as Record<string, unknown>;
  return typeof panel.tasa_euro === 'string' && Array.isArray(panel.businesses) && Array.isArray(panel.products) && Array.isArray(panel.users);
}

async function fetchPanel(password: string): Promise<PanelData | null> {
  const { data, error } = await supabase.rpc('admin_panel_load', { p_password: password });
  if (error || !isPanelData(data)) return null;
  return data;
}

export function AdminPanelModal({ open, onClose }: AdminPanelModalProps) {
  const { language, refreshSettings } = useApp();
  const { toast } = useToast();
  const tx = (es: string, en: string) => (language === 'es' ? es : en);

  const [password, setPassword] = useState('');
  const [data, setData] = useState<PanelData | null>(null);
  const [rateInput, setRateInput] = useState('');
  const [savedRate, setSavedRate] = useState('');
  const [approvals, setApprovals] = useState<Approvals>({});
  const [savedApprovals, setSavedApprovals] = useState<Approvals>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const applyPanel = (panel: PanelData) => {
    const next: Approvals = {};
    for (const item of panel.businesses) next[keyOf('business', item.id)] = item.status === 'approved';
    for (const item of panel.products) next[keyOf('product', item.id)] = item.status === 'approved';
    for (const item of panel.users) next[keyOf('user', item.id)] = item.status === 'approved';
    setData(panel);
    setRateInput(panel.tasa_euro);
    setSavedRate(panel.tasa_euro);
    setApprovals(next);
    setSavedApprovals(next);
  };

  const handleExit = () => {
    setPassword('');
    setData(null);
    setRateInput('');
    setSavedRate('');
    setApprovals({});
    setSavedApprovals({});
    setError('');
    onClose();
  };

  const handleUnlock = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    const panel = await fetchPanel(password);
    setBusy(false);
    if (!panel) {
      setError(tx('Clave incorrecta o sin permiso de administrador.', 'Wrong password or no admin permission.'));
      return;
    }
    applyPanel(panel);
  };

  const handleCancel = () => {
    setApprovals(savedApprovals);
    setRateInput(savedRate);
    setError('');
  };

  const handleSave = async () => {
    const changes = Object.entries(approvals)
      .filter(([key, approved]) => approved !== savedApprovals[key])
      .map(([key, approved]) => {
        const [kind, id] = key.split(':');
        return { kind, id, approved };
      });
    const rateChanged = rateInput.trim() !== savedRate;
    const newRate = rateChanged ? parseEuroRate(rateInput) : null;

    if (rateChanged && newRate === null) {
      setError(tx('La tasa debe ser un número mayor que cero.', 'The rate must be a number greater than zero.'));
      return;
    }
    if (changes.length === 0 && !rateChanged) {
      toast(tx('No hay cambios que guardar', 'No changes to save'), 'info');
      return;
    }

    setBusy(true);
    setError('');
    const { error: saveError } = await supabase.rpc('admin_panel_save', {
      p_password: password,
      p_rate: newRate,
      p_changes: changes,
    });
    if (saveError) {
      setBusy(false);
      setError(tx('No se pudieron guardar los cambios.', 'The changes could not be saved.'));
      return;
    }
    const fresh = await fetchPanel(password);
    setBusy(false);
    if (fresh) applyPanel(fresh);
    await refreshSettings();
    toast(tx('Cambios guardados', 'Changes saved'), 'success');
  };

  const toggleItem = (key: string) => {
    setApprovals((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const setSection = (kind: ItemKind, items: PanelItem[], approved: boolean) => {
    setApprovals((prev) => {
      const next = { ...prev };
      for (const item of items) next[keyOf(kind, item.id)] = approved;
      return next;
    });
  };

  const sections = data
    ? [
        { kind: 'business' as const, title: tx('Tiendas', 'Stores'), items: data.businesses },
        { kind: 'product' as const, title: tx('Productos nuevos', 'New products'), items: data.products },
        { kind: 'user' as const, title: tx('Usuarios nuevos', 'New users'), items: data.users },
      ]
    : [];

  const describe = (item: PanelItem, kind: ItemKind) => {
    const date = formatRelativeDate(item.created_at, language);
    if (kind === 'product') return [item.note, date].filter(Boolean).join(' · ');
    if (kind === 'user') return `${item.role ?? ''} · ${date}`;
    return date;
  };

  return (
    <Modal open={open} onClose={handleExit} title={tx('Tasa y aprobaciones', 'Rate and approvals')} size="lg">
      {!data ? (
        <form onSubmit={handleUnlock} className="space-y-4">
          <div className="flex items-center gap-3 rounded-xl bg-primary-50 p-4 text-primary-800">
            <Lock size={20} className="shrink-0" />
            <p className="text-sm">{tx('Escribe la clave del panel para continuar.', 'Enter the panel password to continue.')}</p>
          </div>
          <div>
            <label className="label">{tx('Clave del panel', 'Panel password')}</label>
            <input type="password" autoComplete="new-password" required value={password} onChange={(event) => setPassword(event.target.value)} className="input" />
          </div>
          {error && <p className="text-sm text-error-600">{error}</p>}
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={handleExit} className="btn-outline">{tx('Salir', 'Exit')}</button>
            <button type="submit" disabled={busy} className="btn-primary">
              {busy && <Loader2 size={16} className="animate-spin" />} {tx('Entrar', 'Enter')}
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-6">
          <section className="card space-y-2 p-4">
            <label className="label">{tx('Tasa del euro de hoy (Bs. por €)', "Today's euro rate (Bs. per €)")}</label>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={rateInput}
              onChange={(event) => setRateInput(event.target.value)}
              className="input max-w-xs"
              placeholder="0.00"
            />
            <p className="text-xs text-neutral-500">
              {tx('Al guardar, los montos en Bs. de los pagos se recalculan con esta tasa.', 'When saved, the Bs. amounts in payments are recalculated with this rate.')}
            </p>
          </section>

          {sections.map((section) => (
            <section key={section.kind} className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold text-neutral-900">
                  {section.title} <span className="text-neutral-400">({section.items.length})</span>
                </h3>
                <div className="ml-auto flex gap-3">
                  <button type="button" onClick={() => setSection(section.kind, section.items, true)} className="text-xs font-semibold text-primary-700 hover:underline">
                    {tx('Seleccionar todos', 'Select all')}
                  </button>
                  <button type="button" onClick={() => setSection(section.kind, section.items, false)} className="text-xs font-semibold text-error-600 hover:underline">
                    {tx('Deseleccionar todos', 'Deselect all')}
                  </button>
                </div>
              </div>

              {section.items.length === 0 ? (
                <p className="py-3 text-sm text-neutral-500">{tx('No hay registros nuevos.', 'No new records.')}</p>
              ) : (
                <div className="divide-y divide-neutral-100 rounded-xl border border-neutral-200">
                  {section.items.map((item) => {
                    const key = keyOf(section.kind, item.id);
                    const approved = !!approvals[key];
                    return (
                      <label key={key} className="flex cursor-pointer items-center gap-3 px-3 py-2.5 transition hover:bg-neutral-50">
                        <input type="checkbox" checked={approved} onChange={() => toggleItem(key)} className="h-4 w-4 shrink-0 accent-primary-600" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-neutral-900">{item.name}</p>
                          <p className="truncate text-xs text-neutral-500">{describe(item, section.kind)}</p>
                        </div>
                        <span className={cn('badge shrink-0', approved ? 'bg-success-100 text-success-700' : 'bg-error-100 text-error-700')}>
                          {approved ? tx('Aprobar', 'Approve') : tx('Rechazar', 'Reject')}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </section>
          ))}

          {error && <p className="text-sm text-error-600">{error}</p>}

          <div className="flex flex-wrap justify-end gap-2 border-t border-neutral-100 pt-4">
            <button type="button" onClick={handleCancel} disabled={busy} className="btn-outline">{tx('Cancelar', 'Cancel')}</button>
            <button type="button" onClick={handleExit} disabled={busy} className="btn-outline">{tx('Salir', 'Exit')}</button>
            <button type="button" onClick={handleSave} disabled={busy} className="btn-primary">
              {busy && <Loader2 size={16} className="animate-spin" />} {tx('Guardar', 'Save')}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
