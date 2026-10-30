import { Banknote } from 'lucide-react';
import { useAnswerInvitation, useInvitations } from '../../hooks/useLending';
import { Button } from '../ui/Button';

/** Offers of a lent account, shown wherever you are until you answer them. */
export function InvitationBanner() {
  const invitations = useInvitations().data ?? [];
  const answer = useAnswerInvitation();
  if (invitations.length === 0) return null;
  return (
    <div className="space-y-2 mb-6">
      {invitations.map((i) => (
        <div key={i.id} role="status" className="glass-panel p-4 flex flex-wrap items-center gap-3 border-accent">
          <Banknote className="w-5 h-5 text-accent shrink-0" />
          <p className="text-sm flex-1 min-w-[12rem]">
            <strong>{i.ownerName}</strong> offered you <strong>{i.accountName}</strong> ({i.currency}). What you spend on it is recorded in both your ledgers; it never counts in your net worth.
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={answer.isPending} onClick={() => answer.mutate({ id: i.id, accept: false })}>Decline</Button>
            <Button size="sm" disabled={answer.isPending} onClick={() => answer.mutate({ id: i.id, accept: true })}>Accept</Button>
          </div>
        </div>
      ))}
    </div>
  );
}
