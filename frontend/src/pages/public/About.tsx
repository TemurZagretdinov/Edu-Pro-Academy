import { Users, GraduationCap, CreditCard, CalendarCheck, Award, Target, Heart, Shield, Zap, BookOpen, TrendingUp, Globe } from "lucide-react";

export default function About() {
  const stats = [
    { label: "Faol talabalar", value: "2,500+", icon: Users },
    { label: "Malakali mentorlar", value: "45+", icon: GraduationCap },
    { label: "O'quv guruhlari", value: "120+", icon: BookOpen },
    { label: "To'lovlar", value: "98%", icon: TrendingUp, suffix: "muvaffaqiyatli" },
  ];

  const features = [
    {
      title: "Zamonaviy CRM",
      description: "Talabalar, mentorlar, to'lovlar va dars jarayonini yagona panelda boshqaring.",
      icon: Zap,
      color: "from-blue-500 to-cyan-500",
    },
    {
      title: "Davomat nazorati",
      description: "Har bir dars uchun talabalar davomatini real vaqtda kuzatib boring.",
      icon: CalendarCheck,
      color: "from-emerald-500 to-cyan-500",
    },
    {
      title: "Moliyaviy hisobot",
      description: "To'lovlar, qarzdorlik va oylik tushumlar haqida batafsil analitika.",
      icon: CreditCard,
      color: "from-purple-500 to-pink-500",
    },
    {
      title: "Ota-ona bilan bog'lanish",
      description: "Telegram bot orqali ota-onalarni jarayonga ulang va ularga bildirishnomalar yuboring.",
      icon: Heart,
      color: "from-orange-500 to-red-500",
    },
  ];

  const values = [
    {
      title: "Sifatli ta'lim",
      description: "Har bir talabaga individual yondashuv va yuqori sifatli bilim.",
      icon: Award,
    },
    {
      title: "Shaffoflik",
      description: "Barcha jarayonlar ochiq va tushunarli вЂ“ ota-onalar ham, talabalar ham.",
      icon: Shield,
    },
    {
      title: "Innovatsiya",
      description: "Eng yangi texnologiyalarni ta'lim jarayoniga joriy qilish.",
      icon: Globe,
    },
    {
      title: "Natijaga yo'naltirilganlik",
      description: "Har bir talabaning muvaffaqiyati вЂ“ bizning asosiy maqsadimiz.",
      icon: Target,
    },
  ];

  return (
    <main className="overflow-hidden bg-white">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 pt-32 pb-20 text-white">
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative mx-auto max-w-6xl px-4 text-center md:px-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 backdrop-blur-sm">
            <GraduationCap size={16} />
            <span className="text-sm font-semibold">EduPro Academy</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight md:text-6xl lg:text-7xl">
            O'quv jarayonini
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-400">
              biznes intizomi bilan boshqaring
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80 md:text-xl">
            Platforma kurs markazi uchun landing page va ichki CRMni birlashtiradi. 
            Talaba qaysi guruhda o'qiyotgani, mentorlar, oylik to'lovlar, darslar va 
            davomat admin panelda ko'rinadi.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <button className="rounded-xl bg-white px-6 py-3 font-bold text-blue-600 transition hover:bg-gray-100">
              Demo talab qilish
            </button>
            <button className="rounded-xl border border-white/30 bg-white/10 px-6 py-3 font-bold text-white backdrop-blur-sm transition hover:bg-white/20">
              Ko'proq ma'lumot
            </button>
          </div>
        </div>
        {/* Wave bottom */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 64L60 69.3C120 75 240 85 360 80C480 75 600 53 720 48C840 43 960 53 1080 64C1200 75 1320 85 1380 90.7L1440 96V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0V64Z" fill="white"/>
          </svg>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="relative -mt-12 px-4 md:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-6 rounded-2xl bg-white shadow-xl sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <div key={idx} className="flex items-center gap-4 rounded-xl p-6 transition hover:bg-gray-50">
                  <div className="rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 p-3">
                    <Icon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-black text-gray-900">{stat.value}</p>
                    <p className="text-sm text-gray-500">{stat.label}</p>
                    {stat.suffix && <p className="text-xs text-gray-400">{stat.suffix}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="mx-auto max-w-6xl px-4 py-20 md:px-8">
        <div className="grid gap-12 md:grid-cols-2">
          <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 p-8">
            <div className="mb-4 inline-flex rounded-xl bg-blue-100 p-3">
              <Target className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900">Missiyamiz</h3>
            <p className="mt-3 text-gray-600 leading-relaxed">
              Har bir talabaga sifatli va zamonaviy ta'lim olish imkoniyatini yaratish, 
              ularni kelajak kasblariga tayyorlash va hayot davomida o'rganish ko'nikmalarini shakllantirish.
            </p>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 p-8">
            <div className="mb-4 inline-flex rounded-xl bg-purple-100 p-3">
              <Globe className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900">Vizyonimiz</h3>
            <p className="mt-3 text-gray-600 leading-relaxed">
              O'zbekistonda raqamli ta'lim sohasida yetakchi platforma bo'lish va 
              o'quv jarayonlarini to'liq avtomatlashtirish orqali ta'lim sifatini yangi bosqichga olib chiqish.
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <div className="mb-12 text-center">
            <p className="font-semibold text-coral">Nega EduPro?</p>
            <h2 className="mt-2 text-3xl font-black text-gray-900 md:text-4xl">
              Platformaning asosiy imkoniyatlari
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-gray-600">
              Bizning CRM sizga o'quv markazini samarali boshqarish uchun barcha kerakli vositalarni taqdim etadi.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div
                  key={idx}
                  className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-md transition-all hover:shadow-xl hover:-translate-y-1"
                >
                  <div className={`absolute top-0 right-0 h-24 w-24 rounded-full bg-gradient-to-br ${feature.color} opacity-10 blur-2xl transition group-hover:opacity-20`} />
                  <div className={`inline-flex rounded-xl bg-gradient-to-br ${feature.color} p-3 text-white shadow-lg`}>
                    <Icon size={24} />
                  </div>
                  <h3 className="mt-5 text-xl font-bold text-gray-900">{feature.title}</h3>
                  <p className="mt-2 text-gray-500 leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="mx-auto max-w-6xl px-4 py-20 md:px-8">
        <div className="mb-12 text-center">
          <p className="font-semibold text-coral">Bizning qadriyatlarimiz</p>
          <h2 className="mt-2 text-3xl font-black text-gray-900 md:text-4xl">
            Biz nimaga ishonamiz?
          </h2>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {values.map((value, idx) => {
            const Icon = value.icon;
            return (
              <div key={idx} className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 text-gray-700">
                  <Icon size={28} />
                </div>
                <h4 className="text-lg font-bold text-gray-900">{value.title}</h4>
                <p className="mt-2 text-sm text-gray-500">{value.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-4 mb-20 rounded-3xl bg-gradient-to-r from-blue-600 to-purple-600 p-12 text-center text-white shadow-xl md:mx-8">
        <h2 className="text-3xl font-bold md:text-4xl">
          EduPro bilan o'quv markazingizni yangi bosqichga olib chiqing
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-white/80">
          Hozir demo versiyasini sinab ko'ring va CRM imkoniyatlari bilan tanishing.
        </p>
        <button className="mt-8 rounded-xl bg-white px-8 py-3 font-bold text-blue-600 transition hover:bg-gray-100">
          Demo talab qilish
        </button>
      </section>
    </main>
  );
}
