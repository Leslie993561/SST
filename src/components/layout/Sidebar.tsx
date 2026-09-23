import { NavLink } from "react-router-dom";
import { FileBarChart2, FileCheck2, KeyRound, LayoutDashboard, Settings, ShieldCheck, Stethoscope } from "lucide-react";
import styles from "./Sidebar.module.css";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard SST", icon: LayoutDashboard },
  { to: "/epi", label: "Gestão de EPI", icon: ShieldCheck },
  { to: "/exames", label: "Exames Ocupacionais", icon: Stethoscope },
  { to: "/programas", label: "Programas de SST", icon: FileCheck2 },
  { to: "/relatorios", label: "Relatórios", icon: FileBarChart2 },
  { to: "/config", label: "Configurações", icon: Settings },
  { to: "/acessos", label: "Controle de Acessos", icon: KeyRound },
];

export function Sidebar() {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <img
          src={`${import.meta.env.BASE_URL}assets/logo-msb-oficial.png`}
          alt="MSB · Medical System do Brasil"
          height={54}
        />
      </div>
      <div className={styles.sectionLabel}>Portal SST</div>
      <nav className={styles.nav}>
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ""}`}>
            <Icon size={18} strokeWidth={1.75} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className={styles.integrations}>
        Integrações
        <br />
        <strong>PeopleFlow · Academia MSB</strong>
        <div className={styles.integrationsHint}>previstas — etapa futura</div>
      </div>
    </aside>
  );
}
