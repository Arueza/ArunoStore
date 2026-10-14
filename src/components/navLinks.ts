// One source for both navs: the mobile drawer (MenuDrawer) and the desktop
// category row (Navbar). It lives in its own module rather than in MenuDrawer
// because that file is "use client": a server component importing a plain
// value from a client module gets a reference, not the array, and the build
// fails at prerender with "NAV_LINKS.map is not a function".
export const NAV_LINKS = [
  { href: "/shop", label: "Belanja" },
  { href: "/shop/commission", label: "Commissions" },
  { href: "/shop/titipan", label: "Titipan" },
];
