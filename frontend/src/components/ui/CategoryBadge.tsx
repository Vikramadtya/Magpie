import { cn } from '../../lib/cn';
import { Avatar } from './Avatar';

/**
 * A category as a round badge: its emoji in its own colour. Sub-categories borrow the parent's look,
 * so the same category looks the same on every screen. Falls back to a lettered avatar.
 */
export function CategoryBadge({ name, icon, color, size = 36, className }: { name: string; icon?: string | null; color?: string | null; size?: number; className?: string }) {
  if (!icon && !color) return <Avatar name={name} size={size} className={className} />;
  return (
    <span
      aria-hidden
      className={cn('inline-flex items-center justify-center rounded-full shrink-0 font-semibold', className)}
      style={{ width: size, height: size, fontSize: size * 0.46, background: `color-mix(in srgb, ${color ?? 'var(--accent-blue)'} 16%, transparent)`, color: color ?? 'var(--accent-blue)' }}
    >
      {icon || name.trim().charAt(0).toUpperCase() || '?'}
    </span>
  );
}
