import { useMemo, useState } from "react";
import { UserX } from "lucide-react";
import { Avatar, Card, EmptyState, Table, Td, Th, THead, Tr } from "../../../components/ui";
import { usePortalStore } from "../../../store/PortalStoreContext";
import { iniciais, titleCase } from "../../../domain/text";
import { parseBR } from "../../../domain/dates";
import { ExameFichaDrawer } from "../ExameFichaDrawer";
import type { Colaborador, Desligamento } from "../../../types/domain";
import shared from "../ExamesShared.module.css";
import styles from "./DesligadosTab.module.css";

interface Linha {
  colab: Colaborador;
  deslig: Desligamento;
}

export function DesligadosTab() {
  const { state } = usePortalStore();
  const [selectedColabId, setSelectedColabId] = useState<number | null>(null);

  const linhas = useMemo<Linha[]>(() => {
    const resultado: Linha[] = [];
    for (const [idStr, deslig] of Object.entries(state.desligados)) {
      const colab = state.colaboradores.find((c) => c.id === Number(idStr));
      if (colab) resultado.push({ colab, deslig });
    }
    return resultado.sort((a, b) => (parseBR(b.deslig.date)?.getTime() ?? 0) - (parseBR(a.deslig.date)?.getTime() ?? 0));
  }, [state.desligados, state.colaboradores]);

  return (
    <div className={styles.wrap}>
      <p className={shared.intro}>
        Colaboradores desligados saem das listas ativas de controle de ASO em todo o portal, mas todo o histórico de exames e anexos
        permanece preservado aqui para consulta e auditoria.
      </p>

      {linhas.length === 0 ? (
        <Card className={styles.emptyCard}>
          <EmptyState
            icon={<UserX size={28} />}
            title="Nenhum colaborador desligado"
            description="Assim que um colaborador for desligado pela ficha, ele passará a aparecer nesta lista, mantendo o histórico completo de exames e anexos."
          />
        </Card>
      ) : (
        <Card>
          <Table>
            <THead>
              <Th>Colaborador</Th>
              <Th>Cargo</Th>
              <Th>Data de desligamento</Th>
              <Th>Motivo</Th>
              <Th>Registrado por</Th>
              <Th>Ficha</Th>
            </THead>
            <tbody>
              {linhas.map(({ colab, deslig }) => (
                <Tr key={colab.id}>
                  <Td>
                    <div className={styles.colabCell}>
                      <Avatar iniciais={iniciais(colab.nome)} size={32} tone="purple" />
                      <span>{titleCase(colab.nome)}</span>
                    </div>
                  </Td>
                  <Td>{colab.cargo ? titleCase(colab.cargo) : "—"}</Td>
                  <Td mono>{deslig.date}</Td>
                  <Td>{deslig.motivo}</Td>
                  <Td>{deslig.by}</Td>
                  <Td>
                    <button type="button" className={shared.linkButton} onClick={() => setSelectedColabId(colab.id)}>
                      Ver histórico
                    </button>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}

      {selectedColabId != null ? <ExameFichaDrawer colabId={selectedColabId} onClose={() => setSelectedColabId(null)} /> : null}
    </div>
  );
}
