import { useState, type FormEvent } from 'react';
import type { Trip } from '../../api/types';
import { useWorkspace } from '../../auth/AuthProvider';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { MoneyInput } from '../../components/ui/MoneyInput';
import { useSaveTrip } from '../../hooks/useTrips';
import { today } from '../../lib/dates';
import { parseMoney, toInputValue } from '../../lib/money';

/** Create or edit a trip: a name, the dates, and an optional budget in your main currency. */
export function TripForm({ trip, onClose, onSaved }: { trip?: Trip; onClose: () => void; onSaved?: (t: Trip) => void }) {
  const { baseCurrency } = useWorkspace();
  const save = useSaveTrip();
  const [name, setName] = useState(trip?.name ?? '');
  const [start, setStart] = useState(trip?.startDate ?? today());
  const [end, setEnd] = useState(trip?.endDate ?? today());
  const [budget, setBudget] = useState(trip?.budgetMinor ? toInputValue(trip.budgetMinor, baseCurrency) : '');
  const [notes, setNotes] = useState(trip?.notes ?? '');
  const [error, setError] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const budgetMinor = budget ? parseMoney(budget, baseCurrency) : null;
    if (!name.trim()) return setError('Give the trip a name');
    if (end < start) return setError("The end date can't be before the start date");
    if (budget && !budgetMinor) return setError('The budget is not a valid amount');
    save.mutate({ id: trip?.id, body: { name: name.trim(), startDate: start, endDate: end, budgetMinor, notes: notes || null } }, { onSuccess: (t) => { onSaved?.(t); onClose(); } });
  };

  return (
    <Modal isOpen onClose={onClose} title={trip ? 'Edit trip' : 'New trip'}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Name" error={error}><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Lisbon, Goa with friends…" maxLength={160} autoFocus /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="From"><Input type="date" value={start} onChange={(e) => { setStart(e.target.value); if (end < e.target.value) setEnd(e.target.value); }} /></Field>
          <Field label="To"><Input type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} /></Field>
        </div>
        <Field label={`Budget (${baseCurrency}, optional)`}><MoneyInput value={budget} currency={baseCurrency} onChange={setBudget} /></Field>
        <Field label="Notes"><Input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} placeholder="Optional" /></Field>
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={save.isPending}>Save</Button></div>
      </form>
    </Modal>
  );
}
