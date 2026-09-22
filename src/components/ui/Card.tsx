import type { HTMLAttributes } from "react";
import styles from "./Card.module.css";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  padded?: boolean;
};

export function Card({ className, padded = true, ...rest }: CardProps) {
  const classes = [styles.card, padded ? styles.padded : "", className].filter(Boolean).join(" ");
  return <div className={classes} {...rest} />;
}
