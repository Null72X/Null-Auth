export function formatRelativeTime(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return 'Never';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return 'Never';

  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 5) return 'Just now';
  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays}d ago`;

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) return `${diffInMonths}mo ago`;

  return date.toLocaleDateString();
}

export interface ExpirationInfo {
  isLifetime: boolean;
  isExpired: boolean;
  isUrgent: boolean; // <= 24 hours (1 day) left and > 0
  totalSeconds: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  formattedText: string;
  compactText: string;
}

export function getExpirationInfo(
  expiresAtInput?: string | Date | null,
  remainingDaysInput?: number | null
): ExpirationInfo {
  // Lifetime check: 9999 or more days
  if (remainingDaysInput != null && remainingDaysInput >= 9999) {
    return {
      isLifetime: true,
      isExpired: false,
      isUrgent: false,
      totalSeconds: Infinity,
      days: 9999,
      hours: 0,
      minutes: 0,
      seconds: 0,
      formattedText: 'Lifetime',
      compactText: 'Lifetime',
    };
  }

  if (expiresAtInput) {
    const expiresDate = new Date(expiresAtInput);
    if (!isNaN(expiresDate.getTime())) {
      // Lifetime year check (e.g. 2099 or 2060+)
      if (expiresDate.getFullYear() >= 2060) {
        return {
          isLifetime: true,
          isExpired: false,
          isUrgent: false,
          totalSeconds: Infinity,
          days: 9999,
          hours: 0,
          minutes: 0,
          seconds: 0,
          formattedText: 'Lifetime',
          compactText: 'Lifetime',
        };
      }

      const diffMs = expiresDate.getTime() - Date.now();
      if (diffMs <= 0) {
        return {
          isLifetime: false,
          isExpired: true,
          isUrgent: false,
          totalSeconds: 0,
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          formattedText: 'Expired',
          compactText: 'Expired',
        };
      }

      const totalSeconds = Math.floor(diffMs / 1000);
      const isUrgent = totalSeconds <= 86400; // <= 24 hours (1 day) left

      if (isUrgent) {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        let timeStr = '';
        if (hours > 0) {
          timeStr = `${hours}h ${minutes}m ${seconds}s left`;
        } else if (minutes > 0) {
          timeStr = `${minutes}m ${seconds}s left`;
        } else {
          timeStr = `${seconds}s left`;
        }

        return {
          isLifetime: false,
          isExpired: false,
          isUrgent: true,
          totalSeconds,
          days: 0,
          hours,
          minutes,
          seconds,
          formattedText: timeStr,
          compactText: timeStr,
        };
      }

      // Greater than 1 day: show days only
      const days = Math.ceil(totalSeconds / 86400);
      return {
        isLifetime: false,
        isExpired: false,
        isUrgent: false,
        totalSeconds,
        days,
        hours: 0,
        minutes: 0,
        seconds: 0,
        formattedText: `${days} ${days === 1 ? 'day' : 'days'} left`,
        compactText: `${days}d left`,
      };
    }
  }

  // Fallback to remainingDays if expiresAt is not provided
  if (remainingDaysInput != null) {
    if (remainingDaysInput <= 0) {
      return {
        isLifetime: false,
        isExpired: true,
        isUrgent: false,
        totalSeconds: 0,
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        formattedText: 'Expired',
        compactText: 'Expired',
      };
    }
    if (remainingDaysInput === 1) {
      return {
        isLifetime: false,
        isExpired: false,
        isUrgent: true,
        totalSeconds: 86400,
        days: 1,
        hours: 24,
        minutes: 0,
        seconds: 0,
        formattedText: '1 day left',
        compactText: '1d left',
      };
    }
    return {
      isLifetime: false,
      isExpired: false,
      isUrgent: false,
      totalSeconds: remainingDaysInput * 86400,
      days: remainingDaysInput,
      hours: 0,
      minutes: 0,
      seconds: 0,
      formattedText: `${remainingDaysInput} days left`,
      compactText: `${remainingDaysInput}d left`,
    };
  }

  return {
    isLifetime: false,
    isExpired: true,
    isUrgent: false,
    totalSeconds: 0,
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    formattedText: 'Expired',
    compactText: 'Expired',
  };
}
