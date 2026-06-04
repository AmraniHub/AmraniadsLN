// ─────────────────────────────────────────────────────────────
//  CLIENT CONFIG — Service Business (Agency / Coach / Freelancer)
//  Edit ONLY this file. Never touch index.html.
// ─────────────────────────────────────────────────────────────
const CONFIG = {

  lang: 'ar',
  dir:  'rtl',
  font: 'Cairo',

  brand: {
    name:    'اسم الشركة',
    tagline: 'خدمات احترافية لعملك',
    phone:   '212600000000',
  },

  colors: {
    primary: '#6366f1',   // indigo — change to match brand
    dark:    '#312e81',
    accent:  '#f59e0b',
    bg:      '#f8f9ff',
  },

  tracking: {
    metaPixelId: '',
    ga4Id:       '',
  },

  hero: {
    badge:     '⭐ خدمات موثوقة منذ 2020',
    headline:  'نحن نحل مشاكلك',
    highlight: 'بنتائج تُقاس بالأرقام',
    subtext:   'استشارة مجانية — بدون أي التزام',
    statement: '📈 +200 عميل راضٍ في المغرب',
  },

  form: {
    title:       'احجز استشارتك المجانية',
    sub:         'فريقنا سيتواصل معك خلال 24 ساعة',
    submitLabel: 'احجز الآن',
    services: [
      'استشارة تسويقية',
      'إدارة مواقع التواصل',
      'تصميم الهوية البصرية',
      'بناء الموقع الإلكتروني',
      'الباقة الكاملة',
    ],
  },

  stats: [
    { num: '+200', label: 'عميل راضٍ' },
    { num: '5+',   label: 'سنوات خبرة' },
    { num: '98%',  label: 'رضا العملاء' },
    { num: '24h',  label: 'وقت الاستجابة' },
  ],

  features: [
    { icon: '🎯', title: 'نتائج مضمونة',   desc: 'نعمل بنظام النتائج — إذا لم تنجح لا تدفع' },
    { icon: '📊', title: 'تقارير شهرية',  desc: 'تقرير مفصل كل شهر لمتابعة النمو' },
    { icon: '💬', title: 'دعم مستمر',     desc: 'فريقنا متاح على واتساب 6 أيام في الأسبوع' },
    { icon: '🚀', title: 'تنفيذ سريع',    desc: 'نبدأ التنفيذ خلال 48 ساعة من التعاقد' },
  ],

  reviews: [
    {
      avatar: 'https://randomuser.me/api/portraits/men/41.jpg',
      name:   'كريم بنعلي',
      city:   'الدار البيضاء',
      text:   'تعاملت معهم منذ سنتين — نتائج ممتازة والفريق محترف جداً 🔥',
      rating: 5,
    },
    {
      avatar: 'https://randomuser.me/api/portraits/women/68.jpg',
      name:   'أمينة الإدريسي',
      city:   'الرباط',
      text:   'أفضل قرار اتخذته لعملي. زاد رقم مبيعاتي بـ 40% في 3 أشهر 💯',
      rating: 5,
    },
  ],

  api: {
    submitUrl: 'https://amraniads.com/api/submit',
    successUrl: '/success.html',
  },

  footer: {
    copy: '© 2025',
    sub:  'خدمات احترافية — المغرب 🇲🇦',
  },

};
