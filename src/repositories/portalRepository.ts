// Camada de acesso a dados para os catálogos e matrizes de referência — nenhum
// dado pessoal de colaborador vive aqui (isso mora em colaboradoresRepository.ts,
// que busca do Supabase). Estes arquivos JSON não têm dado sensível: catálogo de
// EPI, matriz função→EPI, matriz ocupacional PCMSO/PGR. Amanhã podem virar tabelas
// também, mas hoje ficam estáticos no bundle sem risco de LGPD.

import matrizEpiJson from "../data/matrizEpi.json";
import matrizProcJson from "../data/matrizProc.json";
import epiCatalogoJson from "../data/epiCatalogo.json";
import matrizOcupacionalJson from "../data/matrizOcupacional.json";
import metaJson from "../data/meta.json";
import type { EpiCatalogoItem, MatrizEpiFuncao, MatrizOcupacional, MatrizProcFuncao } from "../types/domain";

export interface PortalRepository {
  getGeradoEm(): string;
  getMatrizEpi(): MatrizEpiFuncao[];
  getMatrizProc(): MatrizProcFuncao[];
  getEpiCatalogo(): EpiCatalogoItem[];
  getMatrizOcupacional(): MatrizOcupacional;
}

class StaticPortalRepository implements PortalRepository {
  getGeradoEm(): string {
    return metaJson.geradoEm;
  }
  getMatrizEpi(): MatrizEpiFuncao[] {
    return matrizEpiJson as MatrizEpiFuncao[];
  }
  getMatrizProc(): MatrizProcFuncao[] {
    return matrizProcJson as MatrizProcFuncao[];
  }
  getEpiCatalogo(): EpiCatalogoItem[] {
    return epiCatalogoJson as EpiCatalogoItem[];
  }
  getMatrizOcupacional(): MatrizOcupacional {
    return matrizOcupacionalJson as MatrizOcupacional;
  }
}

export const portalRepository: PortalRepository = new StaticPortalRepository();
