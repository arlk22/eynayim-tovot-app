import { useState } from 'react';
import { FilloutStandardEmbed } from '@fillout/react';
import { useAuth } from '../context/AuthContext';
import { resolveReports } from '../lib/api';
import './EmbeddedFormPage.css';

const DOMAIN = 'gdform1.fillout.com';

export default function EmbeddedFormPage({ title, filloutId }) {
  const { volunteer, profileRefreshed } = useAuth();
  const [submitted, setSubmitted] = useState(false);

  // Wait for the background profile refresh (see AuthContext) before
  // rendering the embed — without this, jumping straight to this page right
  // after opening the app can render before `volunteer.phone` is populated,
  // silently sending the form with no reporter identification.
  if (!profileRefreshed) {
    return (
      <div className="embedded-form-page">
        <h1 className="embedded-form-page__title">{title}</h1>
        <p className="embedded-form-page__loading">טוען…</p>
      </div>
    );
  }

  async function handleSubmit() {
    if (submitted) return;
    setSubmitted(true);
    // Resolves מזהה + שם מדווח for this (and any other pending) report right
    // now, instead of waiting for a מוקדן to next open the dashboard — see
    // handleResolveReports in api/mokad.js. Best-effort: the lazy backfill
    // on the next מוקד dashboard load still catches it if this fails.
    try {
      await resolveReports();
    } catch {
      // ignore — not worth surfacing to the volunteer, who already submitted
    }
  }

  return (
    <div className="embedded-form-page">
      <h1 className="embedded-form-page__title">{title}</h1>
      <div className="embedded-form-page__iframe">
        <FilloutStandardEmbed
          filloutId={filloutId}
          domain={DOMAIN}
          dynamicResize
          parameters={volunteer?.phone ? { reporter_phone: volunteer.phone } : undefined}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}
