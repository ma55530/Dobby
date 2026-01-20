/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function RatingCard({ post }: any) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
      
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("isAdmin")
          .eq("id", user.id)
          .single();
        setIsAdmin(profile?.isAdmin || false);
      }
    };
    fetchCurrentUser();
  }, [supabase]);

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    setDeleteDialogOpen(false);
    try {
      const response = await fetch(`/api/ratings/${post.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        window.location.reload();
      } else {
        alert("Failed to delete rating");
      }
    } catch (error) {
      console.error("Failed to delete rating:", error);
      alert("Failed to delete rating");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="bg-zinc-900/50 border border-zinc-700/50 rounded-lg overflow-hidden hover:border-zinc-600 transition-all duration-300 hover:shadow-lg flex h-24 relative">
        {/* Delete button - top right corner */}
        {currentUserId && post.userId && (currentUserId === post.userId || isAdmin) && (
          <button
            onClick={handleDeleteClick}
            disabled={isDeleting}
            className="absolute top-2 right-2 z-10 p-1.5 rounded-lg bg-zinc-800/80 hover:bg-red-600/80 text-red-400 hover:text-white transition-all disabled:opacity-50"
            title="Delete rating"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Left Side - Content */}
        <div className="flex-1 p-3 flex flex-col justify-between">
        {/* Title and Rating */}
        <div>
          {post.movieId && post.movieType ? (
            <Link href={`/${post.movieType === 'movie' ? 'movies' : 'shows'}/${post.movieId}`} className="hover:opacity-80 transition-opacity">
              <h4 className="font-bold text-xs text-white line-clamp-1 hover:text-purple-400 transition-colors">{post.movieTitle}</h4>
            </Link>
          ) : (
            <h4 className="font-bold text-xs text-white line-clamp-1">{post.movieTitle}</h4>
          )}
          
          {/* Rating Display */}
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-full transition-all duration-300"
                style={{ width: `${(post.rating / 10) * 100}%` }}
              />
            </div>
            <span className="text-purple-400 font-bold text-sm whitespace-nowrap">{post.rating}</span>
          </div>
        </div>

        {/* User Info */}
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0 overflow-hidden">
            {post.avatar ? (
              <Image
                src={post.avatar}
                alt={post.author}
                width={20}
                height={20}
                className="w-full h-full object-cover"
              />
            ) : (
              post.author.charAt(0)
            )}
          </div>
          <div className="flex-1 min-w-0">
            {post.userId ? (
              <Link href={`/users/${post.author}`} className="hover:opacity-80 transition-opacity">
                <p className="font-semibold text-white text-xs truncate hover:text-purple-400 transition-colors">{post.author}</p>
              </Link>
            ) : (
              <p className="font-semibold text-white text-xs truncate">{post.author}</p>
            )}
          </div>
        </div>
      </div>

      {/* Right Side - Poster */}
      {post.moviePoster && (
        <div className="w-24 h-24 relative flex-shrink-0 bg-zinc-800">
          <Image
            src={post.moviePoster}
            alt={post.movieTitle}
            fill
            className="object-contain"
          />
        </div>
      )}
    </div>

    {/* Delete Confirmation Dialog */}
    <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <DialogContent className="bg-zinc-900 border border-zinc-700">
        <DialogHeader>
          <DialogTitle className="text-white">Delete Rating</DialogTitle>
          <DialogDescription className="text-gray-400">
            Are you sure you want to delete this rating? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-6">
          <Button
            variant="ghost"
            onClick={() => setDeleteDialogOpen(false)}
            className="bg-zinc-800 text-white hover:bg-zinc-700"
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            disabled={isDeleting}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>
  );
}
