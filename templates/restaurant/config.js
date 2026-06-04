// ─────────────────────────────────────────────────────────────
//  CLIENT CONFIG — Restaurant / Food Business
//  Edit ONLY this file. Never touch index.html.
// ─────────────────────────────────────────────────────────────
const CONFIG = {

  lang: 'ar',
  dir:  'rtl',
  font: 'Cairo',

  brand: {
    name:    'مطعم الأصيل',
    tagline: 'أكلات مغربية أصيلة',
    phone:   '212600000000',
  },

  colors: {
    primary: '#f97316',   // warm orange
    dark:    '#7c2d12',   // deep brown
    accent:  '#fbbf24',   // golden
    bg:      '#fffbf5',
  },

  tracking: {
    metaPixelId: '',
    ga4Id:       '',
  },

  hero: {
    badge:     '🇲🇦 طبخ مغربي أصيل منذ 2015',
    headline:  'أكلات تذكرك',
    highlight: 'بطعم البيت',
    subtext:   'توصيل سريع — طازج يومياً — بدون مواد حافظة',
    statement: '🍽️ +1000 وجبة يومياً — جرب الفرق اليوم',
  },

  form: {
    title:       'اطلب وجبتك الآن',
    sub:         'توصيل سريع — دفع عند الاستلام',
    submitLabel: 'اطلب الآن',
    services: [
      'طاجين اللحم',
      'كسكس الجمعة',
      'البسطيلة',
      'الحريرة والشباكية',
      'وجبة العائلة',
    ],
  },

  stats: [
    { num: '+1000', label: 'وجبة يومياً' },
    { num: '30min', label: 'وقت التوصيل' },
    { num: '100%',  label: 'مكونات طبيعية' },
    { num: '⭐ 5',  label: 'تقييم العملاء' },
  ],

  features: [
    { icon: '🍲', title: 'طازج يومياً',    desc: 'نطبخ كل يوم بمكونات طازجة بدون تبريد' },
    { icon: '🚴', title: 'توصيل 30 دقيقة', desc: 'نصل إليك في 30 دقيقة أو الطلب مجاناً' },
    { icon: '💰', title: 'دفع عند الاستلام', desc: 'ادفع فقط عند استلام طلبك' },
    { icon: '🌿', title: 'بدون مواد حافظة', desc: 'وصفات تقليدية بمكونات طبيعية 100%' },
  ],

  reviews: [
    {
      avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
      name:   'فاطمة',
      city:   'فاس',
      text:   'كسكس خطير بحال ديال الدار! التوصيل سريع والطعم ما شاء الله 🔥',
      rating: 5,
    },
    {
      avatar: 'https://randomuser.me/api/portraits/men/55.jpg',
      name:   'يوسف',
      city:   'مكناس',
      text:   'أفضل طاجين جربته في حياتي. نطلب منه كل أسبوع 💯',
      rating: 5,
    },
  ],

  api: {
    submitUrl: 'https://amraniads.com/api/submit',
    successUrl: '/success.html',
  },

  footer: {
    copy: '© 2025',
    sub:  'طبخ مغربي أصيل 🇲🇦',
  },

};
