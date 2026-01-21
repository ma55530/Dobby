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
    
    // Get limit from query params
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

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

    // Fetch posts (reviews) for this user by joining with rating table
    const { data: posts, error: postsError } = await supabase
      .from("post")
      .select(
        `
        id,
        title,
        post_text,
        like_count,
        dislike_count,
        comment_count,
        rating!inner (
          id,
          user_id,
          movie_id,
          show_id,
          rating,
          created_at,
          profiles (
            username,
            avatar_url
          )
        )
      `
      )
      .eq("rating.user_id", userId)
      .order("rating(created_at)", { ascending: false })
      .limit(limit);

    if (postsError) {
      console.error("Supabase posts error:", postsError);
      return NextResponse.json({ error: postsError.message }, { status: 400 });
    }

    if (!posts || posts.length === 0) {
      return NextResponse.json({ reviews: [] });
    }

    // Build poster map - fetch posters based on type
    const posterMap = new Map();
    
    // Get unique movie IDs and show IDs
    const movieIds = [...new Set(posts.filter((p: any) => p.rating?.movie_id).map((p: any) => p.rating.movie_id))];
    const showIds = [...new Set(posts.filter((p: any) => p.rating?.show_id).map((p: any) => p.rating.show_id))];

    // Fetch movie posters
    for (const movieId of movieIds) {
      try {
        const res = await fetch(
          `https://api.themoviedb.org/3/movie/${movieId}`,
          get_options
        );
        if (res.ok) {
          const movieData = await res.json();
          const posterUrl = movieData.poster_path 
            ? `https://image.tmdb.org/t/p/w500${movieData.poster_path}`
            : "";
          posterMap.set(`movie_${movieId}`, { posterUrl, title: movieData.title });
        }
      } catch (error) {
        console.error(`Error fetching movie ${movieId}:`, error);
      }
    }

    // Fetch show posters
    for (const showId of showIds) {
      try {
        const res = await fetch(
          `https://api.themoviedb.org/3/tv/${showId}`,
          get_options
        );
        if (res.ok) {
          const showData = await res.json();
          const posterUrl = showData.poster_path 
            ? `https://image.tmdb.org/t/p/w500${showData.poster_path}`
            : "";
          posterMap.set(`tv_${showId}`, { posterUrl, title: showData.name });
        }
      } catch (error) {
        console.error(`Error fetching show ${showId}:`, error);
      }
    }

    // Transform data to match ReviewCard interface
    const enrichedReviews = posts.map((post: any) => {
      const rating = post.rating;
      const isMovie = !!rating.movie_id;
      const contentId = isMovie ? rating.movie_id : rating.show_id;
      const mediaType = isMovie ? "movie" : "tv";
      const key = `${mediaType}_${contentId}`;
      const mediaData = posterMap.get(key);
      
      return {
        id: post.id,
        author: rating.profiles?.username || "Anonymous",
        avatar: rating.profiles?.avatar_url,
        rating: rating.rating,
        content: post.post_text || "",
        date: new Date(rating.created_at).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        }),
        likes: post.like_count || 0,
        movieId: contentId,
        movieTitle: mediaData?.title || "Unknown",
        movieType: mediaType as "movie" | "tv",
        moviePoster: mediaData?.posterUrl || "",
        hasChildren: (post.comment_count || 0) > 0,
        commentCount: post.comment_count || 0,
        userId: rating.user_id,
      };
    });

    return NextResponse.json({ reviews: enrichedReviews });
  } catch (error) {
    console.error("Error fetching user reviews:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
