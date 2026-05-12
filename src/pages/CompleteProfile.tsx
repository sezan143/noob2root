import { useEffect, useState, useRef } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, Upload, Sparkles, ArrowRight, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import SEO from "@/components/SEO";

export default function CompleteProfile() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get("redirect") || "/courses";

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [mobile, setMobile] = useState("");
  const [dob, setDob] = useState<Date | undefined>(undefined);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name ?? "");
      setLastName(profile.last_name ?? "");
      setUsername(profile.username ?? "");
      setBio(profile.bio ?? "");
      setMobile(profile.mobile_number ?? "");
      setDob(profile.date_of_birth ? new Date(profile.date_of_birth) : undefined);
      setAvatarUrl(profile.avatar_url ?? null);
    }
  }, [profile]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login?redirect=/complete-profile" replace />;
  if (profile?.profile_completed) return <Navigate to={redirect} replace />;

  const initials =
    `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase() ||
    user.email?.[0]?.toUpperCase() ||
    "U";

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      toast.error("Image must be under 4MB.");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop() || "png";
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, {
      cacheControl: "3600",
      upsert: true,
    });
    if (error) {
      toast.error(error.message);
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    setAvatarUrl(data.publicUrl);
    setUploading(false);
    toast.success("Photo uploaded");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fn = firstName.trim();
    const ln = lastName.trim();
    if (!fn || !ln) {
      toast.error("Please enter your first and last name.");
      return;
    }
    const mob = mobile.trim();
    if (!mob || !/^\+?[0-9\s\-()]{7,20}$/.test(mob)) {
      toast.error("Please enter a valid mobile number.");
      return;
    }
    if (username && !/^[a-zA-Z0-9_]{3,20}$/.test(username.trim())) {
      toast.error("Username must be 3–20 letters, numbers, or underscores.");
      return;
    }
    setSaving(true);
    const display = `${fn} ${ln}`.trim();
    const { error } = await supabase
      .from("profiles")
      .upsert(
        {
          user_id: user.id,
          first_name: fn,
          last_name: ln,
          username: username.trim() || null,
          bio: bio.trim() || null,
          mobile_number: mob,
          date_of_birth: dob ? format(dob, "yyyy-MM-dd") : null,
          display_name: display,
          avatar_url: avatarUrl,
          profile_completed: true,
        },
        { onConflict: "user_id" }
      );
    setSaving(false);
    if (error) {
      if (error.message.toLowerCase().includes("unique") || error.code === "23505") {
        toast.error("That username is already taken.");
      } else {
        toast.error(error.message);
      }
      return;
    }
    await refreshProfile();
    toast.success("Welcome aboard! 🎉");
    navigate(redirect, { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <SEO title="Complete your profile — Noob to Root" description="Finish setting up your account to start learning." />
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10 pointer-events-none" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl relative z-10"
      >
        <Card className="glass-card border-border/50">
          <CardHeader className="text-center space-y-2">
            <div className="inline-flex items-center justify-center gap-1.5 self-center px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-xs font-medium text-primary">
              <Sparkles className="w-3.5 h-3.5" /> One more step
            </div>
            <CardTitle className="text-2xl font-heading">Complete your profile</CardTitle>
            <CardDescription>
              Tell us a bit about yourself so we can personalize your learning.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Avatar */}
              <div className="flex items-center gap-4">
                <Avatar className="w-20 h-20 ring-2 ring-primary/40">
                  {avatarUrl && <AvatarImage src={avatarUrl} alt="avatar" />}
                  <AvatarFallback className="bg-gradient-to-br from-primary/30 to-secondary/30 text-xl font-heading font-bold">
                    {initials || <UserIcon className="w-6 h-6" />}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <Label className="text-sm">Profile picture</Label>
                  <p className="text-xs text-muted-foreground mb-2">Optional · PNG/JPG up to 4MB</p>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFile}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 mr-1.5" />
                    )}
                    {avatarUrl ? "Change photo" : "Upload photo"}
                  </Button>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fn">
                    First name <span className="text-destructive inline-block animate-required-pulse origin-center ml-0.5">*</span>
                  </Label>
                  <Input
                    id="fn"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    maxLength={50}
                    placeholder="Ada"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ln">
                    Last name <span className="text-destructive inline-block animate-required-pulse origin-center ml-0.5">*</span>
                  </Label>
                  <Input
                    id="ln"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    maxLength={50}
                    placeholder="Lovelace"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="un">Username <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input
                  id="un"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  maxLength={20}
                  placeholder="ada_root"
                />
                <p className="text-xs text-muted-foreground">3–20 chars. Letters, numbers, underscore.</p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mob">
                    Mobile number <span className="text-destructive inline-block animate-required-pulse origin-center ml-0.5">*</span>
                  </Label>
                  <Input
                    id="mob"
                    type="tel"
                    required
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    maxLength={20}
                    placeholder="+1 555 123 4567"
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    Date of birth <span className="text-muted-foreground text-xs">(optional)</span>
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !dob && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 opacity-60" />
                        {dob ? format(dob, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dob}
                        onSelect={setDob}
                        captionLayout="dropdown-buttons"
                        fromYear={1925}
                        toYear={new Date().getFullYear()}
                        disabled={(d) => d > new Date() || d < new Date("1925-01-01")}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Short intro <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={280}
                  rows={3}
                  placeholder="Aspiring ethical hacker learning Linux from scratch."
                />
                <p className="text-xs text-muted-foreground text-right">{bio.length}/280</p>
              </div>

              <Button type="submit" disabled={saving} className="w-full font-semibold h-11 text-base">
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4 mr-2" />
                )}
                Activate my account
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                You can update these details anytime from your profile.
              </p>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
