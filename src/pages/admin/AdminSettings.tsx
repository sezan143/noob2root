import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { Loader2, Globe, Share2, Settings2, BarChart3, Save } from "lucide-react";

type SettingsMap = Record<string, string>;

const SOCIAL_FIELDS = [
  { key: "twitter_url", label: "Twitter / X", placeholder: "https://x.com/yourhandle" },
  { key: "github_url", label: "GitHub", placeholder: "https://github.com/yourorg" },
  { key: "linkedin_url", label: "LinkedIn", placeholder: "https://linkedin.com/company/yourcompany" },
  { key: "discord_url", label: "Discord", placeholder: "https://discord.gg/invite-code" },
  { key: "youtube_url", label: "YouTube", placeholder: "https://youtube.com/@yourchannel" },
];

const SITE_FIELDS = [
  { key: "site_name", label: "Site Name", placeholder: "Noob to Root" },
  { key: "site_tagline", label: "Tagline", placeholder: "From Noob to Root — Tech Tutorials & Hacking Guides" },
  { key: "contact_email", label: "Contact Email", placeholder: "hello@noobtoroot.com" },
];

export default function AdminSettings() {
  const [settings, setSettings] = useState<SettingsMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("site_settings").select("key, value");
      if (data) {
        const map: SettingsMap = {};
        data.forEach((r) => { map[r.key] = r.value ?? ""; });
        setSettings(map);
      }
      setLoading(false);
    };
    fetch();
  }, []);

  const update = (key: string, value: string) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  const toggleBool = (key: string) =>
    update(key, settings[key] === "true" ? "false" : "true");

  const handleSave = async () => {
    setSaving(true);
    try {
      const entries = Object.entries(settings);
      for (const [key, value] of entries) {
        await supabase
          .from("site_settings")
          .upsert({ key, value }, { onConflict: "key" });
      }
      toast({ title: "Settings saved", description: "Your changes have been applied." });
    } catch {
      toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-display">Settings</h1>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Changes
        </Button>
      </div>

      {/* General */}
      <Card className="glass-card border-border/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            <CardTitle>General</CardTitle>
          </div>
          <CardDescription>Core site identity and contact info</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {SITE_FIELDS.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <Label htmlFor={f.key}>{f.label}</Label>
              <Input id={f.key} value={settings[f.key] ?? ""} placeholder={f.placeholder} onChange={(e) => update(f.key, e.target.value)} />
            </div>
          ))}
          <div className="space-y-1.5">
            <Label htmlFor="site_description">Site Description</Label>
            <Textarea id="site_description" rows={3} value={settings.site_description ?? ""} placeholder="A short description of your site" onChange={(e) => update("site_description", e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Social Links */}
      <Card className="glass-card border-border/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-secondary" />
            <CardTitle>Social & Connections</CardTitle>
          </div>
          <CardDescription>Link your social media profiles. These appear in the site footer.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {SOCIAL_FIELDS.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <Label htmlFor={f.key}>{f.label}</Label>
              <Input id={f.key} value={settings[f.key] ?? ""} placeholder={f.placeholder} onChange={(e) => update(f.key, e.target.value)} />
            </div>
          ))}
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label>RSS Feed</Label>
              <p className="text-sm text-muted-foreground">Enable public RSS feed at /rss.xml</p>
            </div>
            <Switch checked={settings.rss_enabled === "true"} onCheckedChange={() => toggleBool("rss_enabled")} />
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      <Card className="glass-card border-border/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-accent" />
            <CardTitle>Content</CardTitle>
          </div>
          <CardDescription>Control how content is displayed</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="posts_per_page">Posts Per Page</Label>
            <Input id="posts_per_page" type="number" min={1} max={50} value={settings.posts_per_page ?? "12"} onChange={(e) => update("posts_per_page", e.target.value)} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label>Show Author Bio</Label>
              <p className="text-sm text-muted-foreground">Display author information on blog posts</p>
            </div>
            <Switch checked={settings.show_author_bio === "true"} onCheckedChange={() => toggleBool("show_author_bio")} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable Comments</Label>
              <p className="text-sm text-muted-foreground">Allow readers to leave comments (coming soon)</p>
            </div>
            <Switch checked={settings.enable_comments === "true"} onCheckedChange={() => toggleBool("enable_comments")} />
          </div>
        </CardContent>
      </Card>

      {/* Analytics */}
      <Card className="glass-card border-border/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-green-400" />
            <CardTitle>Analytics</CardTitle>
          </div>
          <CardDescription>Third-party tracking and analytics</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="analytics_id">Google Analytics ID</Label>
            <Input id="analytics_id" value={settings.analytics_id ?? ""} placeholder="G-XXXXXXXXXX" onChange={(e) => update("analytics_id", e.target.value)} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
