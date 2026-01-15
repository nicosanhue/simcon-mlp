import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatusCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: ReactNode;
  variant?: "default" | "success" | "warning" | "danger";
  onClick?: () => void;
  isActive?: boolean;
}

const variantStyles = {
  default: "border-border",
  success: "border-status-operativo/30 card-glow-success",
  warning: "border-status-alerta/30 card-glow-warning",
  danger: "border-status-falla/30 card-glow-danger",
};

const iconVariantStyles = {
  default: "bg-primary/10 text-primary",
  success: "bg-status-operativo/10 text-status-operativo",
  warning: "bg-status-alerta/10 text-status-alerta",
  danger: "bg-status-falla/10 text-status-falla",
};

export function StatusCard({ title, value, subtitle, icon, variant = "default", onClick, isActive }: StatusCardProps) {
  return (
    <div 
      className={cn(
        "industrial-panel p-5 border transition-all",
        variantStyles[variant],
        onClick && "cursor-pointer hover:scale-[1.02] hover:shadow-lg",
        isActive && "ring-2 ring-primary ring-offset-2 ring-offset-background"
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold text-foreground mt-1">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
        <div className={cn(
          "flex h-12 w-12 items-center justify-center rounded-lg",
          iconVariantStyles[variant]
        )}>
          {icon}
        </div>
      </div>
    </div>
  );
}
