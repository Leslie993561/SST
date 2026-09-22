import styles from "./SegmentedControl.module.css";

interface SegmentedControlProps {
  items: { key: string; label: string }[];
  active: string;
  onChange: (key: string) => void;
}

export function SegmentedControl({ items, active, onChange }: SegmentedControlProps) {
  return (
    <div className={styles.wrap}>
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          className={`${styles.item} ${item.key === active ? styles.active : ""}`}
          onClick={() => onChange(item.key)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
