// مَدى — Demo product catalog (fictional data for template showcase only).
// Consumed by script.js to render the product grid and the quick-view modal.
// No backend, no real inventory — this is placeholder content for the
// upcoming fake ordering flow.

export const PRODUCTS = [
  {
    id: "shirt-linen-italian",
    name: "قميص كتان إيطالي",
    category: "قميص",
    price: 78000,
    sizes: ["S", "M", "L", "XL"],
    colors: [{ name: "بيج رملي", hex: "#d8c8ab" }],
    availability: "available",
    image:
      "https://images.unsplash.com/photo-1752825609278-f9696bc9d7bd?auto=format&fit=crop&w=900&q=80",
    alt: "قميص كتان إيطالي بيج من مَدى",
    description: "قميص كتان إيطالي فاخر بقصة مريحة وملمس ناعم يعكس أناقة هادئة.",
  },
  {
    id: "jacket-straight-cut",
    name: "جاكيت بقصة مستقيمة",
    category: "جاكيت",
    price: 145000,
    sizes: ["S", "M", "L", "XL"],
    colors: [{ name: "أسود", hex: "#221d18" }],
    availability: "available",
    image:
      "https://images.unsplash.com/photo-1570298306468-899d6109699a?auto=format&fit=crop&w=900&q=80",
    alt: "جاكيت بقصة مستقيمة من مَدى",
    description: "جاكيت بقصة مستقيمة عصرية بخامة متينة، مصمم لإطلالة أنيقة في كل المناسبات.",
  },
  {
    id: "pants-wide-elegant",
    name: "بنطلون واسع بقصة أنيقة",
    category: "بنطلون",
    price: 92000,
    sizes: ["30", "32", "34", "36"],
    colors: [{ name: "بني محروق", hex: "#7a5c42" }],
    availability: "available",
    image:
      "https://images.unsplash.com/photo-1743764252757-6d62eaa6fefc?auto=format&fit=crop&w=900&q=80",
    alt: "بنطلون واسع بقصة أنيقة من مَدى",
    description: "بنطلون واسع بقصة أنيقة وخصر مريح، يجمع بين الفخامة وسهولة الحركة.",
  },
  {
    id: "sweater-soft-wool",
    name: "سترة صوف ناعمة",
    category: "سترة",
    price: 88000,
    sizes: ["S", "M", "L", "XL"],
    colors: [{ name: "كريمي", hex: "#e8ddce" }],
    availability: "low",
    image:
      "https://images.unsplash.com/photo-1574201635302-388dd92a4c3f?auto=format&fit=crop&w=900&q=80",
    alt: "سترة صوف ناعمة من مَدى",
    description: "سترة صوف ناعمة الملمس بتصميم بسيط أنيق، مثالية لأجواء الخريف والشتاء.",
  },
  {
    id: "coat-long-classic",
    name: "معطف طويل بقصة كلاسيكية",
    category: "معطف",
    price: 185000,
    sizes: ["S", "M", "L", "XL"],
    colors: [{ name: "بني كاميل", hex: "#8a6a4c" }],
    availability: "available",
    image:
      "https://images.unsplash.com/photo-1762605135012-56a59a059e60?auto=format&fit=crop&w=900&q=80",
    alt: "معطف طويل بقصة كلاسيكية من مَدى",
    description: "معطف طويل بقصة كلاسيكية خالدة، قطعة أساسية تمنح إطلالة راقية بلا مجهود.",
  },
  {
    id: "shirt-satin-soft",
    name: "قميص ساتان ناعم",
    category: "قميص",
    price: 95000,
    sizes: ["S", "M", "L"],
    colors: [{ name: "أوف وايت", hex: "#efe8dd" }],
    availability: "available",
    image:
      "https://images.unsplash.com/photo-1718278867451-0af1bcb0dfc5?auto=format&fit=crop&w=900&q=80",
    alt: "قميص ساتان ناعم من مَدى",
    description: "قميص ساتان بلمعة ناعمة وسقوط أنيق، يمنح إطلالة مسائية راقية.",
  },
  {
    id: "bag-leather",
    name: "حقيبة جلدية",
    category: "إكسسوارات",
    price: 120000,
    sizes: ["مقاس واحد"],
    colors: [{ name: "بني", hex: "#6f4e37" }],
    availability: "available",
    image:
      "https://images.unsplash.com/photo-1691480150204-66dd1eb77391?auto=format&fit=crop&w=900&q=80",
    alt: "حقيبة جلدية من مَدى",
    description: "حقيبة جلد طبيعي بتصميم أنيق وتفاصيل دقيقة، رفيقة يومية بلمسة فاخرة.",
  },
  {
    id: "belt-genuine-leather",
    name: "حزام جلد طبيعي",
    category: "إكسسوارات",
    price: 65000,
    sizes: ["S/M", "L/XL"],
    colors: [{ name: "أسود", hex: "#221d18" }],
    availability: "available",
    image:
      "https://images.unsplash.com/photo-1624222247344-550fb60583dc?auto=format&fit=crop&w=900&q=80",
    alt: "حزام جلد طبيعي من مَدى",
    description: "حزام من الجلد الطبيعي بإبزيم معدني أنيق، تفصيلة بسيطة تكمل أي إطلالة.",
  },
  {
    id: "blazer-elegant",
    name: "بليزر أنيق",
    category: "بليزر",
    price: 165000,
    sizes: ["S", "M", "L", "XL"],
    colors: [{ name: "كحلي", hex: "#2b3140" }],
    availability: "low",
    image:
      "https://images.unsplash.com/photo-1785706873511-77e157860250?auto=format&fit=crop&w=900&q=80",
    alt: "بليزر أنيق من مَدى",
    description: "بليزر أنيق بخطوط نظيفة وقصة محكمة، قطعة مثالية للإطلالات الرسمية وشبه الرسمية.",
  },
  {
    id: "knitwear-refined",
    name: "قطعة تريكو راقية",
    category: "تريكو",
    price: 89000,
    sizes: ["S", "M", "L"],
    colors: [{ name: "رمادي فاتح", hex: "#c9c2b8" }],
    availability: "available",
    image:
      "https://images.unsplash.com/photo-1612636676503-77f496c96ef8?auto=format&fit=crop&w=900&q=80",
    alt: "قطعة تريكو راقية من مَدى",
    description: "قطعة تريكو ناعمة بنسيج راقٍ وألوان هادئة، تضيف دفئاً وأناقة لأي إطلالة.",
  },
];

export const AVAILABILITY_LABELS = {
  available: "متوفر",
  low: "كمية محدودة",
  soldout: "نفدت الكمية",
};
