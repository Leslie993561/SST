import { useMemo, useState } from "react";
import { History, Pencil } from "lucide-react";
import { Button, Card, EmptyState, ProgressBar, Table, Td, Th, THead, Tr } from "../../../components/ui";
import { PriceEditModal } from "../../../components/shared/PriceEditModal";
import { useAuth } from "../../../auth/AuthContext";
import { usePortalStore } from "../../../store/PortalStoreContext";
import { portalRepository } from "../../../repositories/portalRepository";
import { fmtMoney } from "../../../domain/text";
import { isoToBR, stamp } from "../../../domain/dates";
import { criarLogEntry } from "../../../domain/logEntry";
import { editarPrecoExame } from "../../../repositories/precosRepository";
import { registrarLog } from "../../../repositories/logRepository";
import shared from "../ExamesShared.module.css";
import styles from "./CustosExamesTab.module.css";

interface LinhaCustoExame {
  codigo: string;
  nome: string;
  valorUnit: number;
  fornecedor: string;
  dataCotacao: string;
  historicoCount: number;
  historico: { valor: number; fornecedor: string; dataCotacao: string; ts: string }[];
  cargos: number;
  custo: number;
}

/** Custos & valores dos exames ocupacionais — mesmo modelo da aba equivalente de EPI
 * (src/features/epi/tabs/CustosTab.tsx): catálogo estático como base de valor, editável pelo RH
 * com histórico de cotações. Aqui a "demanda" é o número de cargos que exigem o exame
 * (matriz.catalogoExames[].cargos), já que o exame depende de periodicidade/situação por cargo,
 * não de 1-por-colaborador-ativo como o EPI. */
export function CustosExamesTab() {
  const { user, canEdit } = useAuth();
  const { state, dispatch } = usePortalStore();
  const [editando, setEditando] = useState<string | null>(null);

  const catalogo = useMemo(() => portalRepository.getMatrizOcupacional().catalogoExames, []);

  const linhas = useMemo<LinhaCustoExame[]>(() => {
    return catalogo
      .map((c) => {
        const preco = state.examePrecos[c.codigo];
        const valorUnit = preco?.valor ?? c.valor ?? 0;
        return {
          codigo: c.codigo,
          nome: c.nome,
          valorUnit,
          fornecedor: preco?.fornecedor || "—",
          dataCotacao: preco?.dataCotacao || "—",
          historicoCount: preco?.historico.length ?? 0,
          historico: preco?.historico ?? [],
          cargos: c.cargos,
          custo: valorUnit * c.cargos,
        };
      })
      .sort((a, b) => b.cargos - a.cargos || a.nome.localeCompare(b.nome, "pt-BR"));
  }, [catalogo, state.examePrecos]);

  const totalCusto = useMemo(() => linhas.reduce((acc, l) => acc + l.custo, 0), [linhas]);
  const maxCargos = useMemo(() => Math.max(1, ...linhas.map((l) => l.cargos)), [linhas]);

  const linhaEditando = editando ? linhas.find((l) => l.codigo === editando) : undefined;

  async function salvarPreco(valor: number, fornecedor: string, dataCotacaoIso: string) {
    if (!user || !editando) return { ok: false as const, error: "Sessão expirada — faça login novamente." };
    const dataCotacao = dataCotacaoIso ? isoToBR(dataCotacaoIso) : "";
    const result = await editarPrecoExame(editando, state.examePrecos[editando], valor, fornecedor, dataCotacao);
    if (!result.ok) return result;
    dispatch({ type: "EDITAR_PRECO_EXAME", codigo: editando, preco: result.preco });
    const entry = criarLogEntry({
      action: "Preço de exame atualizado",
      colabId: null,
      colaboradores: state.colaboradores,
      detail: editando,
      user: user.email,
      ts: stamp(),
    });
    dispatch({ type: "ADICIONAR_LOG_ENTRY", entry });
    void registrarLog(entry);
    return { ok: true as const };
  }

  return (
    <div className={styles.wrap}>
      <p className={shared.intro}>
        Os valores unitários de cada exame ocupacional são editáveis pelo RH e mantêm histórico de cotações. A coluna "Cargos" mostra
        quantos cargos da matriz ocupacional exigem o exame. O custo estimado é o produto entre o valor unitário vigente e essa contagem.
      </p>

      <div className={shared.chipsRow}>
        <div className={shared.chip}>
          <div className={shared.chipLabel}>Custo total estimado</div>
          <div className={shared.chipValue}>{fmtMoney(totalCusto)}</div>
        </div>
        <div className={shared.chip}>
          <div className={shared.chipLabel}>Itens no catálogo</div>
          <div className={shared.chipValue}>{linhas.length}</div>
        </div>
      </div>

      <Card>
        {linhas.length === 0 ? (
          <EmptyState title="Nenhum exame cadastrado" />
        ) : (
          <Table>
            <THead>
              <Th>Exame</Th>
              <Th>Cargos</Th>
              <Th>Valor unit.</Th>
              <Th>Fornecedor</Th>
              <Th>Cotação</Th>
              <Th>Custo estimado</Th>
              <Th>Participação</Th>
              {canEdit ? <Th>Ações</Th> : null}
            </THead>
            <tbody>
              {linhas.map((l) => (
                <Tr key={l.codigo}>
                  <Td>
                    <div className={styles.exameCell}>
                      <strong>{l.nome}</strong>
                      <span className={styles.codigoPill}>{l.codigo}</span>
                      {l.historicoCount > 0 ? (
                        <span className={styles.historyPill}>
                          <History size={11} /> {l.historicoCount}
                        </span>
                      ) : null}
                    </div>
                  </Td>
                  <Td>{l.cargos}</Td>
                  <Td mono>{fmtMoney(l.valorUnit)}</Td>
                  <Td>{l.fornecedor}</Td>
                  <Td mono>{l.dataCotacao}</Td>
                  <Td mono>
                    <strong>{fmtMoney(l.custo)}</strong>
                  </Td>
                  <Td>
                    <div className={styles.progressCell}>
                      <ProgressBar percent={(l.cargos / maxCargos) * 100} />
                    </div>
                  </Td>
                  {canEdit ? (
                    <Td>
                      <Button variant="ghost" onClick={() => setEditando(l.codigo)}>
                        <Pencil size={13} /> Editar valor
                      </Button>
                    </Td>
                  ) : null}
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {linhaEditando ? (
        <PriceEditModal
          title="Editar valor de exame"
          itemLabel={`${linhaEditando.codigo} · ${linhaEditando.nome}`}
          valor={linhaEditando.valorUnit}
          fornecedor={linhaEditando.fornecedor === "—" ? "" : linhaEditando.fornecedor}
          dataCotacao={linhaEditando.dataCotacao === "—" ? "" : linhaEditando.dataCotacao}
          historico={linhaEditando.historico}
          onClose={() => setEditando(null)}
          onSave={salvarPreco}
        />
      ) : null}
    </div>
  );
}
