import { useAuth } from '../context/AuthContext';
import './EmbeddedFormPage.css';

export default function EmbeddedFormPage({ title, src }) {
  const { volunteer } = useAuth();

  // Prefills the reporter into the Fillout form (hidden field there, set up
  // via Fillout's URL parameters) so a logged-in volunteer never has to
  // pick themselves again. "שם מדווח" is a linked-record field, so its
  // Default value must be the volunteer's Airtable record ID, not their
  // name text. Harmless if the form has no such registered parameter —
  // Fillout just ignores unknown query params.
  const url = new URL(src);
  if (volunteer?.id) {
    url.searchParams.set('reporter_name', volunteer.id);
  }

  return (
    <div className="embedded-form-page">
      <h1 className="embedded-form-page__title">{title}</h1>
      <iframe
        className="embedded-form-page__iframe"
        src={url.toString()}
        title={title}
        loading="lazy"
      />
    </div>
  );
}
