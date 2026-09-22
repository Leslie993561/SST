import { useMemo } from "react";
import { ClipboardList } from "lucide-react";
import { Card } from "../../../components/ui";
import { portalRepository } from "../../../repositories/portalRepository";
import { titleCase } from "../../../domain/text";
import shared from "../ExamesShared.module.css";
import styles from "./MatrizFuncaoTab.module.css";

export function MatrizFuncaoTab() {
  const matrizProc = useMemo(() => portalRepository.getMatrizProc(), []);

  return (
    <div className={styles.wrap}>
      <p className={shared.intro}>Função → Exames ocupacionais aplicáveis, derivada da base atual.</p>

      <div className={styles.grid}>
        {matrizProc.map((entrada) => (
          <Card key={entrada.funcao} className={styles.funcaoCard}>
            <div className={styles.funcaoHeader}>
              <div className={styles.funcaoIcon}>
                <ClipboardList size={16} />
              </div>
              <div>
                <div className={styles.funcaoNome}>{titleCase(entrada.funcao)}</div>
                <div className={styles.funcaoCount}>{entrada.procedimentos.length} procedimento(s)</div>
              </div>
            </div>
            <ul className={styles.list}>
              {entrada.procedimentos.map((proc) => (
                <li key={proc}>{proc}</li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
}
