import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "IV Hub · Booking Portal",
    short_name: "IV Hub",
    description: "IV Wellness Lounge Clinic — Booking Assignment Portal",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f1ec",
    theme_color: "#1b4332",
    icons: [
      {
        src: "/icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
