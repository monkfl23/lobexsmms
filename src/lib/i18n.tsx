import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Lang = "en" | "ar";

const dict = {
  dashboard: ["Dashboard", "لوحة التحكم"],
  newOrder: ["New Order", "طلب جديد"],
  services: ["Services", "الخدمات"],
  orders: ["Orders", "الطلبات"],
  addFunds: ["Add Funds", "إضافة رصيد"],
  transactions: ["Transactions", "المعاملات"],
  tickets: ["Tickets", "التذاكر"],
  api: ["API", "API"],
  account: ["Account", "الحساب"],
  logout: ["Logout", "تسجيل الخروج"],
  users: ["Users", "المستخدمون"],
  providers: ["Providers", "المزودون"],
  categories: ["Categories", "الأقسام"],
  payments: ["Payments", "المدفوعات"],
  apiSettings: ["API Settings", "إعدادات API"],
  settings: ["Settings", "الإعدادات"],
  balance: ["Balance", "الرصيد"],
  spent: ["Total spent", "إجمالي الإنفاق"],
  totalOrders: ["Total orders", "إجمالي الطلبات"],
  category: ["Category", "القسم"],
  service: ["Service", "الخدمة"],
  description: ["Description", "الوصف"],
  serviceId: ["Service ID", "رقم الخدمة"],
  rate: ["Rate per 1000", "السعر لكل 1000"],
  minmax: ["Min / Max", "الحد الأدنى / الأقصى"],
  link: ["Link", "الرابط"],
  quantity: ["Quantity", "الكمية"],
  total: ["Total", "الإجمالي"],
  placeOrder: ["Place Order", "تأكيد الطلب"],
  adminPanel: ["Admin Panel", "لوحة الإدارة"],
  customerPanel: ["Customer Panel", "لوحة العميل"],
  signIn: ["Sign in", "تسجيل الدخول"],
  signUp: ["Create account", "إنشاء حساب"],
  status: ["Status", "الحالة"],
  date: ["Date", "التاريخ"],
  amount: ["Amount", "المبلغ"],
  search: ["Search", "بحث"],
  recentOrders: ["Recent orders", "أحدث الطلبات"],
  refresh: ["Refresh status", "تحديث الحالة"],
  submit: ["Submit", "إرسال"],
  save: ["Save", "حفظ"],
} as const;

export type TKey = keyof typeof dict;

const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (k: TKey) => string }>({
  lang: "en",
  setLang: () => {},
  t: (k) => dict[k][0],
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  useEffect(() => {
    const saved = localStorage.getItem("lobex-lang");
    if (saved === "ar" || saved === "en") setLangState(saved);
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);
  const setLang = (l: Lang) => {
    localStorage.setItem("lobex-lang", l);
    setLangState(l);
  };
  const t = (k: TKey) => dict[k][lang === "ar" ? 1 : 0];
  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export const useI18n = () => useContext(Ctx);
