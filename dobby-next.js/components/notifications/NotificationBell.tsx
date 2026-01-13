"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Bell, Check, X, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface FriendRequest {
  id: string;
  requester_id: string;
  created_at: string;
  requester: {
    id: string;
    username: string;
    first_name?: string | null;
    last_name?: string | null;
    avatar_url?: string | null;
  };
}

export default function NotificationBell() {
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const fetchRequests = async () => {
    try {
      const res = await fetch("/api/friends/requests");
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests || []);
      }
    } catch (error) {
      console.error("Error fetching requests:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    // Poll every 30 seconds for new requests
    const interval = setInterval(fetchRequests, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleAccept = async (requestId: string) => {
    setActionLoading(requestId);
    try {
      const res = await fetch(`/api/friends/request/${requestId}/accept`, {
        method: "POST",
      });

      if (res.ok) {
        setRequests((prev) => prev.filter((req) => req.id !== requestId));
      }
    } catch (error) {
      console.error("Error accepting request:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setActionLoading(requestId);
    try {
      const res = await fetch(`/api/friends/request/${requestId}/reject`, {
        method: "POST",
      });

      if (res.ok) {
        setRequests((prev) => prev.filter((req) => req.id !== requestId));
      }
    } catch (error) {
      console.error("Error rejecting request:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button className="relative p-2 hover:bg-zinc-800 rounded-full transition">
          <Bell className="w-5 h-5 text-gray-300" />
          {requests.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-purple-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {requests.length}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 bg-zinc-900 border-zinc-700" align="end">
        <div className="p-4 border-b border-zinc-800">
          <h3 className="font-semibold text-white">Friend Requests</h3>
          {requests.length > 0 && (
            <p className="text-sm text-gray-400 mt-1">
              {requests.length} pending {requests.length === 1 ? "request" : "requests"}
            </p>
          )}
        </div>

        <div className="max-h-96 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="p-8 text-center text-gray-400">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
            </div>
          ) : requests.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No pending requests</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {requests.map((request) => (
                <div key={request.id} className="p-4 hover:bg-zinc-800/50 transition">
                  <div className="flex items-start gap-3">
                    <Link
                      href={`/users/${request.requester.username}`}
                      onClick={() => setIsOpen(false)}
                      className="flex-shrink-0"
                    >
                      <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-yellow-400 overflow-hidden">
                        {request.requester.avatar_url ? (
                          <Image
                            src={request.requester.avatar_url}
                            alt={request.requester.username}
                            fill
                            sizes="40px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white font-bold">
                            {(request.requester.first_name?.[0] || request.requester.username[0]).toUpperCase()}
                          </div>
                        )}
                      </div>
                    </Link>

                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/users/${request.requester.username}`}
                        onClick={() => setIsOpen(false)}
                        className="hover:underline"
                      >
                        <p className="text-white font-medium text-sm truncate">
                          {request.requester.first_name && request.requester.last_name
                            ? `${request.requester.first_name} ${request.requester.last_name}`
                            : `@${request.requester.username}`}
                        </p>
                        <p className="text-gray-400 text-xs">@{request.requester.username}</p>
                      </Link>
                      <p className="text-gray-500 text-xs mt-1">
                        {formatTimeAgo(request.created_at)}
                      </p>

                      <div className="flex gap-2 mt-3">
                        <Button
                          size="sm"
                          onClick={() => handleAccept(request.id)}
                          disabled={actionLoading === request.id}
                          className="flex-1 bg-purple-600 hover:bg-purple-500 h-8 text-xs"
                        >
                          <Check className="w-3 h-3 mr-1" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReject(request.id)}
                          disabled={actionLoading === request.id}
                          className="flex-1 h-8 text-xs border-zinc-700 hover:bg-zinc-800"
                        >
                          <X className="w-3 h-3 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {requests.length > 0 && (
          <div className="p-3 border-t border-zinc-800 text-center">
            <Link
              href="/friends/requests"
              onClick={() => setIsOpen(false)}
              className="text-sm text-purple-400 hover:text-purple-300 font-medium"
            >
              View all requests
            </Link>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
