import { toast } from 'sonner';

/** A success toast with a tick that draws itself: the small reward for saving something. */
export function saved(message: string) {
  toast.success(message, {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" className="saved-ring" aria-hidden>
        <circle cx="12" cy="12" r="11" fill="#30A46C" />
        <path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="saved-tick" />
      </svg>
    ),
  });
}
