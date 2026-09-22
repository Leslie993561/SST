import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { Search } from "lucide-react";
import styles from "./Field.module.css";

export function SearchInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={styles.searchWrap}>
      <Search size={15} className={styles.searchIcon} />
      <input type="text" className={styles.searchInput} {...props} />
    </div>
  );
}

interface SelectOption {
  value: string;
  label: string;
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  options: SelectOption[];
};

export function Select({ options, className, ...rest }: SelectProps) {
  return (
    <select className={[styles.select, className].filter(Boolean).join(" ")} {...rest}>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

interface LabeledFieldProps {
  label: string;
  children: ReactNode;
  hint?: string;
}

export function LabeledField({ label, children, hint }: LabeledFieldProps) {
  return (
    <label className={styles.labeledField}>
      <span className={styles.labelText}>{label}</span>
      {children}
      {hint ? <span className={styles.hint}>{hint}</span> : null}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={styles.textInput} {...props} />;
}
