import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from '../../lib/cn';

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/25 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-background hover:bg-primary/90 shadow-[0_1px_2px_rgb(0_0_0/0.2),inset_0_1px_0_rgb(255_255_255/0.12)]",
        destructive: "bg-red-500 text-white hover:bg-red-500/90 shadow-sm",
        outline: "border border-border bg-surface hover:bg-black/[0.03] dark:hover:bg-white/5 shadow-sm",
        secondary: "bg-black/5 dark:bg-white/10 text-primary hover:bg-black/10 dark:hover:bg-white/20",
        ghost: "hover:bg-black/5 dark:hover:bg-white/5",
        link: "text-accent underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-9 rounded-lg px-3.5",
        lg: "h-12 rounded-xl px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
