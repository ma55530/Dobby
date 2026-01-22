import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { get_options } from "@/lib/TMDB_API/requestOptions";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Check if id is a UUID or username
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    
    let userId: string;
    
    if (isUUID) {
      // If it's already a UUID, use it directly
      userId = id;
    } else {
      // Otherwise, look up by username
      const { data: userData, error: userError } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", id)
        .single();

      if (userError || !userData) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      userId = userData.id;
    }

    // Fetch all watchlists for this user (excluding "Recently Searched")
    const { data: watchlists, error: watchlistsError } = await supabase
      .from("watchlists")
      .select("id, name")
      .eq("user_id", userId)
      .neq("name", "Recently Searched");

    if (watchlistsError) {
      console.error("Watchlist error:", watchlistsError);
      return NextResponse.json(
        { error: "Failed to fetch watchlists" },
        { status: 400 }
      );
    }

    if (!watchlists || watchlists.length === 0) {
      return NextResponse.json([]);
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
          return { ...watchlist, watchlist_items: [] };
        }

        // Fetch details from TMDB for each item
        type ItemRow = { movie_id?: number | null; show_id?: number | null; added_at?: string | null };

        const itemsWithDetails = await Promise.all(
          (items || []).map(async (itemRaw: ItemRow) => {
            try {
              if (itemRaw.movie_id) {
                const res = await fetch(
                  `https://api.themoviedb.org/3/movie/${itemRaw.movie_id}`,
                  get_options
                );
                if (res.ok) {
                  const movie = (await res.json()) as Record<string, unknown>;
                  return {
                    movie_id: (movie.id as number) ?? null,
                    show_id: null,
                    movies: {
                      title: (movie.title as string) ?? undefined,
                      poster_path: (movie.poster_path as string) ?? undefined,
                    },
                    shows: null,
                    added_at: itemRaw.added_at,
                  };
                }
              } else if (itemRaw.show_id) {
                const res = await fetch(
                  `https://api.themoviedb.org/3/tv/${itemRaw.show_id}`,
                  get_options
                );
                if (res.ok) {
                  const show = (await res.json()) as Record<string, unknown>;
                  return {
                    movie_id: null,
                    show_id: (show.id as number) ?? null,
                    movies: null,
                    shows: {
                      name: (show.name as string) ?? undefined,
                      poster_path: (show.poster_path as string) ?? undefined,
                    },
                    added_at: itemRaw.added_at,
                  };
                }
              }
            } catch (error) {
              console.error("Error fetching TMDB details:", error);
            }
            return null;
          })
        );

        return {
          ...watchlist,
          watchlist_items: itemsWithDetails.filter((item) => item !== null),
        };
      })
    );

    return NextResponse.json(watchlistsWithItems);
  } catch (error) {
    console.error("Error fetching user watchlists:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
