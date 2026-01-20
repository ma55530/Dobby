import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { get_options } from "@/lib/TMDB_API/requestOptions";

export async function GET() {
   const supabase = await createClient();

   // Get session
   const {
      data: { user },
      error: sessionError,
   } = await supabase.auth.getUser();
   if (sessionError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
   }

   try {
      // Fetch all watchlists for this user (excluding "Recently Searched")
      const { data: watchlists, error: watchlistsError } = await supabase
         .from("watchlists")
         .select("id, name")
         .eq("user_id", user.id)
         .neq("name", "Recently Searched");

      if (watchlistsError) {
         console.error("Watchlist error:", watchlistsError);
         return NextResponse.json(
            { error: "Failed to fetch watchlists" },
            { status: 400 }
         );
      }

      if (!watchlists || watchlists.length === 0) {
         return NextResponse.json({ watchlists: [] });
      }

      // Fetch items for each watchlist
      const watchlistsWithItems = await Promise.all(
         watchlists.map(async (watchlist) => {
            const { data: items, error: itemsError } = await supabase
               .from("watchlist_items")
               .select("movie_id, show_id, added_at")
               .eq("watchlist_id", watchlist.id)
               .order("added_at", { ascending: false });

            if (itemsError) {
               console.error(
                  `Error fetching items for watchlist ${watchlist.id}:`,
                  itemsError
               );
               return { ...watchlist, items: [] };
            }

            // Fetch details from TMDB for each item
            const itemsWithDetails = await Promise.all(
               (items || []).map(async (item) => {
                  try {
                     if (item.movie_id) {
                        const res = await fetch(
                           `https://api.themoviedb.org/3/movie/${item.movie_id}`,
                           get_options
                        );
                        if (res.ok) {
                           const movie = await res.json();
                           return {
                              type: "movie" as const,
                              id: movie.id,
                              title: movie.title,
                              poster_path: movie.poster_path,
                              release_date: movie.release_date,
                              vote_average: movie.vote_average,
                              overview: movie.overview,
                              added_at: item.added_at,
                           };
                        }
                     } else if (item.show_id) {
                        const res = await fetch(
                           `https://api.themoviedb.org/3/tv/${item.show_id}`,
                           get_options
                        );
                        if (res.ok) {
                           const show = await res.json();
                           return {
                              type: "show" as const,
                              id: show.id,
                              title: show.name,
                              poster_path: show.poster_path,
                              release_date: show.first_air_date,
                              vote_average: show.vote_average,
                              overview: show.overview,
                              added_at: item.added_at,
                           };
                        }
                     }
                  } catch (err) {
                     console.error("Error fetching item details:", err);
                  }
                  return null;
               })
            );

            return {
               ...watchlist,
               items: itemsWithDetails.filter(Boolean),
            };
         })
      );

      return NextResponse.json({ watchlists: watchlistsWithItems });
   } catch (error) {
      console.error("Watchlist error:", error);
      return NextResponse.json(
         { error: "Failed to fetch watchlists" },
         { status: 500 }
      );
   }
}

export async function POST(request: Request) {
   const supabase = await createClient();

   // Get session
   const {
      data: { user },
      error: sessionError,
   } = await supabase.auth.getUser();
   if (sessionError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
   }

   try {
      const body = await request.json();
      const { movieId, showId, watchlistName } = body;

      if (!movieId && !showId) {
         return NextResponse.json(
            { error: "Either movieId or showId is required" },
            { status: 400 }
         );
      }

      // Get or create the watchlist
      let watchlistId: string;

      if (watchlistName) {
         // Try to find existing watchlist with this name
         const { data: existingWatchlist } = await supabase
            .from("watchlists")
            .select("id")
            .eq("user_id", user.id)
            .eq("name", watchlistName)
            .maybeSingle();

         if (existingWatchlist) {
            watchlistId = existingWatchlist.id;
         } else {
            // Create new watchlist
            const { data: newWatchlist, error: createError } = await supabase
               .from("watchlists")
               .insert({ user_id: user.id, name: watchlistName })
               .select("id")
               .single();

            if (createError) {
               console.error("Error creating watchlist:", createError);
               return NextResponse.json(
                  { error: "Failed to create watchlist" },
                  { status: 400 }
               );
            }

            watchlistId = newWatchlist.id;
         }
      } else {
         // Use default "My Watchlist" or first available watchlist
         const { data: watchlists, error: watchlistsError } = await supabase
            .from("watchlists")
            .select("id, name")
            .eq("user_id", user.id)
            .order("created_at", { ascending: true })
            .limit(1);

         if (watchlistsError) {
            console.error("Error fetching watchlists:", watchlistsError);
            return NextResponse.json(
               { error: "Failed to fetch watchlists" },
               { status: 400 }
            );
         }

         if (watchlists && watchlists.length > 0) {
            watchlistId = watchlists[0].id;
         } else {
            // Create default watchlist
            const { data: newWatchlist, error: createError } = await supabase
               .from("watchlists")
               .insert({ user_id: user.id, name: "My Watchlist" })
               .select("id")
               .single();

            if (createError) {
               console.error("Error creating default watchlist:", createError);
               return NextResponse.json(
                  { error: "Failed to create watchlist" },
                  { status: 400 }
               );
            }

            watchlistId = newWatchlist.id;
         }
      }

      // Check if item already exists in this watchlist
      const { data: existingItem } = await supabase
         .from("watchlist_items")
         .select("id")
         .eq("watchlist_id", watchlistId)
         .eq(movieId ? "movie_id" : "show_id", movieId || showId)
         .maybeSingle();

      if (existingItem) {
         return NextResponse.json(
            { error: "Item already in watchlist" },
            { status: 409 }
         );
      }

      // Add item to watchlist
      const { error: insertError } = await supabase
         .from("watchlist_items")
         .insert({
            watchlist_id: watchlistId,
            movie_id: movieId || null,
            show_id: showId || null,
         });

      if (insertError) {
         // Check if it's a duplicate entry
         if (insertError.code === "23505") {
            return NextResponse.json(
               { error: "Item already in watchlist" },
               { status: 409 }
            );
         }
         console.error("Error adding to watchlist:", insertError);
         return NextResponse.json(
            { error: "Failed to add to watchlist" },
            { status: 400 }
         );
      }

      return NextResponse.json({
         success: true,
         message: "Added to watchlist",
      });
   } catch (error) {
      console.error("Watchlist add error:", error);
      return NextResponse.json(
         { error: "Failed to add to watchlist" },
         { status: 500 }
      );
   }
}

export async function DELETE(request: Request) {
   const supabase = await createClient();

   // Get session
   const {
      data: { user },
      error: sessionError,
   } = await supabase.auth.getUser();
   if (sessionError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
   }

   try {
      const body = await request.json();
      const { movieId, showId, watchlistName } = body;

      if (!movieId && !showId) {
         return NextResponse.json(
            { error: "Either movieId or showId is required" },
            { status: 400 }
         );
      }

      // If watchlistName is provided, delete from that specific watchlist only
      if (watchlistName) {
         const { data: watchlist } = await supabase
            .from("watchlists")
            .select("id")
            .eq("user_id", user.id)
            .eq("name", watchlistName)
            .maybeSingle();

         if (!watchlist) {
            return NextResponse.json(
               { error: "Watchlist not found" },
               { status: 404 }
            );
         }

         const { error: deleteError } = await supabase
            .from("watchlist_items")
            .delete()
            .eq("watchlist_id", watchlist.id)
            .eq(movieId ? "movie_id" : "show_id", movieId || showId);

         if (deleteError) {
            console.error("Error removing from watchlist:", deleteError);
            return NextResponse.json(
               { error: "Failed to remove from watchlist" },
               { status: 400 }
            );
         }

         return NextResponse.json({
            success: true,
            message: "Removed from watchlist",
         });
      }

      // Otherwise, delete from all watchlists (original behavior)
      const { data: watchlists, error: watchlistsError } = await supabase
         .from("watchlists")
         .select("id")
         .eq("user_id", user.id);

      if (watchlistsError || !watchlists) {
         return NextResponse.json(
            { error: "Failed to fetch watchlists" },
            { status: 400 }
         );
      }

      const watchlistIds = watchlists.map((w) => w.id);

      // Delete item from all watchlists
      let query = supabase
         .from("watchlist_items")
         .delete()
         .in("watchlist_id", watchlistIds);

      if (movieId) {
         query = query.eq("movie_id", parseInt(movieId));
      } else if (showId) {
         query = query.eq("show_id", parseInt(showId));
      }

      const { error: deleteError } = await query;

      if (deleteError) {
         console.error("Error removing from watchlist:", deleteError);
         return NextResponse.json(
            { error: "Failed to remove from watchlist" },
            { status: 400 }
         );
      }

      return NextResponse.json({
         success: true,
         message: "Removed from watchlist",
      });
   } catch (error) {
      console.error("Watchlist remove error:", error);
      return NextResponse.json(
         { error: "Failed to remove from watchlist" },
         { status: 500 }
      );
   }
}
