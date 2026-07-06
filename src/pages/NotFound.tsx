import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import SEO from "@/components/SEO";

const NotFound = () => (
  <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
    <SEO
      title="Page not found"
      description="The page you're looking for doesn't exist. Head back to Noob to Root's tutorials, courses, and guides."
      noindex
    />
    <div className="absolute top-1/3 left-1/3 w-72 h-72 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
    <div className="absolute bottom-1/3 right-1/3 w-72 h-72 bg-secondary/5 rounded-full blur-[100px] pointer-events-none" />
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center relative z-10"
    >
      <h1 className="text-8xl font-heading font-bold gradient-text mb-4">404</h1>
      <p className="text-xl text-foreground font-heading mb-2">Lost in the matrix</p>
      <p className="text-muted-foreground mb-8">The page you're looking for doesn't exist in this dimension.</p>
      <Link
        to="/"
        className="inline-flex px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity neon-glow"
      >
        Return Home
      </Link>
    </motion.div>
  </div>
);

export default NotFound;
