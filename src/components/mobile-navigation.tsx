'use client';
import { ArrowLeftRight, Layers, LayoutDashboard, Menu, TrendingUp } from 'lucide-react';
const destinations = [
  { id: 'dashboard', label: 'Visão geral', icon: LayoutDashboard },
  { id: 'transactions', label: 'Movimentações', icon: ArrowLeftRight },
  { id: 'installments', label: 'Parcelamentos', icon: Layers },
  { id: 'investments', label: 'Investimentos', icon: TrendingUp },
];
export function MobileNavigation({
  page,
  menuOpen,
  onNavigate,
  onMenu,
}: {
  page: string;
  menuOpen: boolean;
  onNavigate: (id: string) => void;
  onMenu: () => void;
}) {
  const secondary = !destinations.some((d) => d.id === page);
  return (
    <nav className="mobile-bottom-nav" aria-label="Navegação do celular">
      {destinations.map((d) => (
        <button
          key={d.id}
          aria-label={`Ir para ${d.label}`}
          aria-current={page === d.id ? 'page' : undefined}
          className={page === d.id ? 'active' : ''}
          onClick={() => onNavigate(d.id)}
        >
          <d.icon size={21} />
          <span>{d.label}</span>
        </button>
      ))}
      <button
        aria-label="Abrir menu completo"
        aria-haspopup="dialog"
        aria-expanded={menuOpen}
        className={menuOpen || secondary ? 'active' : ''}
        onClick={onMenu}
      >
        <Menu size={21} />
        <span>Menu</span>
      </button>
    </nav>
  );
}
