import Hero from "@/components/sections/Hero";
import Footer from "@/components/ui/Footer";
import dynamic from "next/dynamic";

// Dynamically load heavy background animations
const StarsBackground = dynamic(() => import("@/components/ui/StarsBackground"), { ssr: false });
const LightBackgroundAnimation = dynamic(() => import("@/components/ui/LightBackgroundAnimation"), { ssr: false });

// Dynamically load below-the-fold sections
const Services = dynamic(() => import("@/components/sections/Services"));
const About = dynamic(() => import("@/components/sections/About"));
const Contact = dynamic(() => import("@/components/sections/Contact"));

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between bg-slate-50 dark:bg-background relative overflow-hidden">
      <StarsBackground />
      <LightBackgroundAnimation />
      <Hero />
      <Services />
      <About />
      <Contact />
      <Footer />
    </main>
  );
}
