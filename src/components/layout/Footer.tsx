import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const SOCIAL_KEYS = [
  { key: "twitter_url", label: "Twitter / X" },
  { key: "github_url", label: "GitHub" },
  { key: "linkedin_url", label: "LinkedIn" },
  { key: "discord_url", label: "Discord" },
  { key: "youtube_url", label: "YouTube" },
];

const Footer = () => {
  const [socials, setSocials] = useState<Record<string, string>>({});
  const [siteName, setSiteName] = useState("Noob to Root");

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", [...SOCIAL_KEYS.map((s) => s.key), "site_name"]);
      if (data) {
        const map: Record<string, string> = {};
        data.forEach((r) => {
          if (r.key === "site_name" && r.value) setSiteName(r.value);
          else if (r.value) map[r.key] = r.value;
        });
        setSocials(map);
      }
    };
    fetch();
  }, []);

  const visibleSocials = SOCIAL_KEYS.filter((s) => socials[s.key]);

  return (
    <footer className="border-t border-border bg-card/30">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-1 mb-4">
              <span className="text-xl font-heading font-bold neon-text">{siteName.split(/(?=[A-Z])/)[0] || siteName}</span>
              <span className="text-xl font-heading font-bold text-foreground">{siteName.split(/(?=[A-Z])/).slice(1).join("") || ""}</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              In-depth tech insights, tutorials, and future-forward analysis for the modern developer.
            </p>
          </div>

          <div>
            <h4 className="font-heading font-semibold text-foreground mb-4">Navigate</h4>
            <div className="flex flex-col gap-2">
              {["Home", "Blog", "Categories", "About"].map((item) => (
                <Link key={item} to={item === "Home" ? "/" : `/${item.toLowerCase()}`} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  {item}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-heading font-semibold text-foreground mb-4">Categories</h4>
            <div className="flex flex-col gap-2">
              {["AI & ML", "Web Dev", "Cybersecurity", "Cloud & DevOps"].map((cat) => (
                <Link key={cat} to="/categories" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  {cat}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-heading font-semibold text-foreground mb-4">Connect</h4>
            <div className="flex flex-col gap-2">
              {visibleSocials.length > 0 ? (
                visibleSocials.map((s) => (
                  <a key={s.key} href={socials[s.key]} target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {s.label}
                  </a>
                ))
              ) : (
                ["Twitter / X", "GitHub", "LinkedIn"].map((social) => (
                  <span key={social} className="text-sm text-muted-foreground">{social}</span>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} {siteName}. All rights reserved.
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-xs text-muted-foreground hover:text-primary transition-colors">Privacy</a>
            <a href="#" className="text-xs text-muted-foreground hover:text-primary transition-colors">Terms</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
