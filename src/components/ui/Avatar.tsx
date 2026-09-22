import styles from "./Avatar.module.css";

interface AvatarProps {
  iniciais: string;
  size?: number;
  tone?: "brand" | "danger" | "purple" | "warning";
}

export function Avatar({ iniciais, size = 40, tone = "brand" }: AvatarProps) {
  return (
    <div
      className={`${styles.avatar} ${styles[tone]}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.32) }}
    >
      {iniciais}
    </div>
  );
}
