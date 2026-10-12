import type { ReactNode } from 'react';
import { pillClass, type PillTone } from './styles';

interface Props {
  tone?: PillTone;
  className?: string;
  title?: string;
  children: ReactNode;
}

/** 统一的胶囊标签：节点类型色 / 中性。 */
export default function Pill({ tone = 'neutral', className, title, children }: Props) {
  return (
    <span className={pillClass(tone, className)} title={title}>
      {children}
    </span>
  );
}
