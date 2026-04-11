import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index.tsx";
import BlogIndex from "./pages/BlogIndex.tsx";
import BlogPost from "./pages/BlogPost.tsx";
import Categories from "./pages/Categories.tsx";
import About from "./pages/About.tsx";
import NotFound from "./pages/NotFound.tsx";
import AdminLogin from "./pages/AdminLogin.tsx";
import AdminLayout from "./components/admin/AdminLayout.tsx";
import AdminDashboard from "./pages/admin/AdminDashboard.tsx";
import AdminPosts from "./pages/admin/AdminPosts.tsx";
import PostEditor from "./pages/admin/PostEditor.tsx";
import AdminCategories from "./pages/admin/AdminCategories.tsx";
import AdminAuthors from "./pages/admin/AdminAuthors.tsx";
import AdminSettings from "./pages/admin/AdminSettings.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/blog" element={<BlogIndex />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/about" element={<About />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="posts" element={<AdminPosts />} />
              <Route path="posts/:id" element={<PostEditor />} />
              <Route path="categories" element={<AdminCategories />} />
              <Route path="authors" element={<AdminAuthors />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
