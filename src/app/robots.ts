import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://quickinvoice.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/blog/", "/pricing"],
        disallow: [
          "/dashboard/",
          "/invoices/",
          "/clients/",
          "/settings/",
          "/api/",
        ],
      },
      {
        userAgent: "Googlebot",
        allow: ["/", "/blog/", "/pricing"],
        disallow: ["/dashboard/", "/api/"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
