// Trava contra abertura duplicada do mesmo arquivo — no nível do módulo, não
// de componente/estado do React, então funciona mesmo se o handler de clique
// disparar mais de uma vez por algum motivo fora do nosso controle (ex.:
// hardware de mouse com bounce no clique, componente montado mais de uma
// vez, etc). Trava pelo storagePath (a entrada), ANTES de gerar a signed
// URL — cada chamada a createSignedUrl gera um token diferente, então travar
// comparando a URL final (como numa versão anterior desta função) não pega
// uma segunda chamada que gera sua própria URL só que igualmente válida.
//
// Confirmado via diagnóstico (contagem de chamadas exibida na tela) que o
// código só chama esta função e window.open() uma vez por clique — uma
// segunda aba/download que apareça é comportamento do navegador (ex.: Edge
// processando o PDF), não deste código.
const emAndamentoOuRecente = new Map<string, number>();

const JANELA_DEDUP_MS = 3000;

export type AbrirResultado = { ok: true } | { ok: false; error: string } | { ignorado: true };

/** Gera a signed URL (via `gerarUrl`) e abre numa aba nova — se o navegador
 * bloquear o pop-up, navega na aba atual. Qualquer chamada para o MESMO
 * storagePath dentro de 3s de uma anterior (em andamento ou já concluída) é
 * ignorada sem sequer chamar `gerarUrl`. */
export async function abrirAnexoUmaVez(
  storagePath: string,
  gerarUrl: () => Promise<{ ok: true; url: string } | { ok: false; error: string }>,
): Promise<AbrirResultado> {
  const agora = Date.now();
  const ultima = emAndamentoOuRecente.get(storagePath);
  if (ultima !== undefined && agora - ultima < JANELA_DEDUP_MS) {
    return { ignorado: true };
  }
  emAndamentoOuRecente.set(storagePath, agora);

  const result = await gerarUrl();
  if (!result.ok) return result;

  const janela = window.open(result.url, "_blank", "noopener,noreferrer");
  if (!janela) window.location.href = result.url;
  return { ok: true };
}
