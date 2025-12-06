import * as React from "react";

function cx(...classes: Array<string | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ className, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        className={cx(
            "flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm",
            "border-purple-500/60 bg-zinc-900 text-gray-200 placeholder:text-gray-500",
            "outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus:border-purple-400",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "transition-all duration-200 ease-in-out",
        className
        )}
        {...props}
      />
    );
  }
);