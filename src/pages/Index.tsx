import TopNav from "@/components/TopNav";
import HeroSection from "@/components/HeroSection";
import CategoryTabs from "@/components/CategoryTabs";
import CatalogSection from "@/components/CatalogSection";
import LogisticsSection from "@/components/LogisticsSection";
import BottomNav from "@/components/BottomNav";

const Index = () => {
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <TopNav />
      <HeroSection />
      <CategoryTabs />
      <CatalogSection />
      <LogisticsSection />
      <BottomNav />
    </div>
  );
};

export default Index;
