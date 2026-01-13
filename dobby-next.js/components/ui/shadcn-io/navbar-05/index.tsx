'use client';

import * as React from 'react';
import { useEffect, useState, useRef } from 'react';
import { BellIcon, HelpCircleIcon, UserIcon, ChevronDownIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from '@/components/ui/navigation-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ComponentProps } from 'react';

import Link from "next/link";

// Simple logo component for the navbar
const Logo = (props: React.SVGAttributes<SVGElement>) => {
  return (
    <svg width='1em' height='1em' viewBox='0 0 324 323' fill='currentColor' xmlns='http://www.w3.org/2000/svg' {...props}>
      <rect
        x='88.1023'
        y='144.792'
        width='151.802'
        height='36.5788'
        rx='18.2894'
        transform='rotate(-38.5799 88.1023 144.792)'
        fill='currentColor'
      />
      <rect
        x='85.3459'
        y='244.537'
        width='151.802'
        height='36.5788'
        rx='18.2894'
        transform='rotate(-38.5799 85.3459 244.537)'
        fill='currentColor'
      />
    </svg>
  );
};

// Hamburger icon component
const HamburgerIcon = ({ className, ...props }: React.SVGAttributes<SVGElement>) => (
  <svg
    className={cn('pointer-events-none', className)}
    width={16}
    height={16}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M4 12L20 12"
      className="origin-center -translate-y-[7px] transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.1)] group-aria-expanded:translate-x-0 group-aria-expanded:translate-y-0 group-aria-expanded:rotate-[315deg]"
    />
    <path
      d="M4 12H20"
      className="origin-center transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.8)] group-aria-expanded:rotate-45"
    />
    <path
      d="M4 12H20"
      className="origin-center translate-y-[7px] transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.1)] group-aria-expanded:translate-y-0 group-aria-expanded:rotate-[135deg]"
    />
  </svg>
);

// Info Menu Component
const InfoMenu = ({ onItemClick }: { onItemClick?: (item: string) => void }) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" size="icon" className="h-9 w-9">
        <HelpCircleIcon className="h-4 w-4" />
        <span className="sr-only">Help and Information</span>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-56">
      <DropdownMenuLabel>Help & Support</DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={() => onItemClick?.('help')}>
        Help Center
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => onItemClick?.('documentation')}>
        Documentation
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => onItemClick?.('contact')}>
        Contact Support
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => onItemClick?.('feedback')}>
        Send Feedback
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);

interface Notification {
  id: string;
  is_read: boolean;
  resource_id: string;
  actor: {
    id: string;
    username: string;
    avatar_url: string;
    first_name: string;
    last_name: string;
  };
  type: 'follow' | 'message' | 'like' | 'reply';
}

// Notification Menu Component
const NotificationMenu = ({ 
  notificationCount = 0, 
  onItemClick 
}: { 
  notificationCount?: number;
  onItemClick?: (item: string) => void;
}) => {
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [loading, setLoading] = React.useState(true);

  const fetchNotifications = React.useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          return;
        }
        const data = await res.json();
        setNotifications(Array.isArray(data) ? data.filter((n: Notification) => !n.is_read) : []);
      } else if (res.status === 401) {
        // User not authenticated, clear notifications
        setNotifications([]);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const res = await fetch(`/api/notifications/${notificationId}/read`, {
        method: "POST",
      });
      if (res.ok) {
        setNotifications(notifications.filter((n) => n.id !== notificationId));
      }
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const getNotificationLink = (notification: Notification) => {
    if (notification.type === 'message') {
      return `/messages?conversation=${notification.resource_id}`;
    }
    return `/users/${notification.actor.username}`;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 relative">
          <BellIcon className="h-4 w-4" />
          {notifications.length > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
              {notifications.length > 9 ? '9+' : notifications.length}
            </Badge>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {loading && (
          <div className="p-8 text-center text-muted-foreground">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        )}
        {!loading && notifications.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            <BellIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No new notifications</p>
          </div>
        )}
        {!loading && notifications.length > 0 && notifications.slice(0, 10).map((notification) => (
          <Link 
            key={notification.id} 
            href={getNotificationLink(notification)}
            onClick={() => handleMarkAsRead(notification.id)}
            className="block p-3 border-b last:border-0 hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-start gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={notification.actor.avatar_url} alt={notification.actor.username} />
                <AvatarFallback>{(notification.actor.first_name?.[0] || notification.actor.username[0]).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">@{notification.actor.username}</p>
                {(notification.actor.first_name || notification.actor.last_name) && (
                  <p className="text-xs text-muted-foreground truncate">
                    {notification.actor.first_name} {notification.actor.last_name}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {notification.type === 'follow' && 'started following you'}
                  {notification.type === 'message' && 'sent you a message'}
                  {notification.type === 'like' && 'liked your content'}
                  {notification.type === 'reply' && 'replied to you'}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// User Menu Component
const UserMenu = ({
  userName = 'John Doe',
  userEmail = 'john@example.com',
  userAvatar,
  onItemClick
}: {
  userName?: string;
  userEmail?: string;
  userAvatar?: string;
  onItemClick?: (item: string) => void;
}) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button className="h-9 px-2 py-0 focus:border-white bg-transparent hover:bg-purple-600/20 hover:backdrop-blur-md transition-colors rounded-md flex items-center cursor-pointer">
        <Avatar className="h-7 w-7">
          <AvatarImage src={userAvatar} alt={userName} />
          <AvatarFallback className="text-xs bg-purple-600 text-white">
            {userName.split(' ').map(n => n[0]).join('')}
          </AvatarFallback>
        </Avatar>
        <ChevronDownIcon className="h-3 w-3 ml-1" />
        <span className="sr-only">User menu</span>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="center" sideOffset={15} className="w-56 bg-background/80 backdrop-blur-xl border border-border shadow-lg rounded-xl focus:bg-background/80 font-semibold text-muted-foreground">
      <DropdownMenuLabel>
        <div className="flex flex-col space-y-1">
          <p className="text-lg text-white font-medium leading-none">{userName}</p>
          <p className="text-xs leading-none text-muted-foreground">
            {userEmail}
          </p>
        </div>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem asChild className="hover:!text-primary hover:!bg-transparent" onClick={() => onItemClick?.('profile')}>
        <Link href="/profile" className="hover:text-primary cursor-pointer">
          Profile
        </Link>
      </DropdownMenuItem>
      {/* <DropdownMenuItem className="hover:!text-primary hover:!bg-transparent" onClick={() => onItemClick?.('settings')}>
        Settings
      </DropdownMenuItem>
      <DropdownMenuItem className="hover:!text-primary hover:!bg-transparent" onClick={() => onItemClick?.('billing')}>
        Billing
      </DropdownMenuItem> */}
      <DropdownMenuSeparator /> 
      <DropdownMenuItem className="hover:!text-primary hover:!bg-transparent" onClick={async () => {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        await supabase.auth.signOut();
        window.location.href = '/auth/login';
      }}>
        Log out
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);

// Add this helper for the dropdown
function ForYouDropdown({ onNavItemClick }: { onNavItemClick?: (href: string) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="inline-flex items-center text-lg font-semibold text-muted-foreground px-4 py-2 rounded-md transition-colors hover:text-primary hover:bg-transparent cursor-pointer"
        >
          For You
          <ChevronDownIcon className="ml-1 h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" sideOffset={10} className="bg-background/80 backdrop-blur-xl border border-border shadow-lg rounded-xl text-large font-semibold text-muted-foreground focus:bg-background/80">
        <DropdownMenuItem asChild className="bg-background/80 backdrop-blur-xl shadow-lg rounded-xl text-large font-semibold text-muted-foreground hover:bg-black hover:backdrop-blur-xl focus:bg-background/80">
          <Link href="/movies/forYou">
            <button className="border:none w-full text-lg text-left px-6 py-4 rounded-md transition-colors hover:text-primary hover:bg-background/80 hover:backdrop-blur-xl cursor-pointer">
              Movies For You
            </button>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="bg-background/80 backdrop-blur-xl shadow-lg rounded-xl text-large font-semibold text-muted-foreground hover:bg-black hover:backdrop-blur-xl focus:bg-background/80 cursor-pointer">
          <Link href="/shows/forYou">
            <button className="border:none w-full text-lg text-left px-6 py-4 rounded-md transition-colors hover:text-primary hover:bg-background/80 hover:backdrop-blur-xl cursor-pointer">
              Shows For You
            </button>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Types
export interface Navbar05NavItem {
  href?: string;
  label: string;
}

export interface Navbar05Props extends React.HTMLAttributes<HTMLElement> {
  logo?: React.ReactNode;
  logoHref?: string;
  navigationLinks?: Navbar05NavItem[];
  userName?: string;
  userEmail?: string;
  userAvatar?: string;
  notificationCount?: number;
  onNavItemClick?: (href: string) => void;
  onInfoItemClick?: (item: string) => void;
  onNotificationItemClick?: (item: string) => void;
  onUserItemClick?: (item: string) => void;
}

// Default navigation links
const defaultNavigationLinks: Navbar05NavItem[] = [
  { href: '#', label: 'Home' },
  { href: '#', label: 'Features' },
  { href: '#', label: 'Pricing' },
  { href: '#', label: 'About' },
];

export const Navbar05 = React.forwardRef<HTMLElement, Navbar05Props>(
  (
    {
      className,
      logo = <Logo />,
      logoHref = '/',
      navigationLinks = defaultNavigationLinks,
      userName = 'John Doe',
      userEmail = 'john@example.com',
      userAvatar,
      notificationCount = 3,
      onNavItemClick,
      onInfoItemClick,
      onNotificationItemClick,
      onUserItemClick,
      ...props
    },
    ref
  ) => {
    const [isMobile, setIsMobile] = useState(false);
    const containerRef = useRef<HTMLElement>(null);

    useEffect(() => {
      const checkWidth = () => {
        if (containerRef.current) {
          const width = containerRef.current.offsetWidth;
          setIsMobile(width < 768); // 768px is md breakpoint
        }
      };

      checkWidth();

      const resizeObserver = new ResizeObserver(checkWidth);
      if (containerRef.current) {
        resizeObserver.observe(containerRef.current);
      }

      return () => {
        resizeObserver.disconnect();
      };
    }, []);

    // Combine refs
    const combinedRef = React.useCallback((node: HTMLElement | null) => {
      containerRef.current = node;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    }, [ref]);

    return (
      <header
        ref={combinedRef}
        className={cn(
          'sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 px-4 md:px-6 shadow-lg',
          className
        )}
        {...props}
      >
        <div className="container mx-auto flex h-16 max-w-screen-2xl items-center justify-between gap-8">
          {/* Left: Logo and Dobby */}
          <div className="flex items-center gap-3">
            <img
              src="/assets/3d-glasses.png"
              alt="Dobby logo"
              className="h-10 w-auto"
            />
            <a
              href={logoHref}
              className="relative text-2xl font-semibold tracking-tight bg-gradient-to-r from-red-500 via-purple-500 to-blue-500 bg-clip-text text-transparent"
              style={{
                    textShadow: "0 0 20px rgba(147, 51, 234, 0.4)",
                    WebkitTextStroke: "0.3px rgba(147, 51, 234, 0.2)",
              }}
            >
              Dobby
              <span className="font-semibold text-xl text-primary-600 hover:text-primary-700 transition-colors"></span>
            </a>
          </div>
          {/* Center: Navigation links */}
          <div className="flex-1 flex justify-center">
            {!isMobile && (
              <NavigationMenu className="flex">
                <NavigationMenuList className="gap-1">
                  {navigationLinks.map((link, index) => (
                    <NavigationMenuItem key={index}>
                      <NavigationMenuLink
                        href={link.href}
                        onClick={(e) => {
                          e.preventDefault();
                          if (onNavItemClick && link.href) onNavItemClick(link.href);
                        }}
                        className="text-lg font-semibold text-muted-foreground px-4 py-2 rounded-md transition-colors hover:text-primary hover:bg-transparent focus:bg-primary/50 focus:text-white focus:outline-none hover: cursor-pointer"
                      >
                        {link.label}
                      </NavigationMenuLink>
                    </NavigationMenuItem>
                  ))}
                  {/* Desktop: For You dropdown */}
                  <NavigationMenuItem>
                    <ForYouDropdown onNavItemClick={onNavItemClick} />
                  </NavigationMenuItem>
                </NavigationMenuList>
              </NavigationMenu>
            )}
          </div>
          {/* Right: User and notifications */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <NotificationMenu 
                notificationCount={notificationCount}
                onItemClick={onNotificationItemClick}
              />
            </div>
            <UserMenu 
              userName={userName}
              userEmail={userEmail}
              userAvatar={userAvatar}
              onItemClick={onUserItemClick}
            />
          </div>
        </div>
      </header>
    );
  }
);

Navbar05.displayName = 'Navbar05';

export { Logo, HamburgerIcon, InfoMenu, NotificationMenu, UserMenu };
