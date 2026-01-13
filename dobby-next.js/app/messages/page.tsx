'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Conversation } from '@/lib/types/Conversation';
import { Message } from '@/lib/types/Message';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { Send, MessageCircle, Search, Plus, Check, CheckCheck, Film, Tv, MoreVertical, Trash2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

import { Suspense } from 'react';

function MessagesContent() {
  const searchParams = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [newConversationOpen, setNewConversationOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    if (scrollContainerRef.current) {
      const { scrollHeight, clientHeight } = scrollContainerRef.current;
      scrollContainerRef.current.scrollTo({
        top: scrollHeight - clientHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, activeConversation]);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      await fetchConversations();

      const conversationId = searchParams.get('conversation');
      if (conversationId) {
        setActiveConversation(conversationId);
        await fetchMessages(conversationId);
      }

      setLoading(false);
    };
    init();
  }, [searchParams]);

  useEffect(() => {
    const channel = supabase
      .channel('realtime-messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMsg = payload.new as Message;

          if (activeConversation && newMsg.conversation_id === activeConversation) {
            setMessages(prev => [...prev, newMsg]);
            setConversations(prev =>
              prev.map(c => c.id === activeConversation ? { ...c, unread_count: 0 } : c)
            );
          } else {
            setConversations(prev =>
              prev.map(c =>
                c.id === newMsg.conversation_id
                  ? { ...c, unread_count: (c.unread_count ?? 0) + 1 }
                  : c
              )
            );
          }

          // refresh last_message
          fetchConversations();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        (payload) => {
          const updatedMsg = payload.new as Message;
          setMessages(prev =>
            prev.map(m =>
              String(m.id) === String(updatedMsg.id) ? { ...m, is_read: updatedMsg.is_read } : m
            )
          );
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'messages' },
        (payload) => {
          const deletedMsgId = payload.old.id;
          setMessages((prev) => prev.filter((m) => m.id !== deletedMsgId));
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConversation]);

  const fetchConversations = async () => {
    const res = await fetch('/api/conversations');
    if (res.ok) {
      const data: Conversation[] = await res.json();
      setConversations(prev => {
        return data.map(conv => {
          const localConv = prev.find(c => c.id === conv.id);
          return localConv ? { ...conv, unread_count: localConv.unread_count } : conv;
        });
      });
    }
  };

  const fetchMessages = async (conversationId: string) => {
    const res = await fetch(`/api/conversations/${conversationId}/messages`);
    if (res.ok) {
      const data: Message[] = await res.json();
      const uniqueMessages = Array.from(new Map(data.map(m => [m.id, m])).values());
      setMessages(uniqueMessages);

      await fetch(`/api/conversations/${conversationId}/messages`, { method: 'PATCH' });

      // Identify unread messages from others to mark their notifications as read
      // We can just try to mark all notifications for these messages as read.
      const messageIds = uniqueMessages.map(m => m.id);
      if (messageIds.length > 0) {
        await markMessageNotificationsAsRead(messageIds);
      }

      setConversations(prev =>
        prev.map(c => c.id === conversationId ? { ...c, unread_count: 0 } : c)
      );
    }
  };

  const markMessageNotificationsAsRead = async (messageIds: string[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Find notifications for these messages
      const { data: notifications } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', user.id)
        .eq('type', 'message')
        .in('resource_id', messageIds)
        .eq('is_read', false);

      if (notifications && notifications.length > 0) {
        const ids = notifications.map((n: any) => n.id);
        await fetch('/api/notifications', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notificationIds: ids }),
        });
      }
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const deleteMessage = async (messageId: string) => {
    try {
      const res = await fetch(`/api/conversations/messages/${messageId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
        await fetchConversations();
      }
    } catch (error) {
      console.error('Failed to delete message:', error);
    }
  };

  const deleteConversation = async () => {
    if (!activeConversation) return;
    if (!confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) return;

    try {
      const res = await fetch(`/api/conversations/${activeConversation}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setConversations(prev => prev.filter(c => c.id !== activeConversation));
        setActiveConversation(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  };

  const sendMessage = async () => {
    if (!activeConversation || !newMessage.trim()) return;
    setSending(true);

    try {
      const res = await fetch(`/api/conversations/${activeConversation}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newMessage.trim() }),
      });

      if (res.ok) {
        setNewMessage('');
        await fetchMessages(activeConversation);
        await fetchConversations();
      } else {
        let errBody: any = null;
        try {
          errBody = await res.json();
        } catch {
          // ignore
        }
        console.error('Send message failed', {
          status: res.status,
          statusText: res.statusText,
          body: errBody,
        });
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  const searchUsers = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.users || []);
      }
    } catch (error) {
      console.error('Failed to search users:', error);
    } finally {
      setSearching(false);
    }
  };

  const startNewConversation = async (userId: string) => {
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId: userId }),
      });

      if (res.ok) {
        const data = await res.json();
        setActiveConversation(data.conversationId);
        await fetchConversations();
        await fetchMessages(data.conversationId);
        setNewConversationOpen(false);
        setSearchQuery('');
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Failed to start conversation:', error);
    }
  };

  const getOtherParticipant = (conv: Conversation) =>
    conv.participants?.find(p => p.id !== currentUser?.id);

  const activeConversationData = conversations.find(c => c.id === activeConversation);
  const otherUser = activeConversationData ? getOtherParticipant(activeConversationData) : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4" />
          <p className="text-gray-400">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <MessageCircle className="w-8 h-8 text-purple-500" />
            Messages
          </h1>
          <Button onClick={() => setNewConversationOpen(true)} className="bg-purple-600 hover:bg-purple-700">
            <Plus className="w-4 h-4 mr-2" />
            New Message
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
          <Card className="bg-slate-800 border-slate-700 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-700">
              <h2 className="text-lg font-semibold text-white mb-3">Conversations</h2>
              {conversations.length === 0 && (
                <p className="text-gray-400 text-sm text-center py-8">
                  No conversations yet. Start a new one!
                </p>
              )}
            </div>

            <div className="overflow-y-auto flex-1">
              {conversations.map((conv) => {
  const other = getOtherParticipant(conv);
  const isActive = activeConversation === conv.id;

  return (
    <div
      key={conv.id}
      onClick={async () => {
        setActiveConversation(conv.id);
        await fetchMessages(conv.id);
      }}
      className={`p-4 border-b border-slate-700 cursor-pointer transition-colors ${
        isActive
          ? 'bg-purple-600/20 border-l-4 border-l-purple-500'
          : ''
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <Avatar className="w-12 h-12">
            <AvatarImage src={other?.avatar_url ?? undefined} />
            <AvatarFallback className="bg-gradient-to-br from-purple-400 to-pink-400 text-white font-semibold">
              {other?.username?.[0]?.toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
        </div>

        <div className="flex-1 min-w-0">
          <p className="truncate text-white font-semibold">
            {other?.username || other?.email || 'Unknown User'}
          </p>
          <p className={`text-sm truncate ${conv.unread_count && conv.unread_count > 0 ? 'text-gray-200 font-medium' : 'text-gray-400'}`}>
            {conv.last_message?.content || 'No messages yet'}
          </p>
        </div>

        {conv.unread_count ? (
          <div className="w-3 h-3 bg-purple-500 rounded-full flex-shrink-0 animate-pulse" />
        ) : null}
      </div>
    </div>
  );
})}

            </div>
          </Card>

          {/* Active Chat */}
          <Card className="md:col-span-2 bg-slate-800 border-slate-700 flex flex-col overflow-hidden">
            {activeConversation && otherUser ? (
              <>
                <div className="p-4 border-b border-slate-700 bg-slate-900/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={otherUser.avatar_url ?? undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-purple-400 to-pink-400 text-white font-semibold">
                        {otherUser.username?.[0]?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <h2 className="text-lg font-semibold text-white">
                      {otherUser.username || otherUser.email}
                    </h2>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={deleteConversation}
                    className="text-gray-400 hover:text-red-400 hover:bg-slate-800"
                    title="Delete Conversation"
                  >
                    <Trash2 className="w-5 h-5" />
                  </Button>
                </div>

                <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-400">
                      <p>No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    messages.map((msg, index) => {
                      const isMe = msg.sender_id === currentUser?.id;
                      const messageSender = msg.sender || activeConversationData?.participants?.find(p => p.id === msg.sender_id);
                      
                      const isRecommendation =
                        msg.message_type === 'movie_recommendation' ||
                        msg.message_type === 'show_recommendation';

                      return (
                        <div key={`${msg.id}-${index}`} className={`flex items-start gap-2 ${isMe ? 'justify-end' : 'justify-start'} group`}>
                          
                          {!isMe && (
                            <Avatar className="h-8 w-8 mt-1">
                              <AvatarImage src={messageSender?.avatar_url ?? undefined} />
                              <AvatarFallback className="bg-gradient-to-br from-purple-400 to-pink-400 text-white text-xs">
                                {messageSender?.username?.[0]?.toUpperCase() || '?'}
                              </AvatarFallback>
                            </Avatar>
                          )}

                          {isMe && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <MoreVertical className="h-4 w-4 text-gray-400" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                                <DropdownMenuItem
                                  onClick={() => deleteMessage(msg.id)}
                                  className="text-red-400 focus:text-red-400 cursor-pointer focus:bg-slate-700"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}

                          <div className={`max-w-[70%]`}>
                            {isRecommendation && msg.metadata ? (
                              <Link
                                href={
                                  msg.message_type === 'movie_recommendation'
                                    ? `/movies/${(msg.metadata as any).movie_id}`
                                    : `/shows/${(msg.metadata as any).show_id}`
                                }
                                className="block"
                              >
                                <div
                                  className={`rounded-xl overflow-hidden border-2 ${
                                    isMe ? 'border-purple-500 bg-purple-900/30' : 'border-slate-600 bg-slate-800'
                                  } hover:opacity-80 transition-opacity`}
                                >
                                  <div className="flex gap-3 p-3">
                                    {(msg.metadata as any)?.poster_path && (
                                      <div className="relative w-16 h-24 flex-shrink-0 rounded overflow-hidden">
                                        <Image
                                          src={`https://image.tmdb.org/t/p/w200${(msg.metadata as any).poster_path}`}
                                          alt={(msg.metadata as any).title || 'Poster'}
                                          fill
                                          sizes="64px"
                                          className="object-cover"
                                        />
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-start gap-2 mb-1">
                                        {msg.message_type === 'movie_recommendation' ? (
                                          <Film className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                                        ) : (
                                          <Tv className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                                        )}
                                        <p className="font-semibold text-white text-sm line-clamp-2">
                                          {(msg.metadata as any).title}
                                        </p>
                                      </div>
                                      {(msg.metadata as any)?.rating && (
                                        <p className="text-xs text-yellow-400">
                                          ★ {(msg.metadata as any).rating.toFixed(1)}
                                        </p>
                                      )}
                                      {(msg.metadata as any)?.year && (
                                        <p className="text-xs text-gray-400">{(msg.metadata as any).year}</p>
                                      )}
                                      {msg.content && (
                                        <p className="text-xs text-gray-300 mt-2 italic">"{msg.content}"</p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </Link>
                            ) : (
                              <div className={`rounded-2xl px-4 py-2 ${isMe ? 'bg-purple-600 text-white' : 'bg-slate-700 text-gray-100'}`}>
                                <p className="break-words">{msg.content}</p>
                              </div>
                            )}

                            <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                              <p className="text-xs text-gray-500">
                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                              {isMe && (
                                msg.is_read ? <CheckCheck className="w-3 h-3 text-blue-400" /> : <Check className="w-3 h-3 text-gray-500" />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="p-4 border-t border-slate-700 bg-slate-900/50">
                  <div className="flex gap-2">
                    <Textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      placeholder="Type a message..."
                      className="bg-slate-800 border-slate-600 text-white resize-none"
                      rows={1}
                    />
                    <Button onClick={sendMessage} disabled={!newMessage.trim() || sending} className="bg-purple-600 hover:bg-purple-700">
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center">
                  <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">Select a conversation to start chatting</p>
                  <p className="text-sm mt-2">or create a new one</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      <Dialog open={newConversationOpen} onOpenChange={setNewConversationOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Start New Conversation</DialogTitle>
            <DialogDescription className="text-gray-400">
              Search for a user and start chatting.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') searchUsers();
                }}
                placeholder="Search users by username..."
                className="bg-slate-900 border-slate-600 text-white"
              />
              <Button onClick={searchUsers} disabled={searching} className="bg-purple-600 hover:bg-purple-700">
                <Search className="w-4 h-4" />
              </Button>
            </div>

            <div className="max-h-64 overflow-y-auto space-y-2">
              {searching ? (
                <div className="text-center py-8 text-gray-400">Searching...</div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  {searchQuery ? 'No users found' : 'Search for a user to start chatting'}
                </div>
              ) : (
                searchResults.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => startNewConversation(user.id)}
                    className="p-3 rounded-lg bg-slate-700 hover:bg-slate-600 cursor-pointer transition-colors flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-semibold">
                      {user.username?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <p className="font-medium">{user.username}</p>
                      <p className="text-sm text-gray-400">{user.email}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Loading...</div>}>
      <MessagesContent />
    </Suspense>
  );
}
