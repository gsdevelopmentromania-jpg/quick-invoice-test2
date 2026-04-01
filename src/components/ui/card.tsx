import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface CardBodyProps {
  children: React.ReactNode;
  className?: string;
}

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps): React.ReactElement {
  return (
    <div
      className={cn(
        "rounded-xl border border-gray-200 bg-white shadow-sm",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: CardHeaderProps): React.ReactElement {
  return (
    <div className={cn("border-b border-gray-100 px-5 py-4", className)}>
      {children}
    </div>
  );
}

export function CardBody({ children, className }: CardBodyProps): React.ReactElement {
  return <div className={cn("px-5 py-4", className)}>{children}</div>;
}

export function CardFooter({ children, className }: CardFooterProps): React.ReactElement {
  return (
    <div className={cn("border-t border-gray-100 px-5 py-3", className)}>
      {children}
    </div>
  );
}
