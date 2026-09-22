import { useState } from "react";
import type { FormEvent } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { MailCheck, ShieldCheck } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { Button, TextInput } from "../../components/ui";
import styles from "./LoginPage.module.css";

export function LoginPage() {
  const { user, requestMagicLink } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  if (user) {
    const redirectTo = (location.state as { from?: string } | null)?.from ?? "/dashboard";
    return <Navigate to={redirectTo} replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSending(true);
    setError("");
    const result = await requestMagicLink(email);
    setSending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSentTo(email.trim().toLowerCase());
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <img src="/assets/logo-msb-oficial.png" alt="MSB · Medical System do Brasil" height={62} className={styles.logo} />
        <div className={styles.eyebrow}>Portal SST</div>

        {sentTo ? (
          <>
            <div className={styles.heading}>Verifique seu e-mail</div>
            <p className={styles.description}>
              Enviamos um link de acesso para <strong>{sentTo}</strong>. Abra o e-mail e clique no link para entrar — ele expira em
              alguns minutos.
            </p>
            <Button variant="ghost" className={styles.submit} onClick={() => setSentTo(null)}>
              Usar outro e-mail
            </Button>
          </>
        ) : (
          <>
            <div className={styles.heading}>Acesso ao portal</div>
            <p className={styles.description}>
              Identifique-se com seu e-mail corporativo. Enviaremos um link de acesso — sem senha para lembrar. A edição de exames,
              anexos e desligamentos é exclusiva do RH.
            </p>
            <form onSubmit={handleSubmit}>
              <label className={styles.label} htmlFor="login-email">
                E-mail corporativo
              </label>
              <TextInput
                id="login-email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                placeholder="nome@msbbrasil.com"
                autoFocus
              />
              {error ? <div className={styles.error}>{error}</div> : null}
              <Button type="submit" className={styles.submit} disabled={sending}>
                <MailCheck size={15} /> {sending ? "Enviando..." : "Enviar link de acesso"}
              </Button>
            </form>
          </>
        )}

        <div className={styles.footer}>
          <div className={styles.footerHead}>
            <ShieldCheck size={15} />
            Acesso restrito · RH / Administrador SST
          </div>
          <div className={styles.footerEmails}>carolina.cruz@msbbrasil.com · leslie.souza@msbbrasil.com</div>
          <div>Apenas e-mails corporativos MSB com conta provisionada pelo RH. Não há cadastro aberto de usuários.</div>
        </div>
      </div>
    </div>
  );
}
