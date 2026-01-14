'use client';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'yellow' | 'blue' | 'gray' | 'white';
  className?: string;
  text?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12'
};

const colorClasses = {
  yellow: 'border-yellow-600',
  blue: 'border-blue-600',
  gray: 'border-gray-600',
  white: 'border-white'
};

export default function LoadingSpinner({
  size = 'md',
  color = 'yellow',
  className = '',
  text
}: LoadingSpinnerProps) {
  const spinnerClasses = `animate-spin rounded-full border-2 border-t-transparent ${sizeClasses[size]} ${colorClasses[color]} ${className}`;

  if (text) {
    return (
      <div className="flex flex-col items-center justify-center space-y-2">
        <div className={spinnerClasses} />
        <p className="text-sm text-gray-600">{text}</p>
      </div>
    );
  }

  return <div className={spinnerClasses} />;
}
