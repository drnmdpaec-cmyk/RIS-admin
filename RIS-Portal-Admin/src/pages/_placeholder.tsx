// Placeholder — will be implemented in the next build phase
import { Construction } from 'lucide-react';

interface Props { title: string; }
export function PlaceholderPage({ title }: Props) {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-3 text-[var(--color-text-muted)]">
      <Construction size={32} />
      <p className="text-[13px] font-medium">{title}</p>
      <p className="text-[12px]">Coming in the next phase</p>
    </div>
  );
}
