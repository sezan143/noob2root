import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Loader2, Search, type LucideIcon } from "lucide-react";
import * as LucideIcons from "lucide-react";

const ICON_CHOICES = [
  // Cybersecurity & hacking
  "Shield","ShieldCheck","ShieldAlert","ShieldX","ShieldOff","Lock","LockKeyhole","Unlock",
  "Key","KeyRound","KeySquare","Fingerprint","ScanFace","ShieldQuestion","UserLock",
  "Bug","BugOff","BugPlay","Skull","Ghost","Crosshair","Radar","Radiation","Biohazard",
  "EyeOff","Eye","Webhook","Spline",
  // Linux / terminal / dev
  "Terminal","TerminalSquare","SquareTerminal","Code","Code2","Codepen","FileCode","FileTerminal",
  "Command","Power","Cpu","CpuArchitecture","MemoryStick","HardDrive","Microchip","Binary","Hash",
  // Network & infra
  "Network","Wifi","WifiOff","Router","Cable","Ethernet","Globe","Globe2","Satellite","Antenna",
  "Server","ServerCog","ServerCrash","ServerOff","Database","DatabaseZap","Cloud","CloudCog","CloudOff",
  "Container","Boxes","Workflow","GitBranch","GitMerge","GitPullRequest","Github","Gitlab",
  // DevOps / tools
  "Settings","Settings2","Wrench","Hammer","Cog","Layers","Package","Box","FlaskConical",
  "Activity","BarChart","BarChart3","LineChart","PieChart","TrendingUp","Gauge","Zap","ZapOff",
  // General
  "Brain","BrainCircuit","Rocket","Flame","Sparkles","Star","Heart","BookOpen","GraduationCap",
  "Lightbulb","Folder","FolderLock","FileText","FileLock","Image","Camera","Search","SearchCheck",
  "Monitor","Smartphone","Headphones","Mic","Radio","Tv","Gamepad2",
  "Trophy","Award","Target","Flag","MapPin","Compass","Map","Building","Home","Briefcase",
  "Users","User","UserCheck","MessageCircle","Mail","Send","Bell","Calendar","Clock",
];

const getIcon = (name?: string | null): LucideIcon | null => {
  if (!name) return null;
  const Icon = (LucideIcons as unknown as Record<string, LucideIcon>)[name];
  return Icon ?? null;
};

interface CategoryRow { id: string; name: string; slug: string; description: string | null; icon: string | null; }

export default function AdminCategories() {
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryRow | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("");
  const { toast } = useToast();

  const fetchCategories = async () => {
    const { data } = await supabase.from("categories").select("*").order("name");
    setCategories(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchCategories(); }, []);

  const generateSlug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const openNew = () => { setEditing(null); setName(""); setSlug(""); setDescription(""); setIcon(""); setDialogOpen(true); };
  const openEdit = (c: CategoryRow) => { setEditing(c); setName(c.name); setSlug(c.slug); setDescription(c.description ?? ""); setIcon(c.icon ?? ""); setDialogOpen(true); };

  const handleSave = async () => {
    const data = { name, slug, description: description || null, icon: icon || null };
    let error;
    if (editing) {
      ({ error } = await supabase.from("categories").update(data).eq("id", editing.id));
    } else {
      ({ error } = await supabase.from("categories").insert(data));
    }
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else { toast({ title: editing ? "Category updated" : "Category created" }); setDialogOpen(false); fetchCategories(); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this category?")) return;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Category deleted" }); fetchCategories(); }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-display">Categories</h1>
        <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" />New Category</Button>
      </div>
      <div className="rounded-lg border border-border/50 overflow-hidden">
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Slug</TableHead><TableHead>Description</TableHead><TableHead className="w-24">Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {categories.length === 0
              ? <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-12">No categories yet.</TableCell></TableRow>
              : categories.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {(() => { const I = getIcon(c.icon); return I ? <I className="h-4 w-4 text-primary" /> : null; })()}
                      {c.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{c.slug}</TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-xs truncate">{c.description ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)} className="hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Category" : "New Category"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Name</Label><Input value={name} onChange={(e) => { setName(e.target.value); if (!editing) setSlug(generateSlug(e.target.value)); }} /></div>
            <div className="space-y-2"><Label>Slug</Label><Input value={slug} onChange={(e) => setSlug(e.target.value)} /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} /></div>
            <div className="space-y-2">
              <Label>Icon</Label>
              <IconPicker value={icon} onChange={setIcon} />
            </div>
            <Button onClick={handleSave} className="w-full">Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function IconPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const Selected = getIcon(value);
  const filtered = useMemo(
    () => ICON_CHOICES.filter((n) => n.toLowerCase().includes(query.toLowerCase())),
    [query]
  );
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" type="button" className="w-full justify-start gap-2 font-normal">
          {Selected ? <Selected className="h-4 w-4 text-primary" /> : <Search className="h-4 w-4 text-muted-foreground" />}
          <span className="text-sm">{value || "Choose an icon"}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="start">
        <Input
          autoFocus
          placeholder="Search icons..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="mb-3"
        />
        <div className="grid grid-cols-8 gap-1 max-h-64 overflow-y-auto">
          {filtered.map((name) => {
            const I = getIcon(name);
            if (!I) return null;
            const active = name === value;
            return (
              <button
                key={name}
                type="button"
                title={name}
                onClick={() => { onChange(name); setOpen(false); }}
                className={`flex items-center justify-center h-9 w-9 rounded-md border transition-colors ${active ? "border-primary bg-primary/10 text-primary" : "border-transparent hover:bg-muted text-muted-foreground hover:text-foreground"}`}
              >
                <I className="h-4 w-4" />
              </button>
            );
          })}
        </div>
        {value && (
          <Button variant="ghost" size="sm" className="w-full mt-2" onClick={() => { onChange(""); setOpen(false); }}>
            Clear
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}

