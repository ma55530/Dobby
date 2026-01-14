'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Search, Send } from 'lucide-react';

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemType: 'movie' | 'show';
  itemId: number;
  title: string;
  posterPath: string | null;
  rating: number;
  year: string;
}

interface Conversation {
  id: string;
  participants: Array<{ id: string; username?: string; email: string }>;
}

export function ShareDialog({
  open,
  onOpenChange,
  itemType,
  itemId,
  title,
  posterPath,
  rating,
  year,
}: ShareDialogProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchConversations();
      fetchCurrentUser();
    }
  }, [open]);

  const fetchCurrentUser = async () => {
    const res = await fetch('/api/user');
    if (!res.ok) return;

    const data = await res.json();
    setCurrentUserId(data.id);
  };

  const fetchConversations = async () => {
    const res = await fetch('/api/conversations');
    if (!res.ok) return;

    const data = await res.json();
    setConversations(data);
  };

  const getOtherUser = (conv: Conversation) => {
    if (!currentUserId) return null;
    return conv.participants.find((p) => p.id !== currentUserId) ?? null;
  };

  const sendRecommendation = async (conversationId: string) => {
    if (sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: message.trim() || `Check out this ${itemType}!`,
          message_type: itemType === 'movie' ? 'movie_recommendation' : 'show_recommendation',
          metadata: {
            [itemType === 'movie' ? 'movie_id' : 'show_id']: itemId,
            title,
            poster_path: posterPath,
            rating,
            year,
          },
        }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => null);
        console.error('Failed to send recommendation:', error ?? (await res.text()));
        return;
      }

      setMessage('');
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to send recommendation:', error);
    } finally {
      setSending(false);
    }
  };

  const filteredConversations = conversations.filter((conv) => {
    const searchLower = searchQuery.toLowerCase();

    if (!searchLower) return true;

    const otherUser = getOtherUser(conv);
    if (!otherUser) {
      return conv.participants.some((p) => {
        const usernameMatch = p.username?.toLowerCase().includes(searchLower);
        const emailMatch = p.email.toLowerCase().includes(searchLower);
        return Boolean(usernameMatch || emailMatch);
      });
    }

    return (
      otherUser?.username?.toLowerCase().includes(searchLower) ||
      otherUser?.email.toLowerCase().includes(searchLower)
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle>Share &quot;{title}&quot;</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Optional message */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">
              Add a message (optional)
            </label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Why do you recommend this?"
              className="bg-slate-900 border-slate-600 text-white"
              rows={2}
            />
          </div>

          {/* Search conversations */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">
              Send to
            </label>
            <div className="flex gap-2 mb-3">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="bg-slate-900 border-slate-600 text-white"
              />
              <Button disabled className="bg-purple-600">
                <Search className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Conversation list */}
          <div className="max-h-64 overflow-y-auto space-y-2">
            {filteredConversations.length === 0 ? (
              <p className="text-center text-gray-400 py-8">
                No conversations found. Start a conversation first!
              </p>
            ) : (
              filteredConversations.map((conv) => {
                const otherUser = getOtherUser(conv);
                return (
                  <div
                    key={conv.id}
                    onClick={() => sendRecommendation(conv.id)}
                    className="p-3 rounded-lg bg-slate-700 hover:bg-slate-600 cursor-pointer transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-semibold">
                        {otherUser?.username?.[0]?.toUpperCase() || otherUser?.email?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="font-medium">
                          {otherUser?.username || otherUser?.email || 'Unknown User'}
                        </p>
                      </div>
                    </div>
                    <Send className="w-4 h-4 text-purple-400" />
                  </div>
                );
              })
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
