import { GameCategoryOption, LoginMethodOption, SecurityGuide } from "@/types";

export const GAME_CATEGORIES: GameCategoryOption[] = [
  {
    id: "mobile_legends",
    name: "Mobile Legends",
    icon: "/asset/mobile-legends.png",
    image: "/asset/mobile-legends.png",
    description: "Battle royale dan MOBA terpopuler",
    color: "from-blue-500 to-purple-600",
  },
  {
    id: "pubg_mobile",
    name: "PUBG Mobile",
    icon: "/asset/pubg.webp",
    image: "/asset/pubg.webp",
    description: "Survival game battle royale",
    color: "from-yellow-500 to-orange-600",
  },
  {
    id: "free_fire",
    name: "Free Fire",
    icon: "/asset/free-fire.png",
    image: "/asset/free-fire.png",
    description: "Action battle royale cepat",
    color: "from-red-500 to-pink-600",
  },
  {
    id: "efootball",
    name: "eFootball",
    icon: "/asset/efootball.webp",
    image: "/asset/efootball.webp",
    description: "Simulasi sepak bola digital",
    color: "from-green-500 to-emerald-600",
  },
  {
    id: "fifa_26",
    name: "FIFA 26",
    icon: "/asset/ea-sports.jpg",
    image: "/asset/ea-sports.jpg",
    description: "Sepak bola ultimate team",
    color: "from-indigo-500 to-blue-600",
  },
];

export const LOGIN_METHODS: LoginMethodOption[] = [
  {
    id: "facebook",
    name: "Facebook",
    icon: "f",
    color: "from-blue-600 to-blue-700",
  },
  {
    id: "google",
    name: "Google",
    icon: "G",
    color: "from-red-500 to-red-600",
  },
  {
    id: "x",
    name: "X (Twitter)",
    icon: "X",
    color: "from-gray-800 to-gray-900",
  },
  {
    id: "konami_id",
    name: "Konami ID",
    icon: "K",
    color: "from-purple-600 to-purple-700",
  },
  {
    id: "ea",
    name: "EA Sports",
    icon: "EA",
    color: "from-red-600 to-red-700",
  },
];

export const SECURITY_GUIDES: Record<string, SecurityGuide> = {
  facebook: {
    title: "Panduan Keamanan Akun Facebook",
    tips: [
      "Aktifkan otentikasi dua faktor (2FA) melalui pengaturan keamanan",
      "Gunakan password yang kuat dengan kombinasi huruf, angka, dan simbol",
      "Periksa perangkat yang terhubung dan hapus yang tidak dikenal",
      "Jangan bagikan kode login saat diminta Facebook",
      "Perbarui informasi kontak (email dan nomor telepon) secara berkala",
    ],
    warnings: [
      "Jangan pernah memberikan password kepada siapa pun",
      "Hindari menggunakan password yang sama di platform lain",
      "Waspada terhadap phishing links yang mengatasnamakan Facebook",
      "Jangan setujui permintaan akses dari aplikasi yang tidak dipercaya",
    ],
    resources: [
      {
        label: "Pusat Keamanan Facebook",
        url: "https://www.facebook.com/security",
      },
      {
        label: "Panduan 2FA Facebook",
        url: "https://www.facebook.com/help/148233965247823",
      },
    ],
  },
  google: {
    title: "Panduan Keamanan Akun Google",
    tips: [
      "Aktifkan Verifikasi Dua Langkah (2SV) di Google Account",
      "Gunakan Google Authenticator atau Authy untuk kode 2FA",
      "Atur recovery email dan nomor telepon yang dapat diakses",
      "Tinjau aktivitas login di Google Activity",
      "Hapus akses dari aplikasi pihak ketiga yang tidak digunakan",
    ],
    warnings: [
      "Jangan buka email masuk dari Google yang mencurigakan",
      "Hindari menggunakan Gmail untuk akun yang kurang penting",
      "Jangan berikan kode verifikasi kepada siapa pun",
      "Waspada terhadap website palsu yang mirip Google login",
    ],
    resources: [
      { label: "Pusat Keamanan Google", url: "https://myaccount.google.com/security" },
      {
        label: "Verifikasi 2 Langkah Google",
        url: "https://www.google.com/langsec/step-by-step-help/",
      },
    ],
  },
  x: {
    title: "Panduan Keamanan Akun X (Twitter)",
    tips: [
      "Aktifkan autentikasi berbasis kunci keamanan atau kode satu kali",
      "Gunakan email yang aman dan terbaru",
      "Tinjau aplikasi yang terhubung melalui pengaturan",
      "Aktifkan perlindungan privasi dengan mengecilkan jangkauan followers",
      "Gunakan password yang unik dan kuat",
    ],
    warnings: [
      "Jangan bagikan personal access tokens dengan aplikasi tidak terpercaya",
      "Hindari mengklik link dari DM yang mencurigakan",
      "Jangan memberikan akses ke aplikasi pihak ketiga yang meragukan",
      "Waspada dengan akun palsu yang menyamar sebagai tim X",
    ],
    resources: [
      {
        label: "Keamanan & Perlindungan X",
        url: "https://help.twitter.com/en/safety-and-security",
      },
      {
        label: "Autentikasi Dua Faktor X",
        url: "https://help.twitter.com/en/managing-your-account/two-factor-authentication",
      },
    ],
  },
  konami_id: {
    title: "Panduan Keamanan Akun Konami ID",
    tips: [
      "Buat password yang kompleks dengan minimal 8 karakter",
      "Aktifkan autentikasi dua faktor jika tersedia",
      "Gunakan email recovery yang dapat diakses dengan mudah",
      "Jangan berbagi detail akun dengan pemain lain",
      "Perbarui informasi keamanan secara berkala",
    ],
    warnings: [
      "Jangan menggunakan username sama dengan password",
      "Hindari berbagi akun dengan pemain lain",
      "Jangan mempercayai penjual akun atau RMT (Real Money Trading)",
      "Waspada dengan website palsu yang meniru Konami",
    ],
    resources: [
      {
        label: "Pusat Bantuan Konami",
        url: "https://www.konami.com/",
      },
      {
        label: "Keamanan Akun eFootball",
        url: "https://www.efootball.com/",
      },
    ],
  },
  ea: {
    title: "Panduan Keamanan Akun EA Sports",
    tips: [
      "Aktifkan verifikasi 2 faktor melalui EA Account Security",
      "Gunakan password yang berbeda dari akun lain",
      "Hubungkan ke email recovery yang aktif",
      "Tinjau perangkat yang login ke akun EA Anda",
      "Jangan bagikan origin account key dengan siapa pun",
    ],
    warnings: [
      "Jangan membeli atau menjual pemain FIFA melalui website pihak ketiga",
      "Hindari menggunakan bot atau program otomatis untuk trading",
      "Jangan memberikan data akun kepada pihak ketiga",
      "Waspada dengan email phishing yang mengatasnamakan EA",
    ],
    resources: [
      {
        label: "Keamanan Akun EA",
        url: "https://www.ea.com/account-security",
      },
      {
        label: "Dukungan FIFA 26",
        url: "https://www.ea.com/games/fifa/fifa-26",
      },
    ],
  },
};
