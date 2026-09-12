import type { Pandal } from "./types";

// Demo fixtures only: names, coordinates and verification do not represent real verified mandals.
export const pandals: Pandal[] = [
  {
    id: "demo-dharampeth",
    name: "Demo Dharampeth Cha Raja",
    area: "Dharampeth",
    description:
      "A neighbourhood celebration full of devotion, marigolds and the warmth of coming together.",
    theme:
      "A royal Rajasthani courtyard, dressed in marigold garlands and warm golden light.",
    image: "/illustrations/ganapati-saffron.svg",
    gallery: ["/illustrations/pandal.svg", "/illustrations/decoration.svg"],
    verified: true,
    coordinates: { lat: 21.1393, lng: 79.0607 },
    category: "featured",
  },
  {
    id: "demo-pratap-nagar",
    name: "Demo Pratap Nagar Ganesh Utsav Mandal",
    area: "Pratap Nagar",
    description:
      "Traditional Ganapati celebration with a large decorative community pandal.",
    theme:
      "An intricately carved temple setting with traditional diyas and handmade floral decorations.",
    image: "/illustrations/ganapati-rose.svg",
    gallery: ["/illustrations/decoration.svg", "/illustrations/pandal.svg"],
    verified: true,
    coordinates: { lat: 21.1135, lng: 79.059 },
    category: "community",
  },
  {
    id: "demo-sitabuldi",
    name: "Demo Sitabuldi Ganesh Mandal",
    area: "Sitabuldi",
    description:
      "A joyful gathering in the heart of the city, celebrating Bappa with music and community spirit.",
    theme:
      "A heritage-inspired archway with cascading flowers and a canopy of tiny lights.",
    image: "/illustrations/ganapati-green.svg",
    gallery: ["/illustrations/pandal.svg", "/illustrations/decoration.svg"],
    verified: true,
    coordinates: { lat: 21.1432, lng: 79.0849 },
    category: "community",
  },
  {
    id: "demo-ramdaspeth",
    name: "Demo Ramdaspeth Sarvajanik Ganesh",
    area: "Ramdaspeth",
    description:
      "An intimate community pandal with a beautiful handcrafted idol and a welcoming atmosphere.",
    theme:
      "An eco-conscious garden made with natural fabrics, bamboo and fresh green foliage.",
    image: "/illustrations/ganapati-saffron.svg",
    gallery: ["/illustrations/decoration.svg", "/illustrations/pandal.svg"],
    verified: true,
    coordinates: { lat: 21.1317, lng: 79.0758 },
    category: "featured",
  },
  {
    id: "demo-sadar",
    name: "Demo Sadar Ka Bappa",
    area: "Sadar",
    description:
      "Generations of local families come together for this colourful celebration of Ganeshotsav.",
    theme:
      "A classic festive mandap with red drapes, brass-inspired lamps and a lotus backdrop.",
    image: "/illustrations/ganapati-rose.svg",
    gallery: ["/illustrations/pandal.svg", "/illustrations/decoration.svg"],
    verified: true,
    coordinates: { lat: 21.1662, lng: 79.0832 },
    category: "community",
  },
  {
    id: "demo-wardhaman-nagar",
    name: "Demo Wardhaman Nagar Ganesh Mandal",
    area: "Wardhaman Nagar",
    description:
      "Discover a lovingly decorated pandal created by the neighbourhood’s artists and volunteers.",
    theme:
      "A celestial blue and gold backdrop with handmade stars and paper-lantern decorations.",
    image: "/illustrations/ganapati-green.svg",
    gallery: ["/illustrations/decoration.svg", "/illustrations/pandal.svg"],
    verified: false,
    coordinates: { lat: 21.1454, lng: 79.1343 },
    category: "community",
  },
  {
    id: "demo-manish-nagar",
    name: "Demo Manish Nagar Cha Maharaja",
    area: "Manish Nagar",
    description:
      "A family-friendly public celebration with an elegant idol and thoughtful, handmade details.",
    theme:
      "A palace of soft ivory arches, saffron fabric and beautiful traditional rangoli.",
    image: "/illustrations/ganapati-saffron.svg",
    gallery: ["/illustrations/pandal.svg", "/illustrations/decoration.svg"],
    verified: true,
    coordinates: { lat: 21.0878, lng: 79.0789 },
    category: "featured",
  },
];
