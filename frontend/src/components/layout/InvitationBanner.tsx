import { Banknote, Users } from 'lucide-react';
import { householdActions, useHouseholdAction, useHouseholds } from '../../hooks/useHousehold';
import { useAnswerInvitation, useInvitations } from '../../hooks/useLending';
import { Button } from '../ui/Button';

/** Offers of a lent account, shown wherever you are until you answer them. */
export function InvitationBanner() {
  const invitations = useInvitations().data ?? [];
  const answer = useAnswerInvitation();
  const homes = (useHouseholds().data ?? []).filter((h) => h.myStatus === 'PENDING');
  const accept = useHouseholdAction(householdActions.accept);
  const decline = useHouseholdAction(householdActions.leave);
  if (invitations.length === 0 && homes.length === 0) return null;
  return (
    <div className="space-y-2 mb-6">
      {homes.map((h) => (
        <div key={h.id} role="status" className="glass-panel p-4 flex flex-wrap items-center gap-3 border-accent">
          <Users className="w-5 h-5 text-accent shrink-0" />
          <p className="text-sm flex-1 min-w-[12rem]">You're invited to the <strong>{h.name}</strong> household: a read-only combined view. You choose what you share and can leave any time.</p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={decline.isPending} onClick={() => decline.mutate(h.id)}>Decline</Button>
            <Button size="sm" disabled={accept.isPending} onClick={() => accept.mutate(h.id)}>Join</Button>
          </div>
        </div>
      ))}
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
