interface BadgeProps {
  children: React.ReactNode;
  variant?: 'red' | 'yellow' | 'green' | 'blue' | 'gray' | 'orange';
  size?: 'sm' | 'md';
}

const variants = {
  red: 'bg-red-100 text-red-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  green: 'bg-emerald-100 text-emerald-700',
  blue: 'bg-blue-100 text-blue-700',
  gray: 'bg-gray-100 text-gray-600',
  orange: 'bg-orange-100 text-orange-700',
};

export function Badge({ children, variant = 'gray', size = 'sm' }: BadgeProps) {
  const sz = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';
  return (
    <span className={`inline-flex items-center rounded-full font-semibold ${sz} ${variants[variant]}`}>
      {children}
    </span>
  );
}
