// íconos del menú, salen de lucide-react
import {
  GraduationCap, Menu, Home, Users, Activity, RefreshCw, Handshake, CircleDollarSign,
  Building2, BarChart3, CreditCard, CalendarClock, UserCog, Settings, ClipboardList,
  Lock, LayoutList, School,
} from 'lucide-react';

const ICONOS = {
  marca: GraduationCap,
  menu: Menu,
  inicio: Home,
  leads: Users,
  seguimiento: Activity,
  conversion: RefreshCw,
  aliados: Handshake,
  comisiones: CircleDollarSign,
  portal: Building2,
  reportes: BarChart3,
  pagos: CreditCard,
  suscripcion: CalendarClock,
  planes: LayoutList,
  instituciones: School,
  candado: Lock,
  usuarios: UserCog,
  configuracion: Settings,
  auditoria: ClipboardList,
};

export default function Icono({ nombre, tam = 18 }) {
  const Componente = ICONOS[nombre];
  if (!Componente) return null;
  return <Componente size={tam} strokeWidth={1.8} aria-hidden="true" />;
}
