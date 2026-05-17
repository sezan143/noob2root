import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProfileCompletionGate from "./components/auth/ProfileCompletionGate.tsx";

// Eagerly load the landing page for fastest FCP, lazy-load the rest.
import Index from "./pages/Index.tsx";

const BlogIndex = lazy(() => import("./pages/BlogIndex.tsx"));
const BlogPost = lazy(() => import("./pages/BlogPost.tsx"));
const Categories = lazy(() => import("./pages/Categories.tsx"));
const About = lazy(() => import("./pages/About.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const AdminLogin = lazy(() => import("./pages/AdminLogin.tsx"));
const Login = lazy(() => import("./pages/Login.tsx"));
const Profile = lazy(() => import("./pages/Profile.tsx"));
const CompleteProfile = lazy(() => import("./pages/CompleteProfile.tsx"));
const AdminLayout = lazy(() => import("./components/admin/AdminLayout.tsx"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard.tsx"));
const AdminPosts = lazy(() => import("./pages/admin/AdminPosts.tsx"));
const PostEditor = lazy(() => import("./pages/admin/PostEditor.tsx"));
const AdminCategories = lazy(() => import("./pages/admin/AdminCategories.tsx"));
const AdminAuthors = lazy(() => import("./pages/admin/AdminAuthors.tsx"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings.tsx"));
const AdminSubscribers = lazy(() => import("./pages/admin/AdminSubscribers.tsx"));
const Courses = lazy(() => import("./pages/Courses.tsx"));
const CourseDetail = lazy(() => import("./pages/CourseDetail.tsx"));
const CourseLearn = lazy(() => import("./pages/CourseLearn.tsx"));
const AdminCourses = lazy(() => import("./pages/admin/AdminCourses.tsx"));
const CourseEditor = lazy(() => import("./pages/admin/CourseEditor.tsx"));
const AdminEnrollments = lazy(() => import("./pages/admin/AdminEnrollments.tsx"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers.tsx"));
const Referrals = lazy(() => import("./pages/Referrals.tsx"));
const RefRedirect = lazy(() => import("./pages/RefRedirect.tsx"));
const AdminReferrals = lazy(() => import("./pages/admin/AdminReferrals.tsx"));

const queryClient = new QueryClient();

const RouteFallback = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ProfileCompletionGate />
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/blog" element={<BlogIndex />} />
              <Route path="/blog/:slug" element={<BlogPost />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/about" element={<About />} />
              <Route path="/courses" element={<Courses />} />
              <Route path="/courses/:slug" element={<CourseDetail />} />
              <Route path="/courses/:slug/learn" element={<CourseLearn />} />
              <Route path="/login" element={<Login />} />
              <Route path="/complete-profile" element={<CompleteProfile />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/referrals" element={<Referrals />} />
              <Route path="/ref/:code" element={<RefRedirect />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="posts" element={<AdminPosts />} />
                <Route path="posts/:id" element={<PostEditor />} />
                <Route path="categories" element={<AdminCategories />} />
                <Route path="authors" element={<AdminAuthors />} />
                <Route path="settings" element={<AdminSettings />} />
                <Route path="subscribers" element={<AdminSubscribers />} />
                <Route path="courses" element={<AdminCourses />} />
                <Route path="courses/:id" element={<CourseEditor />} />
                <Route path="enrollments" element={<AdminEnrollments />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="referrals" element={<AdminReferrals />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
