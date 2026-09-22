import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { KeyRound, UserPlus } from "lucide-react";
import { Button, Card, EmptyState, LabeledField, TextInput, Td, Th, THead, Table, Tr } from "../../components/ui";
import { useAuth } from "../../auth/AuthContext";
import { listarAcessos, provisionarAcesso, type AcessoUsuario } from "../../repositories/acessosRepository";
import styles from "./AcessosPage.module.css";

export function AcessosPage() {
  const { canEdit } = useAuth();

  const [usuarios, setUsuarios] = useState<AcessoUsuario[] | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erroLista, setErroLista] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erroForm, setErroForm] = useState<string | null>(null);

  const carregar = useCallback(() => {
    setCarregando(true);
    setErroLista(null);
    listarAcessos()
      .then(setUsuarios)
      .catch((err: Error) => setErroLista(err.message))
      .finally(() => setCarregando(false));
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErroForm(null);
    try {
      const { jaExistia } = await provisionarAcesso(email);
      if (jaExistia) {
        setErroForm("Esse e-mail já tinha acesso provisionado.");
      } else {
        setEmail("");
        carregar();
      }
    } catch (err) {
      setErroForm(err instanceof Error ? err.message : "Falha ao liberar acesso.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className={styles.page}>
      <Card>
        <h3 className={styles.cardTitle}>Liberar acesso</h3>
        <p className={styles.cardDesc}>
          Cria uma conta no Supabase Auth para o e-mail informado — ele passa a poder pedir o link de acesso na tela
          de login. Não há distinção de perfil neste portal: toda conta autenticada tem o mesmo acesso.
        </p>
        {canEdit ? (
          <form onSubmit={handleSubmit} className={styles.form}>
            <LabeledField label="E-mail corporativo">
              <TextInput
                type="email"
                placeholder="nome.sobrenome@msbbrasil.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErroForm(null);
                }}
                required
              />
            </LabeledField>
            <Button type="submit" disabled={enviando}>
              <UserPlus size={15} /> {enviando ? "Liberando..." : "Liberar acesso"}
            </Button>
          </form>
        ) : (
          <p className={styles.somenteLeitura}>Acesso somente leitura — fale com o RH para liberar novos e-mails.</p>
        )}
        {erroForm && <div className={styles.erro}>{erroForm}</div>}
      </Card>

      <Card>
        <div className={styles.listaHeader}>
          <h3 className={styles.cardTitle}>
            <KeyRound size={16} strokeWidth={1.8} /> Contas com acesso
          </h3>
          {usuarios && <span className={styles.contagem}>{usuarios.length}</span>}
        </div>

        {erroLista && (
          <div className={styles.erro}>
            {erroLista}
            <button type="button" onClick={carregar}>
              Tentar de novo
            </button>
          </div>
        )}

        {!erroLista && carregando && !usuarios && <p className={styles.carregando}>Carregando...</p>}

        {!erroLista && usuarios && usuarios.length === 0 && (
          <EmptyState title="Nenhuma conta provisionada ainda" description="Libere o primeiro acesso pelo formulário acima." />
        )}

        {!erroLista && usuarios && usuarios.length > 0 && (
          <Table>
            <THead>
              <Th>E-mail</Th>
              <Th>Criado em</Th>
            </THead>
            <tbody>
              {usuarios.map((u) => (
                <Tr key={u.email}>
                  <Td>{u.email}</Td>
                  <Td mono>{new Date(u.criadoEm).toLocaleDateString("pt-BR")}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
