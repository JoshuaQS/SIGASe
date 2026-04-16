import type { HTMLAttributes, ReactNode } from 'react';
import { Children } from 'react';
import { motion } from 'framer-motion';

import { cn } from '@/shared/lib/utils';

type AnimatedListProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  itemDelay?: number;
};

export function AnimatedList({
  children,
  className,
  itemDelay = 0.05,
  ...props
}: AnimatedListProps) {
  const items = Children.toArray(children);

  return (
    <div className={cn('space-y-0', className)} {...props}>
      {items.map((child, index) => (
        <motion.div
          key={`animated-item-${index}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: index * itemDelay }}
        >
          {child}
        </motion.div>
      ))}
    </div>
  );
}

