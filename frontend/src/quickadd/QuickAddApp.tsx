import { ThemeProvider } from 'next-themes';
import QuickAdd from './QuickAdd';

/** The phone entry page runs on its own: no Keeper login, router or server calls to the main API. */
export default function QuickAddApp() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QuickAdd />
    </ThemeProvider>
  );
}
