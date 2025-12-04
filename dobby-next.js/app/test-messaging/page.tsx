'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Conversation } from '@/lib/types/Conversation';
import { Message } from '@/lib/types/Message';
import { Notification } from '@/lib/types/Notification';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';

export default function TestMessagingPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [recipientId, setRecipientId] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const supabase = createClient();

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };

    fetchConversations();
    fetchNotifications();
    getCurrentUser();

    // Realtime subscription for notifications
    const channel = supabase
      .channel('realtime-updates')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          console.log('New notification:', payload);
          fetchNotifications(); // Refresh notifications
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          console.log('New message:', payload);
          // If the message belongs to the active conversation, refresh messages
          // We can't easily check conversation_id from payload if we don't have it in context, 
          // but payload.new should have conversation_id
          if (activeConversation && (payload.new as Message).conversation_id === activeConversation) {
             fetchMessages(activeConversation);
          }
          fetchConversations(); // Refresh conversation list (for last message update)
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversation]);

  const fetchConversations = async () => {
    const res = await fetch('/api/conversations');
    if (res.ok) {
      const data = await res.json();
      setConversations(data);
    }
  };

  const fetchNotifications = async () => {
    const res = await fetch('/api/notifications');
    if (res.ok) {
      const data = await res.json();
      setNotifications(data);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    const res = await fetch(`/api/conversations/${conversationId}/messages`);
    if (res.ok) {
      const data = await res.json();
      setMessages(data);
    }
  };

  const startConversation = async () => {
    if (!recipientId) return;
    setLoading(true);
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId }),
      });
      if (res.ok) {
        const data = await res.json();
        setActiveConversation(data.conversationId);
        fetchConversations();
        fetchMessages(data.conversationId);
        setRecipientId('');
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!activeConversation || !newMessage.trim()) return;
    try {
      const res = await fetch(`/api/conversations/${activeConversation}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newMessage }),
      });
      if (res.ok) {
        setNewMessage('');
        fetchMessages(activeConversation);
        fetchConversations();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const markNotificationsRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;

    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationIds: unreadIds }),
    });
    fetchNotifications();
  };

  return (
    <div className="container mx-auto p-4 space-y-8">
      <h1 className="text-3xl font-bold">Messaging & Notifications Test</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Conversations & New Chat */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Start New Conversation</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Input 
                placeholder="Recipient User ID (UUID)" 
                value={recipientId}
                onChange={(e) => setRecipientId(e.target.value)}
              />
              <Button onClick={startConversation} disabled={loading}>
                {loading ? '...' : 'Start'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Your Conversations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {conversations.map((conv) => (
                <div 
                  key={conv.id} 
                  className={`p-3 border rounded cursor-pointer hover:bg-accent ${activeConversation === conv.id ? 'bg-accent' : ''}`}
                  onClick={() => {
                    setActiveConversation(conv.id);
                    fetchMessages(conv.id);
                  }}
                >
                  <div className="font-semibold">
                    {conv.participants?.map(p => p.username || p.email).join(', ') || 'Unknown'}
                  </div>
                  <div className="text-sm text-muted-foreground truncate">
                    {conv.last_message?.content || 'No messages yet'}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Middle Column: Active Chat */}
        <div className="md:col-span-2">
          <Card className="h-[600px] flex flex-col">
            <CardHeader>
              <CardTitle>
                {activeConversation ? 'Chat' : 'Select a conversation'}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden">
              {activeConversation ? (
                <>
                  <div className="flex-1 overflow-y-auto space-y-4 p-2 border rounded">
                    {messages.map((msg) => {
                      const isMe = msg.sender_id === currentUser?.id;
                      return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[70%] p-3 rounded-lg ${isMe ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                            <p>{msg.content}</p>
                            <span className="text-xs opacity-70">
                              {new Date(msg.created_at).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-2">
                    <Textarea 
                      placeholder="Type a message..." 
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                    />
                    <Button onClick={sendMessage}>Send</Button>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Select a conversation to start chatting
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Notifications Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Notifications</CardTitle>
          <Button variant="outline" size="sm" onClick={markNotificationsRead}>
            Mark all read
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {notifications.map((notif) => (
              <div key={notif.id} className={`p-4 border rounded flex items-start gap-3 ${notif.is_read ? 'opacity-60' : 'bg-accent/10 border-accent'}`}>
                <div className="flex-1">
                  <div className="font-semibold capitalize">{notif.type}</div>
                  <p className="text-sm">{notif.content}</p>
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(notif.created_at).toLocaleString()}
                  </div>
                </div>
                {!notif.is_read && <div className="w-2 h-2 rounded-full bg-primary mt-2" />}
              </div>
            ))}
            {notifications.length === 0 && (
              <div className="text-muted-foreground col-span-full text-center py-8">
                No notifications
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
