import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Code2, Gauge, ShieldCheck, Wallet, Zap, Headphones } from "lucide-react";
import { Logo } from "@/components/lobex/Logo";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LOBEX SMM — Premium Social Media Marketing Panel" },
      { name: "description", content: "Fast, automated social media services with real-time order tracking, wallet funding and a full API." },
      { property: "og:title", content: "LOBEX SMM — Premium SMM Panel" },
      { property: "og:description", content: "Automated social media growth services with instant delivery and API v2." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: Zap, en: "Instant automation", ar: "تنفيذ فوري", den: "Orders are dispatched to delivery networks the moment you place them.", dar: "يتم إرسال الطلبات فور تأكيدها." },
  { icon: Gauge, en: "Live status sync", ar: "متابعة مباشرة", den: "Track start count, remains and progress on every order.", dar: "تابع التقدم والمتبقي لكل طلب." },
  { icon: Wallet, en: "Wallet & refunds", ar: "محفظة واسترجاع", den: "Failed or partial orders are refunded to your balance automatically.", dar: "استرجاع تلقائي للطلبات الفاشلة أو الجزئية." },
  { icon: Code2, en: "Reseller API v2", ar: "واجهة API للموزعين", den: "Standard SMM API — plug LOBEX SMM into your own panel.", dar: "واجهة قياسية لربط لوحتك الخاصة." },
  { icon: ShieldCheck, en: "Secure by design", ar: "أمان كامل", den: "Isolated accounts, protected balances and server-side processing.", dar: "حسابات معزولة وأرصدة محمية." },
  { icon: Headphones, en: "Ticket support", ar: "دعم بالتذاكر", den: "Reach our team directly from your dashboard.", dar: "تواصل مع فريقنا من لوحتك." },
];

function Landing() {
  const { lang, setLang } = useI18n();
  const ar = lang === "ar";
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <Logo />
        <div className="flex items-center gap-3">
          <button onClick={() => setLang(ar ? "en" : "ar")} className="text-sm text-muted-foreground hover:text-foreground">
            {ar ? "English" : "العربية"}
          </button>
          <Link to="/auth" className="rounded-lg border border-border px-4 py-2 text-sm hover:border-primary">
            {ar ? "دخول" : "Sign in"}
          </Link>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="grid-lines absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
        <div className="relative mx-auto max-w-5xl px-6 pb-24 pt-20 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-1.5 text-xs text-muted-foreground animate-rise">
            <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-glow" /> {ar ? "لوحة تسويق احترافية" : "Professional SMM panel"}
          </span>
          <h1 className="mt-6 text-5xl font-bold leading-[1.05] md:text-7xl animate-rise">
            {ar ? "نمو حساباتك" : "Grow every account"}
            <br />
            <span className="text-primary text-glow">{ar ? "بسرعة LOBEX" : "at LOBEX speed."}</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground animate-rise">
            {ar
              ? "خدمات متابعين وإعجابات ومشاهدات مع تنفيذ تلقائي وتتبع لحظي وواجهة API كاملة."
              : "Followers, likes, views and engagement — automated delivery, real-time tracking and a full reseller API."}
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3 animate-rise">
            <Link to="/auth" search={{ mode: "signup" }} className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-glow transition-transform hover:-translate-y-0.5">
              {ar ? "ابدأ الآن" : "Create free account"} <ArrowRight className="h-4 w-4 rtl:rotate-180" />
            </Link>
            <Link to="/auth" className="inline-flex items-center gap-2 rounded-xl border border-border px-6 py-3 font-semibold hover:border-primary">
              {ar ? "تسجيل الدخول" : "Sign in"}
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-6 pb-24 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <div key={f.en} className="panel p-6 transition-shadow hover:shadow-glow">
            <f.icon className="h-6 w-6 text-primary" />
            <h3 className="mt-4 text-lg font-semibold">{ar ? f.ar : f.en}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{ar ? f.dar : f.den}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} LOBEX SMM
      </footer>
    </div>
  );
}
