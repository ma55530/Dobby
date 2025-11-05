export interface Movie {
  id: number;
  title: string;
  poster: string;
  rating: number;
  year: string;
  type: "movie" | "tv";
  description: string;
  genres: string[];
  director?: string;
  cast: string[];
}

export interface Review {
  id: number;
  author: string;
  avatar?: string;
  rating: number;
  content: string;
  date: string;
  likes: number;
}

export const trendingMovies: Movie[] = [
  {
    id: 1,
    title: "Inception",
    poster: "https://images.unsplash.com/photo-1667004569384-df0b431fea87?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=687",
    rating: 4.8,
    year: "2010",
    type: "movie",
    description: "A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.",
    genres: ["Sci-Fi", "Thriller", "Action"],
    director: "Christopher Nolan",
    cast: ["Leonardo DiCaprio", "Tom Hardy", "Marion Cotillard"]
  },
  {
    id: 2,
    title: "The Dark Knight",
    poster: "https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?w=400&h=600&fit=crop",
    rating: 4.9,
    year: "2008",
    type: "movie",
    description: "When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.",
    genres: ["Action", "Crime", "Drama"],
    director: "Christopher Nolan",
    cast: ["Christian Bale", "Heath Ledger", "Aaron Eckhart"]
  },
  {
    id: 3,
    title: "Breaking Bad",
    poster: "https://images.unsplash.com/photo-1685773907333-791250d21441?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=687",
    rating: 4.9,
    year: "2008-2013",
    type: "tv",
    description: "A high school chemistry teacher turned methamphetamine producer partners with a former student to secure his family's future.",
    genres: ["Crime", "Drama", "Thriller"],
    director: "Vince Gilligan",
    cast: ["Bryan Cranston", "Aaron Paul", "Anna Gunn"]
  },
  {
    id: 4,
    title: "Interstellar",
    poster: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=400&h=600&fit=crop",
    rating: 4.7,
    year: "2014",
    type: "movie",
    description: "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.",
    genres: ["Sci-Fi", "Drama", "Adventure"],
    director: "Christopher Nolan",
    cast: ["Matthew McConaughey", "Anne Hathaway", "Jessica Chastain"]
  },
  {
    id: 5,
    title: "The Godfather",
    poster: "https://upload.wikimedia.org/wikipedia/en/1/1c/Godfather_ver1.jpg",
    rating: 4.9,
    year: "1972",
    type: "movie",
    description: "The aging patriarch of an organized crime dynasty transfers control of his clandestine empire to his reluctant son.",
    genres: ["Crime", "Drama"],
    director: "Francis Ford Coppola",
    cast: ["Marlon Brando", "Al Pacino", "James Caan"]
  },
  {
    id: 6,
    title: "Stranger Things",
    poster: "https://images.unsplash.com/photo-1662916066779-acf931a2d377?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=687",
    rating: 4.6,
    year: "2016-Present",
    type: "tv",
    description: "When a young boy vanishes, a small town uncovers a mystery involving secret experiments, terrifying supernatural forces, and one strange little girl.",
    genres: ["Sci-Fi", "Horror", "Mystery"],
    director: "The Duffer Brothers",
    cast: ["Millie Bobby Brown", "Finn Wolfhard", "Winona Ryder"]
  }
];

export const recentReviews: Review[] = [
  {
    id: 1,
    author: "Brat 1",
    rating: 5.0,
    content: "Ma remek djelo",
    date: "2 days ago",
    likes: 42
  },
  {
    id: 2,
    author: "Brat 2",
    rating: 4.5,
    content: "Svida mi se...",
    date: "1 week ago",
    likes: 28
  },
  {
    id: 3,
    author: "Brat 3",
    rating: 4.8,
    content: "nesto nesto nesto nesto nesto nesto nesto nesto nesto nesto nesto nesto nesto nesto nesto nesto nesto nesto nesto nesto nesto nesto nesto nesto nesto nesto nesto nesto nesto nesto nesto nesto nesto nesto nesto nesto nesto nesto nesto nesto nesto nesto nesto nesto nesto ",
    date: "3 days ago",
    likes: 35
  }
];
