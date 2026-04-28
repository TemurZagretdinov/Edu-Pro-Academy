import { MapPin, Phone, Clock, Headphones } from "lucide-react";
import { Button } from "../../components/ui/Button";

export default function Contact() {
  return (
    <main className="overflow-hidden bg-white">
      {/* Hero Section with Gradient */}
      <div className="relative bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 pt-32 pb-16 text-white">
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative mx-auto max-w-6xl px-4 text-center md:px-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 backdrop-blur-sm">
            <Headphones size={16} />
            <span className="text-sm font-semibold">Bog'lanish</span>
          </div>
          <h1 className="mt-4 text-4xl font-black md:text-5xl lg:text-6xl">
            Kurs tanlash uchun
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-400">
              maslahat oling
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            Administrator sizga yo'nalish, guruh jadvali va to'lov shartlari haqida batafsil ma'lumot beradi.
          </p>
        </div>
        {/* Wave bottom */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 64L60 69.3C120 75 240 85 360 80C480 75 600 53 720 48C840 43 960 53 1080 64C1200 75 1320 85 1380 90.7L1440 96V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0V64Z" fill="white"/>
          </svg>
        </div>
      </div>

      {/* Contact Section */}
      <section className="mx-auto max-w-6xl px-4 py-20 md:px-8">
        <div className="grid gap-10 md:grid-cols-2">
          {/* Left: Contact Info Cards */}
          <div className="space-y-6">
            <div className="group rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-1">
              <div className="mb-4 inline-flex rounded-xl bg-blue-100 p-3 group-hover:scale-105 transition-transform">
                <Phone className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Telefon</h3>
              <p className="mt-2 text-gray-600">Ish vaqtida murojaat qiling</p>
              <a href="tel:+998901234567" className="mt-3 inline-block text-lg font-semibold text-blue-600 hover:underline">
                +998 90 123 45 67
              </a>
            </div>

            <div className="group rounded-2xl bg-gradient-to-br from-emerald-50 to-cyan-50 p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-1">
              <div className="mb-4 inline-flex rounded-xl bg-emerald-100 p-3 group-hover:scale-105 transition-transform">
                <MapPin className="h-6 w-6 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Manzil</h3>
              <p className="mt-2 text-gray-600">Toshkent shahri, Amir Temur ko'chasi 24</p>
              <button className="mt-3 text-sm font-semibold text-emerald-600 hover:underline">
                Xaritada ko'rish в†’
              </button>
            </div>

            <div className="group rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-1">
              <div className="mb-4 inline-flex rounded-xl bg-purple-100 p-3 group-hover:scale-105 transition-transform">
                <Clock className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Ish vaqti</h3>
              <p className="mt-2 text-gray-600">Dushanba вЂ“ Shanba: 09:00 вЂ“ 18:00</p>
              <p className="text-gray-500">Yakshanba: Dam olish kuni</p>
            </div>
          </div>

          {/* Right: Quick Contact Card */}
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-lg transition-all hover:shadow-xl">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-4 inline-flex rounded-full bg-coral/10 p-3">
                <Phone className="h-8 w-8 text-coral" />
              </div>
              <h2 className="text-2xl font-black text-gray-900">Tezkor aloqa</h2>
              <p className="mt-2 text-gray-600">Telefon orqali bog'lanib, sinov darsiga yoziling</p>
            </div>
            <a href="tel:+998901234567" className="block">
              <Button className="w-full bg-coral hover:bg-coral/90 text-white transition-all hover:scale-[1.02]">
                Qo'ng'iroq qilish
              </Button>
            </a>
            <p className="mt-4 text-center text-xs text-gray-400">
              Operatorlar 5 daqiqa ichida javob beradi
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
