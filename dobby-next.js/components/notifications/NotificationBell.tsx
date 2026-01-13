"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Bell, Check, X, User as UserIcon, MessageSquare, Heart, UserPlus, Reply } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { createClient } from "@/lib/supabase/client";

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

interface Notification {
  id: string;
  user_id: string;
  actor_id: string;
  type: 'follow' | 'message' | 'like' | 'reply'; // Generic types
  resource_id?: string;
  content?: string;
  is_read: boolean;
  created_at: string;
  actor?: {
    id: string;
    username: string;
    avatar_url?: string | null;
  };
}

type NotificationItem = 
  | { kind: 'request'; data: FriendRequest }
  | { kind: 'notification'; data: Notification };

export default function NotificationBell() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const supabase = createClient();

  const fetchData = async () => {
    try {
      const [requestsRes, notifsRes] = await Promise.all([
        fetch("/api/friends/requests"),
        fetch("/api/notifications")
      ]);

      let newItems: NotificationItem[] = [];

      if (requestsRes.ok) {
        const d = await requestsRes.json();
        const reqs: FriendRequest[] = d.requests || [];
        newItems = newItems.concat(reqs.map((r: FriendRequest) => ({ kind: 'request', data: r })));
      }

      if (notifsRes.ok) {
        const d: Notification[] = await notifsRes.json();
        const notifs = Array.isArray(d) ? d : [];
        newItems = newItems.concat(notifs.map((n: Notification) => ({ kind: 'notification', data: n })));
      }

      newItems.sort((a, b) => {
        const dA = new Date(a.kind === 'request' ? a.data.created_at : a.data.created_at).getTime();
        const dB = new Date(b.kind === 'request' ? b.data.created_at : b.data.created_at).getTime();
        return dB - dA;
      });

      setItems(newItems);
      
      const reqCount = newItems.filter(i => i.kind === 'request').length;
      const notifCount = newItems.filter(i => i.kind === 'notification' && !i.data.is_read).length;
      setUnreadCount(reqCount + notifCount);

    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const channel = supabase.channel('realtime-bell')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => fetchData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friendships' },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const markAsRead = async (ids: string[]) => {
    if (ids.length === 0) return;
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds: ids }),
      });
      setItems(prev => prev.map(item => {
        if (item.kind === 'notification' && (ids.includes((item.data as Notification).id))) {
          return { kind: 'notification', data: { ...(item.data as Notification), is_read: true } };
        }
        return item;
      }));
      setUnreadCount(prev => Math.max(0, prev - ids.length));
    } catch (e) {
      console.error("Failed to mark notifications read", e);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      const unreadIds = items
        .filter(i => i.kind === 'notification' && !(i.data as Notification).is_read)
        .map(i => (i.data as Notification).id);
      
      if (unreadIds.length > 0) {
        markAsRead(unreadIds);
      }
    }
  };

  const handleAccept = async (requestId: string) => {
    setActionLoading(requestId);
    try {
      const res = await fetch(`/api/friends/request/${requestId}/accept`, { method: "POST" });
      if (res.ok) fetchData();
    } catch (error) {
      console.error("Error accepting request:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setActionLoading(requestId);
    try {
      const res = await fetch(`/api/friends/request/${requestId}/reject`, { method: "POST" });
      if (res.ok) fetchData();
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

  const getIcon = (type: string) => {
    switch(type) {
      case 'follow': return <UserPlus className="w-4 h-4 text-green-400" />;
      case 'message': return <MessageSquare className="w-4 h-4 text-blue-400" />;
      case 'like': return <Heart className="w-4 h-4 text-pink-400" />;
      case 'reply': return <Reply className="w-4 h-4 text-purple-400" />;
      default: return <Bell className="w-4 h-4 text-gray-400" />;
    }
  };

  const getLink = (notif: Notification) => {
    switch (notif.type) {
      case 'message': return `/messages?conversation=${notif.resource_id}`;
      case 'follow': return `/users/${notif.actor?.username || notif.resource_id}`;
      default: return '#';
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button className="relative p-2 hover:bg-zinc-800 rounded-full transition">
          <Bell className="w-5 h-5 text-gray-300" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-purple-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 bg-zinc-900 border-zinc-700" align="end">
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
          <h3 className="font-semibold text-white">Notifications</h3>
          {unreadCount > 0 && (
            <span className="text-xs bg-zinc-800 px-2 py-1 rounded-full text-zinc-400">{unreadCount} new</span>
          )}
        </div>

        <div className="max-h-96 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="p-8 text-center text-gray-400">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
            </div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No notifications</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {items.map((item, idx) => {
                if (item.kind === 'request') {
                  const request = (item.data as FriendRequest);
                  return (
                    <div key={`req-${request.id}`} className="p-4 hover:bg-zinc-800/50 transition">
                      <div className="flex items-start gap-3">
                        <Link href={`/users/${request.requester.username}`} className="flex-shrink-0">
                           <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-yellow-400 overflow-hidden flex items-center justify-center text-white font-bold text-sm">
                             {request.requester.avatar_url ? (
                               <Image src={request.requester.avatar_url} alt="" fill className="object-cover" />
                             ) : (request.requester.username[0].toUpperCase())}
                           </div>
                        </Link>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm">
                            <span className="font-semibold">{request.requester.username}</span> sent a friend request
                          </p>
                          <p className="text-gray-500 text-xs mt-1">{formatTimeAgo(request.created_at)}</p>
                          <div className="flex gap-2 mt-2">
                            <Button size="sm" onClick={() => handleAccept(request.id)} disabled={actionLoading === request.id} className="flex-1 bg-purple-600 hover:bg-purple-500 h-7 text-xs">Accept</Button>
                            <Button size="sm" variant="outline" onClick={() => handleReject(request.id)} disabled={actionLoading === request.id} className="flex-1 h-7 text-xs border-zinc-700 hover:bg-zinc-800">Reject</Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                } else {
                  const notif = (item.data as Notification);
                  const LinkComp = notif.type === 'message' || notif.type === 'follow' ? Link : 'div';
                  return (
                    <LinkComp 
                        key={`notif-${notif.id}`} 
                        href={getLink(notif)}
                        className={`block p-4 hover:bg-zinc-800/50 transition ${!notif.is_read ? 'bg-zinc-800/20' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="relative flex-shrink-0">
                           <div className="w-10 h-10 rounded-full bg-zinc-700 overflow-hidden flex items-center justify-center text-white font-bold text-sm">
                             {notif.actor?.avatar_url ? (
                               <Image src={notif.actor.avatar_url} alt="" fill className="object-cover" />
                             ) : (notif.actor?.username?.[0]?.toUpperCase() || '?')}
                           </div>
                           <div className="absolute -bottom-1 -right-1 bg-zinc-900 rounded-full p-0.5">
                             {getIcon(notif.type)}
                           </div>
                        </div>
                        <div className="flex-1 min-w-0">
                           <p className="text-white text-sm">
                             <span className="font-semibold">{notif.actor?.username}</span> {notif.type === 'message' ? 'sent you a message' : notif.type === 'follow' ? 'started following you' : notif.content || 'interacted with you'}
                           </p>
                           {notif.type === 'message' && notif.content && (
                             <p className="text-gray-400 text-xs mt-1 truncate">"{notif.content}"</p>
                           )}
                           <p className="text-gray-500 text-xs mt-1">{formatTimeAgo(notif.created_at)}</p>
                        </div>
                        {!notif.is_read && (
                          <div className="w-2 h-2 rounded-full bg-purple-500 mt-2"></div>
                        )}
                      </div>
                    </LinkComp>
                  );
                }
              })}
            </div>
          )}
        </div>

        {unreadCount === 0 && items.length > 5 && (
            <div className="p-3 border-t border-zinc-800 text-center">
                <span className="text-sm text-gray-500">All caught up!</span>
            </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
