import { useMemo } from "react";
import { ShieldCheck } from "lucide-react";
import { Card } from "../../../components/ui";
import { portalRepository } from "../../../repositories/portalRepository";
import { titleCase } from "../../../domain/text";
import shared from "../EpiShared.module.css";
import styles from "./MatrizTab.module.css";

export function MatrizTab() {
  const matrizEpi = useMemo(() => portalRepository.getMatrizEpi(), []);

  return (
    <div className={styles.wrap}>
      <p className={shared.intro}>
        A matriz relaciona cada <strong>função</strong> aos EPIs obrigatórios, de forma independente do colaborador: todo colaborador que
        exerce a função herda automaticamente a mesma lista de equipamentos. Quando a integração com o <strong>PeopleFlow</strong> estiver
        ativa, uma mudança de função recalculará automaticamente os EPIs obrigatórios do colaborador nesta base — por enquanto, esta é uma
        visão apenas informativa da matriz vigente.
      </p>

      <div className={styles.grid}>
        {matrizEpi.map((entrada) => (
          <Card key={entrada.funcao} className={styles.funcaoCard}>
            <div className={styles.funcaoHeader}>
              <div className={styles.funcaoIcon}>
                <ShieldCheck size={16} />
              </div>
              <div>
                <div className={styles.funcaoNome}>{titleCase(entrada.funcao)}</div>
                <div className={styles.funcaoCount}>{entrada.epis.length} EPIs</div>
              </div>
            </div>
            <div className={styles.chipList}>
              {entrada.epis.map((epi) => (
                <span key={epi} className={styles.chip}>
                  <span className={styles.dot} />
                  {epi}
                </span>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
