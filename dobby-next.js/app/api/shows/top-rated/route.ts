import { Show } from "@/lib/types/Show";
import { NextResponse } from "next/server";
import { get_options } from "@/lib/TMDB_API/requestOptions";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = searchParams.get("page") || "1";

  const url = `https://api.themoviedb.org/3/tv/top_rated?page=${page}`;

  const response = await fetch(url, get_options);

  try {
    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        {
          error: `Failed to fetch popular shows from TMDB: ${errorData.status_message}`,
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    const popularShows: Show[] = data.results;
    return NextResponse.json(popularShows);
  } catch (error) {
    console.error("Internal Server Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
