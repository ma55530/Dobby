import { Movie } from '@/lib/types/Movie';
import { Show } from '@/lib/types/Show';

export function getImageUrl(imageUrl: string){
  return(
    'https://image.tmdb.org/t/p/w500' + imageUrl
  )
}

export async function getMovieDetails(movieId: number): Promise<Movie | null> {
  try {
    const response = await fetch(`/api/movies/${movieId}`, {
      cache: 'revalidate',
      next: { revalidate: 3600 } // Revalidate every hour
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch movie details: ${response.statusText}`);
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching movie details:', error);
    return null;
  }
}

export async function getShowDetails(showId: number): Promise<Show | null> {
  try {
    const response = await fetch(`/api/shows/${showId}`, {
      cache: 'revalidate',
      next: { revalidate: 3600 } // Revalidate every hour
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch show details: ${response.statusText}`);
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching show details:', error);
    return null;
  }
}
