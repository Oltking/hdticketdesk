'use client';

import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface LogoProps {
  href?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: { icon: 'w-6 h-6', text: 'text-base' },
  md: { icon: 'w-8 h-8', text: 'text-xl' },
  lg: { icon: 'w-12 h-12', text: 'text-2xl' },
};

export function Logo({ href = '/', showText = true, size = 'md', className }: LogoProps) {
  const { icon, text } = sizeClasses[size];
  
  const content = (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn('relative', icon)}>
        <Image
          src="/icon.svg"
          alt="HDTicketDesk"
          fill
          className="object-contain"
          priority
        />
      </div>
      {showText && (
        <span className={cn('font-display font-bold', text)}>
          HDTicketDesk
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="flex items-center">
        {content}
      </Link>
    );
  }

  return content;
}
