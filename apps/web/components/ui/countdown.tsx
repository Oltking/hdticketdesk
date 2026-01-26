'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface CountdownProps {
  targetDate: string | Date;
  className?: string;
  onExpire?: () => void;
  prefix?: string;
  expiredText?: string;
  compact?: boolean;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

function calculateTimeLeft(targetDate: Date): TimeLeft {
  const now = new Date().getTime();
  const target = targetDate.getTime();
  const difference = target - now;

  if (difference <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
  }

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((difference % (1000 * 60)) / 1000),
    total: difference,
  };
}

export function Countdown({ 
  targetDate, 
  className, 
  onExpire, 
  prefix = 'Ends in',
  expiredText = 'Expired',
  compact = false
}: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => 
    calculateTimeLeft(new Date(targetDate))
  );
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const target = new Date(targetDate);
    
    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft(target);
      setTimeLeft(newTimeLeft);

      if (newTimeLeft.total <= 0) {
        clearInterval(timer);
        onExpire?.();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate, onExpire]);

  // Prevent hydration mismatch
  if (!mounted) {
    return <span className={className}>{prefix}...</span>;
  }

  if (timeLeft.total <= 0) {
    return <span className={cn("text-red-500", className)}>{expiredText}</span>;
  }

  // Format the countdown based on time remaining
  const formatCountdown = () => {
    const { days, hours, minutes, seconds } = timeLeft;

    if (compact) {
      // Compact format for small spaces
      if (days > 0) {
        return `${days}d ${hours}h`;
      } else if (hours > 0) {
        return `${hours}h ${minutes}m`;
      } else if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
      } else {
        return `${seconds}s`;
      }
    }

    // Full format
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  // Determine urgency level for styling
  const getUrgencyClass = () => {
    const { days, hours } = timeLeft;
    if (days === 0 && hours < 1) {
      return 'text-red-600 animate-pulse font-semibold';
    } else if (days === 0 && hours < 6) {
      return 'text-red-500 font-medium';
    } else if (days < 1) {
      return 'text-orange-600';
    }
    return 'text-orange-500';
  };

  return (
    <span className={cn(getUrgencyClass(), className)}>
      {prefix} {formatCountdown()}
    </span>
  );
}

// A boxed version with individual time units displayed separately
export function CountdownBoxed({ 
  targetDate, 
  className,
  onExpire,
  expiredText = 'Expired'
}: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => 
    calculateTimeLeft(new Date(targetDate))
  );
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const target = new Date(targetDate);
    
    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft(target);
      setTimeLeft(newTimeLeft);

      if (newTimeLeft.total <= 0) {
        clearInterval(timer);
        onExpire?.();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate, onExpire]);

  if (!mounted) {
    return null;
  }

  if (timeLeft.total <= 0) {
    return <span className={cn("text-red-500 font-medium", className)}>{expiredText}</span>;
  }

  const TimeBox = ({ value, label }: { value: number; label: string }) => (
    <div className="flex flex-col items-center">
      <div className="bg-primary/10 rounded px-2 py-1 min-w-[36px]">
        <span className="text-lg font-bold text-primary">{value.toString().padStart(2, '0')}</span>
      </div>
      <span className="text-[10px] text-muted-foreground mt-0.5">{label}</span>
    </div>
  );

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {timeLeft.days > 0 && <TimeBox value={timeLeft.days} label="days" />}
      <TimeBox value={timeLeft.hours} label="hrs" />
      <TimeBox value={timeLeft.minutes} label="min" />
      <TimeBox value={timeLeft.seconds} label="sec" />
    </div>
  );
}
