import TopNav from "@/components/TopNav";
import HeroSection from "@/components/HeroSection";
import FeaturedProducts from "@/components/FeaturedProducts";
import CategoryTabs from "@/components/CategoryTabs";
import CimedSection from "@/components/CimedSection";
import VideosSection from "@/components/VideosSection";
import CatalogSection from "@/components/CatalogSection";
import LogisticsSection from "@/components/LogisticsSection";
import Footer from "@/components/Footer";
import BottomNav from "@/components/BottomNav";

const Index = () => {
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <TopNav />
      <HeroSection />
      <VideosSection />
      <FeaturedProducts />
      <CategoryTabs />
      <CimedSection />
      <CatalogSection />
      <LogisticsSection />
      <Footer />
      <BottomNav />
    </div>
  );
};

export default Index;
