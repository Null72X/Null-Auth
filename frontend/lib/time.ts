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
