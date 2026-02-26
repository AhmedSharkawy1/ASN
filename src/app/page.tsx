import Hero from "@/components/sections/Hero";
import Services from "@/components/sections/Services";
import About from "@/components/sections/About";
import Contact from "@/components/sections/Contact";
import StarsBackground from "@/components/ui/StarsBackground";
import LightBackgroundAnimation from "@/components/ui/LightBackgroundAnimation";
import Footer from "@/components/ui/Footer";

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
