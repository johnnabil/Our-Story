import { Countdowns } from "@/components/sections/Countdowns";
import { Dreams } from "@/components/sections/Dreams";
import { Gallery } from "@/components/sections/Gallery";
import { Hero } from "@/components/sections/Hero";
import { Letter } from "@/components/sections/Letter";
import { Profiles } from "@/components/sections/Profiles";
import { Story } from "@/components/sections/Story";
import { EditBar } from "@/components/ui/EditBar";
import { Nav } from "@/components/ui/Nav";
import { ScrollPositionManager } from "@/components/ui/ScrollPositionManager";

export default function HomePage() {
  return (
    <>
      <ScrollPositionManager />
      <Nav />
      <main className="archive-grain bg-cream pb-28 text-text md:pb-20">
        <Hero />
        <Letter />
        <Story />
        <Gallery />
        <Countdowns />
        <Dreams />
        <Profiles />
      </main>
      <EditBar />
    </>
  );
}
