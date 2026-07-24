import Navbar from "@/components/Navbar";
import NewsEvents from "@/components/NewsEvents";
import Footer from "@/components/Footer";

export default function News() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <NewsEvents />
      <Footer />
    </div>
  );
}
