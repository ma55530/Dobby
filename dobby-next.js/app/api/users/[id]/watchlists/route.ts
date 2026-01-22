/* eslint-disable @typescript-eslint/no-explicit-any */
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
                    movie_id: movie.id,
                    show_id: null,
                    movies: {
                      title: movie.title,
                      poster_path: movie.poster_path,
                    },
                    shows: null,
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
                    movie_id: null,
                    show_id: show.id,
                    movies: null,
                    shows: {
                      name: show.name,
                      poster_path: show.poster_path,
                    },
                    added_at: item.added_at,
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
