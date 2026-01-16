import { ComponentPropsWithoutRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingScreenProps extends ComponentPropsWithoutRef<"div"> {
   message?: string;
}

export function LoadingScreen({
   message = "Loading...",
   className,
   ...props
}: LoadingScreenProps) {
   return (
      <div
         className={cn(
            "flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-[#1a1625] to-[#0f0c18] text-white p-6 animate-in fade-in duration-500",
            className
         )}
         {...props}
      >
         <div className="relative">
            <div className="absolute inset-0 bg-purple-500/20 blur-xl rounded-full animate-pulse" />
            <div className="relative bg-zinc-900/50 p-6 rounded-2xl border border-white/10 backdrop-blur-sm shadow-2xl flex flex-col items-center gap-4 max-w-md text-center">
               <div className="relative">
                  <Loader2 className="w-12 h-12 text-purple-400 animate-spin" />
               </div>

               <h3 className="text-xl font-medium text-white tracking-wide">
                  {message}
               </h3>

               <div className="flex gap-1 mt-2">
                  <span className="w-2 h-2 rounded-full bg-purple-500 animate-[bounce_1s_infinite_0ms]" />
                  <span className="w-2 h-2 rounded-full bg-purple-400 animate-[bounce_1s_infinite_200ms]" />
                  <span className="w-2 h-2 rounded-full bg-purple-300 animate-[bounce_1s_infinite_400ms]" />
               </div>
            </div>
         </div>
      </div>
   );
}
