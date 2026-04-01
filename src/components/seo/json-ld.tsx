export interface OrganizationJsonLd {
  "@type": "Organization";
  name: string;
  url: string;
  logo?: string;
  description?: string;
  sameAs?: string[];
}

export interface WebSiteJsonLd {
  "@type": "WebSite";
  name: string;
  url: string;
  description?: string;
  potentialAction?: {
    "@type": "SearchAction";
    target: string;
    "query-input": string;
  };
}

export interface SoftwareApplicationJsonLd {
  "@type": "SoftwareApplication";
  name: string;
  applicationCategory: string;
  operatingSystem: string;
  description: string;
  offers: {
    "@type": "Offer";
    price: string;
    priceCurrency: string;
    description?: string;
  }[];
  aggregateRating?: {
    "@type": "AggregateRating";
    ratingValue: string;
    ratingCount: string;
  };
}

export interface FaqJsonLd {
  "@type": "FAQPage";
  mainEntity: {
    "@type": "Question";
    name: string;
    acceptedAnswer: {
      "@type": "Answer";
      text: string;
    };
  }[];
}

export interface ArticleJsonLd {
  "@type": "Article";
  headline: string;
  description: string;
  url: string;
  datePublished: string;
  dateModified?: string;
  author: {
    "@type": "Person" | "Organization";
    name: string;
    url?: string;
  };
  image?: string;
  publisher: {
    "@type": "Organization";
    name: string;
    logo?: string;
  };
}

type JsonLdData =
  | OrganizationJsonLd
  | WebSiteJsonLd
  | SoftwareApplicationJsonLd
  | FaqJsonLd
  | ArticleJsonLd;

interface JsonLdProps {
  data: JsonLdData | JsonLdData[];
}

export function JsonLd({ data }: JsonLdProps): React.ReactElement {
  const schema = {
    "@context": "https://schema.org",
    ...(Array.isArray(data) ? { "@graph": data } : data),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
