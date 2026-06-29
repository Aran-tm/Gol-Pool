import { type ReactNode } from "react";
import { motion } from "framer-motion";

interface Props {
  children: ReactNode;
  className?: string;
}

/** Smooth fade+slide entrance for page content. */
export default function PageTransition({ children, className }: Props) {
  return (
    <motion.main
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.30, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.main>
  );
}
