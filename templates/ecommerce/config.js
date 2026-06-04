// ─────────────────────────────────────────────────────────────
//  CLIENT CONFIG — Ecommerce / COD Store
//  Edit ONLY this file. Never touch index.html.
//  After editing: push to GitHub → Vercel auto-deploys.
// ─────────────────────────────────────────────────────────────
const CONFIG = {

  lang: 'ar',
  dir:  'rtl',
  font: 'Cairo',

  brand: {
    name:    'اسم المتجر',
    tagline: 'أفضل منتجات — توصيل سريع',
    phone:   '212600000000',   // full format: 212XXXXXXXXX
  },

  colors: {
    primary: '#25D366',   // main green
    dark:    '#075E54',   // dark green (nav, accents)
    accent:  '#FFD700',   // gold highlight
    bg:      '#f5f9f7',   // page background
  },

  tracking: {
    metaPixelId: '',   // Meta Pixel ID
    ga4Id:       '',   // GA4 Measurement ID (G-XXXXXXX)
  },

  hero: {
    badge:      '🇲🇦 توصيل لجميع أنحاء المغرب',
    headline:   'منتجات عالية الجودة',
    highlight:  'بأسعار لا تصدق',
    subtext:    'توصيل سريع للباب — دفع عند الاستلام',
    statement:  '🚀 آلاف العملاء السعداء — انضم إليهم اليوم',
  },

  form: {
    title:       'اطلب منتجك الآن',
    sub:         'توصيل سريع — دفع عند الاستلام',
    submitLabel: 'اطلب الآن',
    services: [
      'منتج 1',
      'منتج 2',
      'منتج 3',
    ],
  },

  stats: [
    { num: '+500',  label: 'عميل سعيد' },
    { num: '24h',   label: 'توصيل سريع' },
    { num: '100%',  label: 'دفع عند الاستلام' },
    { num: '⭐ 5',  label: 'تقييم العملاء' },
  ],

  features: [
    { icon: '📦', title: 'توصيل سريع',    desc: 'توصيل خلال 24–48 ساعة لجميع أنحاء المغرب' },
    { icon: '💰', title: 'دفع عند الاستلام', desc: 'ادفع فقط عند استلام منتجك' },
    { icon: '✅', title: 'جودة مضمونة',   desc: 'منتجات أصلية بجودة عالية' },
    { icon: '🔄', title: 'إرجاع مجاني',   desc: 'إرجاع مجاني خلال 7 أيام إذا لم تعجبك' },
  ],

  reviews: [
    {
      avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
      name:   'سارة',
      city:   'الدار البيضاء',
      text:   'منتج رائع! وصل في وقته وجودته ممتازة. شكراً بزاف 🔥',
      rating: 5,
    },
    {
      avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
      name:   'عمر',
      city:   'مراكش',
      text:   'أنصح به! خدمة ممتازة والتوصيل كان سريع جداً 💯',
      rating: 5,
    },
  ],

  api: {
    submitUrl: 'https://amraniads.com/api/submit',  // AmraniAds shared API
    successUrl: '/success.html',
  },

  footer: {
    copy: '© 2025',
    sub:  'توصيل لجميع أنحاء المغرب 🇲🇦',
  },

};
