import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Eye, ArrowLeft, Upload, ImageIcon, Megaphone } from "lucide-react";
import { RichTextEditor } from "@/components/editor/RichTextEditor";

interface CategoryOption { id: string; name: string; }
interface AuthorOption { id: string; name: string; }

export default function PostEditor() {
  const { id } = useParams();
  const isNew = id === "new";
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [authors, setAuthors] = useState<AuthorOption[]>([]);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [featuredImage, setFeaturedImage] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [authorId, setAuthorId] = useState("");
  const [tags, setTags] = useState("");
  const [readingTime, setReadingTime] = useState(5);
  const [isPublished, setIsPublished] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");

  // Ad/Promotion fields
  const [isSponsored, setIsSponsored] = useState(false);
  const [sponsorName, setSponsorName] = useState("");
  const [sponsorUrl, setSponsorUrl] = useState("");
  const [sponsorLogo, setSponsorLogo] = useState("");
  const [adBannerImage, setAdBannerImage] = useState("");
  const [adBannerUrl, setAdBannerUrl] = useState("");

  const generateSlug = (text: string) =>
    text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const handleImageUpload = async (file: File, onSuccess: (url: string) => void) => {
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("post-images").upload(path, file);
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } else {
      const { data } = supabase.storage.from("post-images").getPublicUrl(path);
      onSuccess(data.publicUrl);
      toast({ title: "Image uploaded!" });
    }
    setUploading(false);
  };

  useEffect(() => {
    const fetchOptions = async () => {
      const [cats, auths] = await Promise.all([
        supabase.from("categories").select("id, name"),
        supabase.from("authors").select("id, name"),
      ]);
      setCategories(cats.data ?? []);
      setAuthors(auths.data ?? []);
    };
    fetchOptions();

    if (!isNew && id) {
      supabase.from("posts").select("*").eq("id", id).single().then(({ data, error }) => {
        if (error || !data) {
          toast({ title: "Post not found", variant: "destructive" });
          navigate("/admin/posts");
          return;
        }
        setTitle(data.title);
        setSlug(data.slug);
        setExcerpt(data.excerpt ?? "");
        setContent(data.content ?? "");
        setFeaturedImage(data.featured_image ?? "");
        setCategoryId(data.category_id ?? "");
        setAuthorId(data.author_id ?? "");
        setTags((data.tags ?? []).join(", "));
        setReadingTime(data.reading_time ?? 5);
        setIsPublished(data.is_published ?? false);
        setIsFeatured(data.is_featured ?? false);
        setMetaTitle(data.meta_title ?? "");
        setMetaDescription(data.meta_description ?? "");
        setIsSponsored((data as any).is_sponsored ?? false);
        setSponsorName((data as any).sponsor_name ?? "");
        setSponsorUrl((data as any).sponsor_url ?? "");
        setSponsorLogo((data as any).sponsor_logo ?? "");
        setAdBannerImage((data as any).ad_banner_image ?? "");
        setAdBannerUrl((data as any).ad_banner_url ?? "");
        setLoading(false);
      });
    }
  }, [id]);

  const handleSave = async (publish?: boolean) => {
    if (!title.trim() || !slug.trim()) {
      toast({ title: "Title and slug are required", variant: "destructive" });
      return;
    }
    setSaving(true);

    const postData = {
      title: title.trim(),
      slug: slug.trim(),
      excerpt: excerpt.trim() || null,
      content: content || null,
      featured_image: featuredImage || null,
      category_id: categoryId || null,
      author_id: authorId || null,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      reading_time: readingTime,
      is_published: publish !== undefined ? publish : isPublished,
      is_featured: isFeatured,
      meta_title: metaTitle || null,
      meta_description: metaDescription || null,
      published_at: (publish || isPublished) ? new Date().toISOString() : null,
      is_sponsored: isSponsored,
      sponsor_name: sponsorName || null,
      sponsor_url: sponsorUrl || null,
      sponsor_logo: sponsorLogo || null,
      ad_banner_image: adBannerImage || null,
      ad_banner_url: adBannerUrl || null,
    };

    let error;
    if (isNew) {
      ({ error } = await supabase.from("posts").insert(postData));
    } else {
      ({ error } = await supabase.from("posts").update(postData).eq("id", id!));
    }

    if (error) {
      toast({ title: "Error saving post", description: error.message, variant: "destructive" });
    } else {
      if (publish !== undefined) setIsPublished(publish);
      toast({ title: publish ? "Post published!" : "Post saved!" });
      if (isNew) navigate("/admin/posts");
    }
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/posts")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold font-display">{isNew ? "New Post" : "Edit Post"}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleSave()} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />{saving ? "Saving..." : "Save Draft"}
          </Button>
          <Button onClick={() => handleSave(true)} disabled={saving}>
            <Eye className="mr-2 h-4 w-4" />{isPublished ? "Update" : "Publish"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="content">
        <TabsList>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="promotion">Promotion</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => { setTitle(e.target.value); if (isNew) setSlug(generateSlug(e.target.value)); }} placeholder="Post title" className="text-lg" />
          </div>
          <div className="space-y-2">
            <Label>Slug</Label>
            <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="post-url-slug" />
          </div>
          <div className="space-y-2">
            <Label>Excerpt</Label>
            <Textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} placeholder="Brief summary..." rows={3} />
          </div>
          <div className="space-y-2">
            <Label>Content (Markdown)</Label>
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write your post content in markdown..." rows={20} className="font-mono text-sm" />
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4 mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Featured Image Upload */}
            <div className="space-y-2 md:col-span-2">
              <Label>Featured Image</Label>
              <div className="flex gap-3 items-start">
                <div className="flex-1">
                  <Input value={featuredImage} onChange={(e) => setFeaturedImage(e.target.value)} placeholder="Image URL or upload below" />
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file, setFeaturedImage);
                  }}
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  Upload
                </Button>
              </div>
              {featuredImage && (
                <div className="mt-2 rounded-lg overflow-hidden border border-border">
                  <img src={featuredImage} alt="Featured" className="w-full max-h-48 object-cover" />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Author</Label>
              <Select value={authorId} onValueChange={setAuthorId}>
                <SelectTrigger><SelectValue placeholder="Select author" /></SelectTrigger>
                <SelectContent>
                  {authors.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tags (comma-separated)</Label>
              <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="react, typescript, ai" />
            </div>
            <div className="space-y-2">
              <Label>Reading Time (minutes)</Label>
              <Input type="number" value={readingTime} onChange={(e) => setReadingTime(Number(e.target.value))} min={1} />
            </div>
          </div>
          <Card className="glass-card border-border/50">
            <CardHeader><CardTitle className="text-base">Publishing</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Published</Label>
                <Switch checked={isPublished} onCheckedChange={setIsPublished} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Featured</Label>
                <Switch checked={isFeatured} onCheckedChange={setIsFeatured} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Promotion Tab */}
        <TabsContent value="promotion" className="space-y-4 mt-4">
          <Card className="glass-card border-border/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-primary" />
                <CardTitle>Sponsored Content</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Mark as Sponsored</Label>
                  <p className="text-sm text-muted-foreground">Displays a "Sponsored" badge on the post</p>
                </div>
                <Switch checked={isSponsored} onCheckedChange={setIsSponsored} />
              </div>
              {isSponsored && (
                <div className="grid gap-4 md:grid-cols-2 pt-2">
                  <div className="space-y-2">
                    <Label>Sponsor Name</Label>
                    <Input value={sponsorName} onChange={(e) => setSponsorName(e.target.value)} placeholder="Acme Corp" />
                  </div>
                  <div className="space-y-2">
                    <Label>Sponsor URL</Label>
                    <Input value={sponsorUrl} onChange={(e) => setSponsorUrl(e.target.value)} placeholder="https://sponsor.com" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Sponsor Logo URL</Label>
                    <div className="flex gap-3">
                      <Input value={sponsorLogo} onChange={(e) => setSponsorLogo(e.target.value)} placeholder="https://..." className="flex-1" />
                      <Button variant="outline" onClick={() => {
                        const input = document.createElement("input");
                        input.type = "file";
                        input.accept = "image/*";
                        input.onchange = (e: any) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(file, setSponsorLogo);
                        };
                        input.click();
                      }} disabled={uploading}>
                        <Upload className="h-4 w-4" />
                      </Button>
                    </div>
                    {sponsorLogo && <img src={sponsorLogo} alt="Sponsor" className="h-10 mt-1 object-contain" />}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="glass-card border-border/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-secondary" />
                <CardTitle>Ad Banner</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Optional banner ad displayed within the post</p>
              <div className="space-y-2">
                <Label>Banner Image URL</Label>
                <div className="flex gap-3">
                  <Input value={adBannerImage} onChange={(e) => setAdBannerImage(e.target.value)} placeholder="https://..." className="flex-1" />
                  <Button variant="outline" onClick={() => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = "image/*";
                    input.onchange = (e: any) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file, setAdBannerImage);
                    };
                    input.click();
                  }} disabled={uploading}>
                    <Upload className="h-4 w-4" />
                  </Button>
                </div>
                {adBannerImage && (
                  <div className="mt-2 rounded-lg overflow-hidden border border-border">
                    <img src={adBannerImage} alt="Ad banner preview" className="w-full max-h-32 object-cover" />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Banner Click URL</Label>
                <Input value={adBannerUrl} onChange={(e) => setAdBannerUrl(e.target.value)} placeholder="https://sponsor.com/promo" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seo" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Meta Title</Label>
            <Input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} placeholder="SEO title (defaults to post title)" />
            <p className="text-xs text-muted-foreground">{metaTitle.length}/60 characters</p>
          </div>
          <div className="space-y-2">
            <Label>Meta Description</Label>
            <Textarea value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} placeholder="SEO description..." rows={3} />
            <p className="text-xs text-muted-foreground">{metaDescription.length}/160 characters</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
