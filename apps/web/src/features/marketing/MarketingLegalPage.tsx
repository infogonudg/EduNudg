import { Link, Navigate, useOutletContext, useParams } from "react-router-dom";
import { BrandLegalPageContent } from "@/features/brand/BrandLegalPageContent";
import {
  BRAND_LEGAL_PAGE_LABELS,
  hasBrandLegalPage,
  parseLegalPageKind,
} from "@/lib/brandLegalPages";
import type { BrandLegalPages } from "@/lib/brandLegalPages";

export type MarketingLegalOutletContext = {
  legalPages: BrandLegalPages;
};

export function MarketingLegalPage() {
  const { kind: rawKind } = useParams();
  const kind = parseLegalPageKind(rawKind);
  const ctx = useOutletContext<MarketingLegalOutletContext>();

  if (!kind) {
    return <Navigate to="/" replace />;
  }

  const doc = ctx.legalPages[kind];
  if (!hasBrandLegalPage(ctx.legalPages, kind) || !doc) {
    return (
      <div className="marketing-legal-page">
        <div className="marketing-legal-page__inner">
          <h1>{BRAND_LEGAL_PAGE_LABELS[kind]}</h1>
          <p>This policy is not available yet. Please check back later or contact us if you need a copy.</p>
          <Link to="/">Back to homepage</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="marketing-legal-page">
      <div className="marketing-legal-page__inner">
        <header className="marketing-legal-page__head">
          <h1>{BRAND_LEGAL_PAGE_LABELS[kind]}</h1>
          <p className="marketing-legal-page__meta">
            Last updated {new Date(doc.uploadedAt).toLocaleDateString()}
          </p>
          <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="marketing-legal-page__download">
            Download original ({doc.fileName})
          </a>
        </header>

        <BrandLegalPageContent doc={doc} title={BRAND_LEGAL_PAGE_LABELS[kind]} />
      </div>
    </div>
  );
}
