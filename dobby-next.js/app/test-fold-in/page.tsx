"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
   Card,
   CardContent,
   CardDescription,
   CardHeader,
   CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

// genre list
const AVAILABLE_GENRES = [
   "Action",
   "Adventure",
   "Animation",
   "Comedy",
   "Crime",
   "Documentary",
   "Drama",
   "Family",
   "Fantasy",
   "History",
   "Horror",
   "Music",
   "Mystery",
   "Romance",
   "Science Fiction",
   "TV Movie",
   "Thriller",
   "War",
   "Western",
];

// Mapiraj žanrove na kodove (prilagodi prema svom modelu)
const GENRE_CODE_MAP: Record<string, string> = {
   Action: "g0",
   Adventure: "g1",
   Animation: "g2",
   Comedy: "g3",
   Crime: "g4",
   Documentary: "g5",
   Drama: "g6",
   Family: "g7",
   Fantasy: "g8",
   History: "g9",
   Horror: "g10",
   Music: "g11",
   Mystery: "g12",
   Romance: "g13",
   "Science Fiction": "g14",
   "TV Movie": "g15",
   Thriller: "g16",
   War: "g17",
   Western: "g18",
};

export default function TestFoldInPage() {
   const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
   const [loading, setLoading] = useState(false);
   // eslint-disable-next-line @typescript-eslint/no-explicit-any
   const [result, setResult] = useState<any>(null);
   const [error, setError] = useState<string | null>(null);
   const router = useRouter();

   const toggleGenre = (genre: string) => {
      setSelectedGenres((prev) =>
         prev.includes(genre)
            ? prev.filter((g) => g !== genre)
            : [...prev, genre]
      );
   };

   const handleSubmit = async () => {
      setLoading(true);
      setError(null);
      setResult(null);

      try {
         const supabase = createClient();
         const {
            data: { session },
         } = await supabase.auth.getSession();

         if (!session) {
            setError("Nisi prijavljen! Molim te prijavi se prvo.");
            setLoading(false);
            return;
         }

         // Mapiraj odabrane žanrove na kodove
         const selectedGenreCodes = selectedGenres
            .map((g) => GENRE_CODE_MAP[g])
            .filter(Boolean);

         if (selectedGenreCodes.length === 0) {
            setError("Nijedan odabrani žanr nije podržan.");
            setLoading(false);
            return;
         }

         const response = await fetch("/api/dobbySenseAPI/fold-in", {
            method: "POST",
            headers: {
               "Content-Type": "application/json",
            },
            body: JSON.stringify({ selectedGenres: selectedGenreCodes }),
         });

         const data = await response.json();

         if (!response.ok) {
            throw new Error(data.error || "Došlo je do greške");
         }

         // On success, redirect to home page immediately as requested
         // The background process will handle recommendations and flags
         router.push("/");
      } catch (err) {
         if (err instanceof Error) {
            setError(err.message);
         } else {
            setError("Došlo je do greške");
         }
         setLoading(false);
      } finally {
         // Don't turn off loading on success, wait for polling
      }
   };

   return (
      <div className="container mx-auto py-10 max-w-2xl">
         <Card>
            <CardHeader>
               <CardTitle>Test Fold-In (Cold Start)</CardTitle>
               <CardDescription>
                  Odaberi žanrove koje voliš kako bi generirali tvoj početni
                  embedding.
               </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
               {loading && (
                  <div className="p-4 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-md text-sm mb-4 animate-pulse">
                     <strong>Processing...</strong>
                  </div>
               )}

               {/* Genre Selection */}
               <div className="flex flex-wrap gap-2">
                  {AVAILABLE_GENRES.map((genre) => (
                     <Badge
                        key={genre}
                        variant={
                           selectedGenres.includes(genre)
                              ? "default"
                              : "outline"
                        }
                        className="cursor-pointer text-sm py-1 px-3 hover:bg-primary/80 transition-colors"
                        onClick={() => toggleGenre(genre)}
                     >
                        {genre}
                     </Badge>
                  ))}
               </div>

               <div className="text-sm text-muted-foreground">
                  Odabrano: {selectedGenres.length}
               </div>

               <Button
                  onClick={handleSubmit}
                  disabled={loading || selectedGenres.length === 0}
                  className="w-full"
               >
                  {loading ? "Generiranje..." : "Pošalji Fold-In Request"}
               </Button>

               {/* Error Display */}
               {error && (
                  <div className="p-4 bg-destructive/10 text-destructive rounded-md text-sm">
                     <strong>Greška:</strong> {error}
                  </div>
               )}

               {/* Success Display */}
               {result && (
                  <div className="space-y-2">
                     <div className="p-4 bg-green-500/10 text-green-600 dark:text-green-400 rounded-md text-sm">
                        <strong>Uspjeh!</strong> Embedding je kreiran i
                        spremljen.
                     </div>

                     <div className="bg-muted p-4 rounded-md overflow-auto max-h-60 text-xs font-mono">
                        <pre>{JSON.stringify(result, null, 2)}</pre>
                     </div>
                  </div>
               )}
            </CardContent>
         </Card>
      </div>
   );
}
