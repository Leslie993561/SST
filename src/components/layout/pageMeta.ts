export interface PageMeta {
  title: string;
  subtitle: string;
}

const PAGE_META: Record<string, PageMeta> = {
  dashboard: { title: "Dashboard SST", subtitle: "Visão geral · base unificada EPI + ASO" },
  epi: { title: "Gestão de EPI", subtitle: "Colaboradores, matriz por função e custos" },
  exames: { title: "Exames Ocupacionais", subtitle: "Controle de ASO, vencimentos, histórico e desligados" },
  programas: { title: "Programas de SST", subtitle: "Validade do PCMSO/PGR e revisão de cargos" },
  relatorios: { title: "Relatórios", subtitle: "Exportações, indicadores e regras futuras" },
  config: { title: "Configurações", subtitle: "Departamentos, catálogo, identificação e integrações" },
  acessos: { title: "Controle de Acessos", subtitle: "Contas com acesso ao portal" },
};

export function pageMetaFromPath(pathname: string): PageMeta {
  const segment = pathname.split("/").filter(Boolean)[0] ?? "dashboard";
  return PAGE_META[segment] ?? PAGE_META.dashboard;
}
