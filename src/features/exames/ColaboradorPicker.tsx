import { useMemo, useState } from "react";
import { SearchInput, Select } from "../../components/ui";
import { maskCpf, titleCase } from "../../domain/text";
import { matchesColaboradorSearch } from "./lib/exameUtils";
import type { Colaborador } from "../../types/domain";

interface ColaboradorPickerProps {
  colaboradores: Colaborador[];
  value: number | null;
  onChange: (id: number) => void;
}

/** Seleção de colaborador por nome ou CPF — usado no modal genérico de anexar exame. */
export function ColaboradorPicker({ colaboradores, value, onChange }: ColaboradorPickerProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => colaboradores.filter((c) => matchesColaboradorSearch(c, query)), [colaboradores, query]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <SearchInput placeholder="Buscar por nome ou CPF..." value={query} onChange={(e) => setQuery(e.target.value)} />
      <Select
        options={[
          { value: "", label: "Selecione um colaborador" },
          ...filtered.map((c) => ({ value: String(c.id), label: `${titleCase(c.nome)} — ${maskCpf(c.cpf)}` })),
        ]}
        value={value ? String(value) : ""}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
