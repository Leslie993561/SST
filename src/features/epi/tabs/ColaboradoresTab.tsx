import { useMemo, useState } from "react";
import { Download, Pencil } from "lucide-react";
import { Avatar, Button, Card, EmptyState, SearchInput, Select, Table, Td, Th, THead, Tr } from "../../../components/ui";
import { useAuth } from "../../../auth/AuthContext";
import { usePortalStore } from "../../../store/PortalStoreContext";
import { colaboradoresRepository } from "../../../repositories/colaboradoresRepository";
import { portalRepository } from "../../../repositories/portalRepository";
import { deptName, iniciais, maskCpf, titleCase } from "../../../domain/text";
import { idadeFromISO, stamp } from "../../../domain/dates";
import { registrarLog } from "../../../repositories/logRepository";
import { downloadCsv } from "../../../domain/csv";
import { divergenciaEpiPara, matchesColaboradorSearch } from "../lib/epiUtils";
import { EpiFichaDrawer } from "../EpiFichaDrawer";
import { EditarColaboradorModal } from "../EditarColaboradorModal";
import shared from "../EpiShared.module.css";
import styles from "./ColaboradoresTab.module.css";

export function ColaboradoresTab() {
  const { user } = useAuth();
  const { state, dispatch } = usePortalStore();
  const [search, setSearch] = useState("");
  const [depto, setDepto] = useState("");
  const [selectedColabId, setSelectedColabId] = useState<number | null>(null);
  const [editandoColabId, setEditandoColabId] = useState<number | null>(null);

  const matrizEpi = useMemo(() => portalRepository.getMatrizEpi(), []);

  const ativos = useMemo(() => state.colaboradores.filter((c) => !state.desligados[c.id]), [state.colaboradores, state.desligados]);

  const departamentos = useMemo(() => {
    const nomes = new Set(ativos.map((c) => deptName(c.departamento)));
    return Array.from(nomes).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [ativos]);

  const filtrados = useMemo(() => {
    return ativos.filter((c) => {
      if (depto && deptName(c.departamento) !== depto) return false;
      return matchesColaboradorSearch(c, search);
    });
  }, [ativos, search, depto]);

  const linhas = useMemo(
    () =>
      filtrados
        .slice()
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
        .map((c) => ({ colaborador: c, divergencia: divergenciaEpiPara(c, matrizEpi, state.entregas) })),
    [filtrados, matrizEpi, state.entregas],
  );

  const colaboradorEditando = editandoColabId != null ? state.colaboradores.find((c) => c.id === editandoColabId) ?? null : null;

  async function salvarEdicaoColaborador(dados: { cpf: string; nome: string; cargo: string; departamento: string; nascimento: string }) {
    if (!user || editandoColabId == null) return { ok: false as const, error: "Sessão expirada — faça login novamente." };
    const result = await colaboradoresRepository.atualizarColaborador(editandoColabId, dados);
    if (!result.ok) return result;
    dispatch({ type: "ATUALIZAR_DADOS_COLABORADOR", colabId: editandoColabId, ...dados });
    // Usa o nome recém-editado direto (não uma busca em state.colaboradores,
    // que neste ponto ainda reflete o nome ANTIGO — o dispatch acima é
    // assíncrono/em lote, o estado só reflete a edição no próximo render).
    const entry = { action: "Cadastro do colaborador atualizado", colabId: editandoColabId, colabNome: titleCase(dados.nome), detail: "", user: user.email, ts: stamp() };
    dispatch({ type: "ADICIONAR_LOG_ENTRY", entry });
    void registrarLog(entry);
    return { ok: true as const };
  }

  function exportar() {
    downloadCsv(
      "epi_colaboradores.csv",
      linhas.map(({ colaborador: c, divergencia }) => ({
        nome: titleCase(c.nome),
        cpf: maskCpf(c.cpf),
        departamento: deptName(c.departamento),
        cargo: c.cargo ? titleCase(c.cargo) : "",
        idade: idadeFromISO(c.nascimento) ?? "",
        episObrigatorios: divergencia.obrigatorios.length,
        semEntrega: divergencia.semEntrega.length,
      })),
    );
  }

  return (
    <div className={styles.wrap}>
      <Card className={styles.toolbarCard}>
        <div className={shared.toolbar}>
          <div className={shared.toolbarLeft}>
            <SearchInput placeholder="Buscar por nome ou CPF..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <Select
              options={[{ value: "", label: "Todos os departamentos" }, ...departamentos.map((d) => ({ value: d, label: d }))]}
              value={depto}
              onChange={(e) => setDepto(e.target.value)}
            />
          </div>
          <div className={shared.toolbarRight}>
            <Button variant="secondary" onClick={exportar}>
              <Download size={15} /> Exportar
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        {linhas.length === 0 ? (
          <EmptyState title="Nenhum colaborador encontrado" description="Ajuste a busca ou o filtro de departamento." />
        ) : (
          <Table>
            <THead>
              <Th>Colaborador</Th>
              <Th>CPF</Th>
              <Th>Departamento</Th>
              <Th>Cargo</Th>
              <Th>Idade</Th>
              <Th>EPIs / classificação</Th>
              <Th>Ficha</Th>
              <Th>Ações</Th>
            </THead>
            <tbody>
              {linhas.map(({ colaborador: c, divergencia }) => {
                const idade = idadeFromISO(c.nascimento);
                return (
                  <Tr key={c.id}>
                    <Td>
                      <div className={styles.colabCell}>
                        <Avatar iniciais={iniciais(c.nome)} size={32} />
                        <span>{titleCase(c.nome)}</span>
                      </div>
                    </Td>
                    <Td mono>
                      {c.cpf ? (
                        maskCpf(c.cpf)
                      ) : (
                        <span className={shared.pillWarning}>Pré-cadastro incompleto</span>
                      )}
                    </Td>
                    <Td>{deptName(c.departamento)}</Td>
                    <Td>{c.cargo ? titleCase(c.cargo) : "—"}</Td>
                    <Td>{idade != null ? `${idade} anos` : "—"}</Td>
                    <Td>
                      <div className={shared.pillGroup}>
                        {divergencia.obrigatorios.length > 0 ? (
                          <button type="button" className={shared.pillInfo} onClick={() => setSelectedColabId(c.id)}>
                            {divergencia.obrigatorios.length} EPIs
                          </button>
                        ) : (
                          <span className={shared.pillWarning}>Não necessita de EPI</span>
                        )}
                        {divergencia.semEntrega.length > 0 ? (
                          <span className={shared.pillDanger}>{divergencia.semEntrega.length} sem entrega</span>
                        ) : null}
                      </div>
                    </Td>
                    <Td>
                      <button type="button" className={styles.fichaLink} onClick={() => setSelectedColabId(c.id)}>
                        Ver ficha
                      </button>
                    </Td>
                    <Td>
                      <button type="button" className={styles.iconButton} title="Editar cadastro" onClick={() => setEditandoColabId(c.id)}>
                        <Pencil size={13} />
                      </button>
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>

      <div className={shared.footerNote}>
        {linhas.length} de {ativos.length} colaborador{ativos.length === 1 ? "" : "es"} ativo{ativos.length === 1 ? "" : "s"} · CPF exibido
        de forma mascarada · chave única de identificação
      </div>

      {selectedColabId != null ? <EpiFichaDrawer colabId={selectedColabId} onClose={() => setSelectedColabId(null)} /> : null}

      {colaboradorEditando ? (
        <EditarColaboradorModal
          colaborador={colaboradorEditando}
          onClose={() => setEditandoColabId(null)}
          onSave={salvarEdicaoColaborador}
        />
      ) : null}
    </div>
  );
}
