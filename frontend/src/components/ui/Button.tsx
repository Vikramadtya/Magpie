import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from '../../lib/cn';

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-full text-[15px] font-medium transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/30 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-accent text-white hover:brightness-110 active:brightness-95",
        destructive: "bg-red-500 text-white hover:brightness-110",
        outline: "bg-primary/[0.06] text-primary hover:bg-primary/[0.1]",
        secondary: "bg-accent/10 text-accent hover:bg-accent/15",
        ghost: "text-accent hover:bg-accent/10",
        link: "text-accent underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-8 px-3.5 text-sm",
        lg: "h-12 px-8 text-base",
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
