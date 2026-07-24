import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function Events() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="max-w-[1440px] mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold">Events</h1>
      </main>
      <Footer />
    </div>
  );
}
