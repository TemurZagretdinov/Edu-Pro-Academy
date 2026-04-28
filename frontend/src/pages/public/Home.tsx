import { ArrowRight, BookOpen, Briefcase, CheckCircle2, Clock, MapPin, Phone, Star, Users, Award, Zap, Shield, TrendingUp, ChevronRight } from "lucide-react";
import { NavLink } from "react-router-dom";

import { Button } from "../../components/ui/Button";

const introCards = [
  { title: "Amaliy kurslar", text: "Har bir modul real loyiha, mentor tekshiruvi va yakuniy portfel bilan tugaydi.", icon: BookOpen, color: "from-blue-500 to-cyan-500" },
  { title: "Kichik guruhlar", text: "Mentor har bir o'quvchining natijasini ko'rib borishi uchun guruhlar ixcham.", icon: Users, color: "from-emerald-500 to-cyan-500" },
  { title: "CRM nazorati", text: "Davomat, to'lov va dars jadvali markazlashgan tizimda boshqariladi.", icon: Zap, color: "from-purple-500 to-pink-500" },
];

const features = [
  { icon: Clock, title: "10 oyda yangi kasb", text: "Bosqichma-bosqich o'quv reja va muntazam amaliy topshiriqlar.", color: "from-orange-500 to-red-500" },
  { icon: Users, title: "Tajribali mentorlar", text: "Darslar bozor talabini biladigan amaliyotchilar bilan o'tadi.", color: "from-blue-500 to-indigo-500" },
  { icon: Briefcase, title: "Portfolio yondashuvi", text: "Bitiruvchi suhbatga tayyor ishlar to'plamini shakllantiradi.", color: "from-emerald-500 to-cyan-500" },
  { icon: CheckCircle2, title: "Natija monitoringi", text: "Davomat, vazifa va to'lov holati admin panelda aniq ko'rinadi.", color: "from-purple-500 to-pink-500" },
];

const testimonials = [
  { name: "Madina", role: "Frontend bitiruvchisi", text: "Darslarda faqat teoriya emas, haqiqiy vazifalar ko'p bo'ldi. Portfolio bilan ish topish osonlashdi.", rating: 5 },
  { name: "Aziz", role: "Python o'quvchisi", text: "Mentorlar topshiriqlarni batafsil tekshiradi. Guruh kichik bo'lgani uchun savollarim ochiq qolmadi.", rating: 5 },
  { name: "Dilnoza", role: "SMM kursi", text: "Jadval, to'lov va davomad hammasi tartibli. O'qish jarayoni juda aniq boshqariladi.", rating: 5 },
];

export default function Home() {
  return (
    <main className="overflow-hidden">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 pt-28">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1920&q=80')] bg-cover bg-center opacity-10" />
        <div className="absolute top-0 -right-40 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute bottom-0 -left-40 h-96 w-96 rounded-full bg-purple-500/20 blur-3xl" />
        
        <div className="relative mx-auto max-w-7xl px-4 py-20 md:px-8 md:py-28">
          <div className="grid items-center gap-12 md:grid-cols-[1.05fr_0.95fr]">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 backdrop-blur-sm">
                <Award size={16} className="text-cyan-400" />
                <span className="text-sm font-semibold text-cyan-400">Zamonaviy kasblar akademiyasi</span>
              </div>
              <h1 className="text-4xl font-black leading-tight text-white md:text-5xl lg:text-6xl">
                10 oyda yangi kasb
                

              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-white/80">
                EduPro Academy sizga dasturlash, dizayn, marketing va ingliz tili bo'yicha tartibli o'quv yo'li,
                mentor yordami va shaffof boshqaruv tizimini beradi.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <NavLink to="/register">
                  <Button className="group w-full bg-gradient-to-r from-cyan-500 to-cyan-500 text-white shadow-lg transition-all hover:shadow-xl hover:scale-105 sm:w-auto">
                    Bepul konsultatsiya 
                    <ArrowRight className="ml-2 inline transition-transform group-hover:translate-x-1" size={18} />
                  </Button>
                </NavLink>
                <a href="tel:+998901234567">
                  <Button variant="ghost" className="w-full border border-white/30 bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20 sm:w-auto">
                    <Phone className="mr-2" size={18} /> 
                    +998 90 123 45 67
                  </Button>
                </a>
              </div>
              <div className="mt-12 grid max-w-xl grid-cols-3 gap-4">
                {[
                  { label: "Bitiruvchilar", value: "1200+", icon: Users },
                  { label: "Mentorlar", value: "18", icon: Award },
                  { label: "Yo'nalishlar", value: "9", icon: Briefcase },
                ].map((item) => (
                  <div key={item.label} className="group rounded-2xl border border-white/10 bg-white/5 p-4 text-center backdrop-blur-sm transition hover:bg-white/10">
                    <item.icon className="mx-auto mb-2 text-cyan-400" size={24} />
                    <p className="text-2xl font-bold text-white">{item.value}</p>
                    <p className="text-sm text-white/60">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-cyan-500 to-cyan-500 opacity-75 blur-xl" />
              <img
                className="relative rounded-2xl object-cover shadow-2xl w-full h-[400px] md:h-[520px]"
                src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80"
                alt="Students learning together"
              />
              <div className="absolute bottom-6 left-6 right-6 rounded-xl border border-white/20 bg-black/60 p-4 backdrop-blur-md">
                <p className="text-sm text-white/70">Bugungi dars</p>
                <p className="mt-1 font-bold text-white">React + TypeScript amaliyoti</p>
              </div>
            </div>
          </div>
        </div>
        {/* Wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 64L60 69.3C120 75 240 85 360 80C480 75 600 53 720 48C840 43 960 53 1080 64C1200 75 1320 85 1380 90.7L1440 96V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0V64Z" fill="white"/>
          </svg>
        </div>
      </section>

      {/* Academy Section */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="font-semibold text-coral">Academy</p>
              <h2 className="mt-2 text-3xl font-black text-gray-900 md:text-4xl">O'qish jarayoni aniq va nazoratli</h2>
            </div>
            <p className="max-w-xl text-gray-600">
              Markaz uchun kerakli asosiy jarayonlar: guruhlar, mentorlar, talabalar, davomad va to'lovlar bitta tizimda.
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {introCards.map((card) => {
              const Icon = card.icon;
              return (
                <article key={card.title} className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1">
                  <div className={`absolute -top-20 -right-20 h-40 w-40 rounded-full bg-gradient-to-br ${card.color} opacity-10 blur-2xl transition group-hover:opacity-20`} />
                  <div className={`inline-flex rounded-xl bg-gradient-to-br ${card.color} p-3 text-white shadow-md`}>
                    <Icon size={24} />
                  </div>
                  <h3 className="mt-5 text-xl font-bold text-gray-900">{card.title}</h3>
                  <p className="mt-3 text-gray-600 leading-relaxed">{card.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Why Us Section */}
      <section className="bg-gradient-to-br from-gray-50 to-gray-100 py-24">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="text-center">
            <p className="font-semibold text-cyan-600">Nega biz</p>
            <h2 className="mt-2 text-3xl font-black text-gray-900 md:text-4xl">O'qish uchun kuchli sabablar</h2>
            <p className="mx-auto mt-4 max-w-2xl text-gray-600">
              Bizning yondashuvimiz sizga tez va sifatli natijalarga erishishga yordam beradi
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <article key={feature.title} className="group rounded-2xl bg-white p-6 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1">
                  <div className={`inline-flex rounded-xl bg-gradient-to-br ${feature.color} p-3 text-white shadow-md`}>
                    <Icon size={24} />
                  </div>
                  <h3 className="mt-5 text-lg font-bold text-gray-900">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-gray-600">{feature.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="font-semibold text-coral">O'quvchilar fikri</p>
              <h2 className="mt-2 text-3xl font-black text-gray-900 md:text-4xl">Natija jarayonda ko'rinadi</h2>
              <div className="mt-6 flex items-center gap-2">
                <div className="flex gap-1 text-gold">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={20} fill="currentColor" className="text-yellow-400" />
                  ))}
                </div>
                <span className="text-gray-600">1500+ mamnun bitiruvchi</span>
              </div>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {testimonials.map((item) => (
                <article key={item.name} className="group rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1">
                  <div className="flex gap-1 text-yellow-400">
                    {Array.from({ length: item.rating }).map((_, index) => (
                      <Star key={index} size={16} fill="currentColor" />
                    ))}
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-gray-600">{item.text}</p>
                  <div className="mt-5 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-cyan-500 text-white font-bold">
                      {item.name[0]}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-500">{item.role}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-700 to-purple-800 py-20">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1920&q=80')] bg-cover bg-center opacity-10" />
        <div className="relative mx-auto max-w-7xl px-4 md:px-8">
          <div className="grid gap-10 md:grid-cols-[1fr_0.8fr]">
            <div>
              <p className="font-semibold text-cyan-300">Bog'lanish</p>
              <h2 className="mt-2 max-w-2xl text-3xl font-black text-white md:text-4xl">Qaysi kasb sizga mosligini birga aniqlaymiz</h2>
              <div className="mt-8 space-y-4 text-white/80">
                <a href="tel:+998901234567" className="flex items-center gap-3 transition hover:text-white">
                  <Phone className="text-cyan-400" size={20} /> 
                  +998 90 123 45 67
                </a>
                <p className="flex items-center gap-3">
                  <MapPin className="text-cyan-400" size={20} /> 
                  Toshkent shahri, Amir Temur ko'chasi 24
                </p>
              </div>
            </div>
            <div className="rounded-2xl bg-white p-6 shadow-2xl">
              <h3 className="text-2xl font-black text-gray-900">Bepul konsultatsiya</h3>
              <p className="mt-2 text-gray-600">Telefon qiling yoki admin panel orqali yangi talabani ro'yxatdan o'tkazing.</p>
              <div className="mt-6 flex flex-col gap-3">
                <a href="tel:+998901234567">
                  <Button className="w-full bg-gradient-to-r from-cyan-500 to-cyan-500 text-white transition hover:scale-105">
                    Telefon qilish
                  </Button>
                </a>
                <NavLink to="/register">
                  <Button variant="secondary" className="w-full border border-gray-200 bg-gray-50 text-gray-700 transition hover:bg-gray-100">
                    Ro'yxatdan o'tish
                  </Button>
                </NavLink>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
