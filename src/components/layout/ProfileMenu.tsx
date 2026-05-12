import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  User as UserIcon,
  Settings,
  LogOut,
  GraduationCap,
  Award,
  Gift,
  ShieldCheck,
  LogIn,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

export default function ProfileMenu() {
  const { user, profile, isAdmin, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (loading) {
    return (
      <div className="w-9 h-9 flex items-center justify-center text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <Button
        size="sm"
        onClick={() => navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`)}
        className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold rounded-lg"
      >
        <LogIn className="w-4 h-4 mr-1.5" /> Sign in
      </Button>
    );
  }

  const name = profile?.display_name || user.email?.split("@")[0] || "Account";
  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
    navigate("/");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="rounded-full ring-1 ring-border hover:ring-primary/50 transition-all focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label="Account menu"
        >
          <Avatar className="w-9 h-9">
            {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt={name} />}
            <AvatarFallback className="bg-gradient-to-br from-primary/30 to-secondary/30 text-foreground font-semibold text-xs">
              {initials || <UserIcon className="w-4 h-4" />}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="flex items-center gap-3 py-3">
          <Avatar className="w-10 h-10">
            {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt={name} />}
            <AvatarFallback className="bg-gradient-to-br from-primary/30 to-secondary/30 text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="font-medium truncate">{name}</div>
            <div className="text-xs text-muted-foreground truncate">{user.email}</div>
            {isAdmin && (
              <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
                <ShieldCheck className="w-3 h-3" /> Admin
              </span>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/profile" className="cursor-pointer">
            <UserIcon className="w-4 h-4 mr-2" /> My profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/profile?tab=courses" className="cursor-pointer">
            <GraduationCap className="w-4 h-4 mr-2" /> My courses
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/profile?tab=certificates" className="cursor-pointer">
            <Award className="w-4 h-4 mr-2" /> Certificates
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/referrals" className="cursor-pointer">
            <Gift className="w-4 h-4 mr-2" /> Refer & earn
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/profile?tab=settings" className="cursor-pointer">
            <Settings className="w-4 h-4 mr-2" /> Account settings
          </Link>
        </DropdownMenuItem>
        {isAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/admin" className="cursor-pointer text-primary">
                <ShieldCheck className="w-4 h-4 mr-2" /> Admin dashboard
              </Link>
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive focus:text-destructive">
          <LogOut className="w-4 h-4 mr-2" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}