import { FileSpreadsheet, ShieldCheck, Users, GraduationCap } from "lucide-react";
import { usePortalStore } from "../../store/PortalStoreContext";
import { portalRepository } from "../../repositories/portalRepository";
import { Card, StatusBadge } from "../../components/ui";
import { deptName } from "../../domain/text";
import styles from "./ConfigPage.module.css";

export function ConfigPage() {
  const { state } = usePortalStore();
  const geradoEm = portalRepository.getGeradoEm();

  const deptCounts = new Map<string, number>();
  state.colaboradores
    .filter((c) => !state.desligados[c.id])
    .forEach((c) => {
      const dept = deptName(c.departamento);
      deptCounts.set(dept, (deptCounts.get(dept) ?? 0) + 1);
    });
  const deptRows = [...deptCounts.entries()].sort((a, b) => a[0].localeCompare(b[0], "pt-BR"));
  const catalogo = portalRepository.getEpiCatalogo();

  return (
    <div className={styles.grid}>
      <Card className={styles.fullWidth}>
        <div className={styles.sourceHeader}>
          <div className={styles.sourceIcon}>
            <FileSpreadsheet size={20} />
          </div>
          <div>
            <div className={styles.title}>Fonte de dados · base EPI + ASO</div>
            <div className={styles.subtitle}>
              A base é gerada a partir da planilha oficial de EPI/ASO e da matriz PCMSO/PGR, atualizada em <strong>{geradoEm}</strong>.
              Os lançamentos do RH (entregas, anexos, valores, desligamentos) ficam em uma camada separada e nunca são sobrescritos por
              uma nova importação.
            </div>
          </div>
        </div>
        <div className={styles.roadmapNote}>
          Importação direta de planilha (.xlsx) pelo navegador está no roadmap — hoje a atualização da base de origem é feita pela
          equipe de dados, via nova exportação para o repositório.
        </div>
      </Card>

      <Card>
        <div className={styles.title}>Departamentos</div>
        <div className={styles.list}>
          {deptRows.map(([nome, count]) => (
            <div key={nome} className={styles.listRow}>
              <span className={styles.listRowName}>{nome}</span>
              <span className={styles.listRowMeta}>{count} colaboradores</span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div className={styles.title}>Catálogo de EPI</div>
        <div className={styles.catalogList}>
          {catalogo.map((c) => (
            <div key={c.equip} className={styles.catalogRow}>
              <span>{c.equip}</span>
              <span className={styles.catalogValue}>
                {(state.epiPrecos[c.equip]?.valor ?? c.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <Card className={styles.fullWidth}>
        <div className={styles.title}>Identificação e integrações</div>
        <div className={styles.subtitle}>Chave de identificação e conexões previstas — serão ativadas em etapas futuras.</div>
        <div className={styles.integrationGrid}>
          <div className={styles.integrationCard}>
            <div className={`${styles.integrationIcon} ${styles.integrationIconSuccess}`}>
              <ShieldCheck size={20} />
            </div>
            <div>
              <div className={styles.integrationTitle}>Chave: CPF</div>
              <div className={styles.integrationSubtitle}>Identificador único · matrícula reservada para o futuro</div>
            </div>
          </div>
          <div className={styles.integrationCard}>
            <div className={`${styles.integrationIcon} ${styles.integrationIconBrand}`}>
              <Users size={20} />
            </div>
            <div className={styles.integrationGrow}>
              <div className={styles.integrationTitle}>PeopleFlow</div>
              <div className={styles.integrationSubtitle}>Movimentações de pessoal</div>
            </div>
            <StatusBadge label="Prevista" tone="warning" />
          </div>
          <div className={styles.integrationCard}>
            <div className={`${styles.integrationIcon} ${styles.integrationIconBrand}`}>
              <GraduationCap size={20} />
            </div>
            <div className={styles.integrationGrow}>
              <div className={styles.integrationTitle}>Academia MSB</div>
              <div className={styles.integrationSubtitle}>CPF + função → treinamentos</div>
            </div>
            <StatusBadge label="Prevista" tone="warning" />
          </div>
        </div>
      </Card>
    </div>
  );
}
