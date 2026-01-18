"use client";

import type React from "react";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
   Card,
   CardContent,
   CardDescription,
   CardHeader,
   CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { GoogleLogo } from "../icons/google-logo";
import { TMDB_GENRES } from "@/lib/config/genres";

interface SignUpFormProps extends React.ComponentPropsWithoutRef<"div"> {
   onSwitchToLogin?: () => void;
}

const LOADING_MESSAGES = [
   "Folding in space-time...",
   "Consulting with the elves...",
   "Brewing polyjuice potion...",
   "Sorting your preferences...",
   "Unlocking the Chamber of Secrets...",
   "Managing mischief...",
];

const GENRES = TMDB_GENRES;

export function SignUpForm({
   className,
   onSwitchToLogin,
   ...props
}: SignUpFormProps) {
   const [step, setStep] = useState<1 | 2>(1);
   const [email, setEmail] = useState("");
   const [password, setPassword] = useState("");
   const [repeatPassword, setRepeatPassword] = useState("");
   const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
   const [error, setError] = useState<string | null>(null);
   const [isLoading, setIsLoading] = useState(false);
   const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
   const router = useRouter();

   useEffect(() => {
      let interval: NodeJS.Timeout;
      if (isLoading) {
         interval = setInterval(() => {
            setLoadingMessageIndex(
               (prev) => (prev + 1) % LOADING_MESSAGES.length
            );
         }, 2000);
      }
      return () => clearInterval(interval);
   }, [isLoading]);

   const handleSignUpWithGoogle = async () => {
      const supabase = createClient();
      setIsLoading(true);
      setError(null);

      try {
         const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
               redirectTo: `${window.location.origin}/auth/callback`,
            },
         });
         if (error) throw error;
      } catch (error: unknown) {
         setError(error instanceof Error ? error.message : "An error occurred");
      } finally {
         setIsLoading(false);
      }
   };

   const handleNextStep = (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      if (!email || !password || !repeatPassword) {
         setError("Please fill in all fields");
         return;
      }

      if (password !== repeatPassword) {
         setError("Passwords do not match");
         return;
      }

      setStep(2);
   };

   const handleSignUp = async (e: React.FormEvent) => {
      e.preventDefault();

      if (selectedGenres.length < 3) {
         setError(
            `Please select at least 3 genres (selected: ${selectedGenres.length})`
         );
         return;
      }

      const supabase = createClient();
      setIsLoading(true);
      setError(null);

      try {
         const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
               emailRedirectTo: `${window.location.origin}/`,
            },
         });
         if (error) throw error;

         if (data.user) {
            const preferences = selectedGenres
               .map((id) => {
                  const genre = GENRES.find((g) => g.id === id);
                  if (!genre) return null;
                  return {
                     user_id: data.user!.id,
                     genre: genre.name,
                  };
               })
               .filter(Boolean);

            if (preferences.length > 0) {
               const { error: prefError } = await supabase
                  .from("user_genre_preferences")
                  .insert(preferences);

               if (prefError) {
                  console.error("Error saving genre preferences:", prefError);
               } else {
                  // Run fold-in to generate embeddings
                  const selectedGenreTokens = selectedGenres
                     .map((id) => {
                        const genre = GENRES.find((g) => g.id === id);
                        return genre?.modelKey ?? genre?.name;
                     })
                     .filter((token): token is string => !!token);

                  console.log("Triggering fold-in with:", selectedGenreTokens);

                  await fetch("/api/dobbySenseAPI/fold-in", {
                     method: "POST",
                     headers: {
                        "Content-Type": "application/json",
                     },
                     body: JSON.stringify({
                        selectedGenres: selectedGenreTokens,
                     }),
                  })
                     .then(async (res) => {
                        if (res.ok) {
                           console.log("Fold-in triggered successfully.");
                        } else {
                           console.error(
                              "Fold-in failed:",
                              res.status,
                              await res.text()
                           );
                        }
                     })
                     .catch((err) =>
                        console.error("Fold-in fetch error:", err)
                     );
               }
            }
         } else {
            console.warn(
               "User created but no session returned. Email confirmation might be required."
            );
         }

         router.push("/");
      } catch (error: unknown) {
         setError(error instanceof Error ? error.message : "An error occurred");
      } finally {
         setIsLoading(false);
      }
   };

   const toggleGenre = (genreId: number) => {
      if (selectedGenres.includes(genreId)) {
         setSelectedGenres(selectedGenres.filter((id) => id !== genreId));
      } else {
         setSelectedGenres([...selectedGenres, genreId]);
      }
   };

   return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
         <Card>
            <CardHeader className="px-6 pt-6 pb-4">
               <CardTitle className="text-2xl text-white">Sign up</CardTitle>
               <CardDescription className="text-white">
                  {step === 1 && "Create a new account to get started"}
               </CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-6">
               <form onSubmit={step === 1 ? handleNextStep : handleSignUp}>
                  <div className="flex flex-col gap-6 text-white">
                     {step === 1 && (
                        <>
                           <div className="grid gap-2 text-white">
                              <Label htmlFor="email">Email</Label>
                              <Input
                                 id="email"
                                 type="email"
                                 placeholder="dobby@hogwarts.edu"
                                 required
                                 value={email}
                                 onChange={(e) => setEmail(e.target.value)}
                              />
                           </div>
                           <div className="grid gap-2 text-white">
                              <Label htmlFor="password">Password</Label>
                              <Input
                                 id="password"
                                 type="password"
                                 required
                                 value={password}
                                 onChange={(e) => setPassword(e.target.value)}
                              />
                           </div>
                           <div className="grid gap-2 text-white">
                              <Label htmlFor="repeat-password">
                                 Repeat Password
                              </Label>
                              <Input
                                 id="repeat-password"
                                 type="password"
                                 required
                                 value={repeatPassword}
                                 onChange={(e) =>
                                    setRepeatPassword(e.target.value)
                                 }
                              />
                           </div>
                           {error && (
                              <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                 {error}
                              </div>
                           )}
                           <Button
                              type="submit"
                              className="w-full bg-purple-950 hover:bg-purple-400 text-white"
                              disabled={isLoading}
                           >
                              Next Step
                           </Button>
                           <Button
                              type="button"
                              variant="outline"
                              className="w-full flex items-center justify-center gap-2 bg-black text-white hover:bg-gray-900 hover:text-white border-transparent font-medium"
                              onClick={handleSignUpWithGoogle}
                              disabled={isLoading}
                           >
                              <GoogleLogo className="w-5 h-5" />
                              Sign up with Google
                           </Button>
                        </>
                     )}

                     {step === 2 && (
                        <>
                           <div className="grid gap-4">
                              <div className="flex items-center justify-between mb-1">
                                 <div>
                                    <Label className="text-white text-lg font-bold">
                                       Pick Your Favorites
                                    </Label>
                                    <p className="text-sm text-gray-400 mt-1">
                                       Select at least 3 genres to personalize
                                       your feed
                                    </p>
                                 </div>
                              </div>

                              <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar p-1">
                                 {GENRES.map((genre) => {
                                    const isSelected = selectedGenres.includes(
                                       genre.id
                                    );
                                    return (
                                       <button
                                          key={genre.id}
                                          type="button"
                                          onClick={() => toggleGenre(genre.id)}
                                          className={cn(
                                             "relative overflow-hidden rounded-xl p-3 transition-all duration-200 border flex items-center justify-center group h-14",
                                             isSelected
                                                ? "bg-purple-600/20 border-purple-500/50 shadow-[0_0_15px_rgba(147,51,234,0.2)]"
                                                : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 hover:scale-[1.02]"
                                          )}
                                       >
                                          <span
                                             className={cn(
                                                "text-sm font-medium transition-colors text-center",
                                                isSelected
                                                   ? "text-white"
                                                   : "text-gray-300 group-hover:text-white"
                                             )}
                                          >
                                             {genre.name}
                                          </span>

                                          {/* Selection Indicator Dot */}
                                          <div
                                             className={cn(
                                                "absolute top-2 right-2 w-1.5 h-1.5 rounded-full transition-all duration-300",
                                                isSelected
                                                   ? "bg-purple-400 shadow-[0_0_6px_rgba(192,132,252,0.8)]"
                                                   : "bg-transparent"
                                             )}
                                          />
                                       </button>
                                    );
                                 })}
                              </div>
                           </div>

                           {error && (
                              <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                 {error}
                              </div>
                           )}

                           <div className="flex gap-3 pt-2">
                              <Button
                                 type="button"
                                 variant="ghost"
                                 onClick={() => setStep(1)}
                                 className="w-1/3 text-gray-400 hover:text-white hover:bg-white/5"
                                 disabled={isLoading}
                              >
                                 Back
                              </Button>
                              <Button
                                 type="submit"
                                 className="w-2/3 bg-purple-950 hover:bg-purple-400 text-white font-semibold h-11 relative overflow-hidden transition-colors"
                                 disabled={
                                    isLoading || selectedGenres.length < 3
                                 }
                              >
                                 {isLoading ? (
                                    <span className="flex items-center gap-2">
                                       <svg
                                          className="animate-spin h-4 w-4"
                                          xmlns="http://www.w3.org/2000/svg"
                                          fill="none"
                                          viewBox="0 0 24 24"
                                       >
                                          <circle
                                             className="opacity-25"
                                             cx="12"
                                             cy="12"
                                             r="10"
                                             stroke="currentColor"
                                             strokeWidth="4"
                                          />
                                          <path
                                             className="opacity-75"
                                             fill="currentColor"
                                             d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                          />
                                       </svg>
                                       <span className="animate-pulse text-sm">
                                          {
                                             LOADING_MESSAGES[
                                                loadingMessageIndex
                                             ]
                                          }
                                       </span>
                                    </span>
                                 ) : (
                                    "Create Account"
                                 )}
                              </Button>
                           </div>
                        </>
                     )}
                  </div>

                  {step === 1 && (
                     <div className="mt-6 text-center text-sm text-white">
                        Already have an account?{" "}
                        {onSwitchToLogin ? (
                           <button
                              type="button"
                              onClick={onSwitchToLogin}
                              className="underline underline-offset-4 font-semibold text-white hover:text-purple-300"
                           >
                              Login
                           </button>
                        ) : (
                           <Link
                              href="/auth/login"
                              className="underline underline-offset-4 font-semibold text-white hover:text-purple-300"
                           >
                              Login
                           </Link>
                        )}
                     </div>
                  )}
               </form>
            </CardContent>
         </Card>
      </div>
   );
}
