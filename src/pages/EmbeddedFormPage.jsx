import { useAuth } from '../context/AuthContext';
import './EmbeddedFormPage.css';

export default function EmbeddedFormPage({ title, src }) {
  const { volunteer } = useAuth();

  // Prefills the reporter's name into the Fillout form (hidden field there,
  // set up via Fillout's URL parameters) so a logged-in volunteer never has
  // to type their own name again. Harmless if the form has no such
  // registered parameter — Fillout just ignores unknown query params.
  const url = new URL(src);
  if (volunteer?.name) {
    url.searchParams.set('reporter_name', volunteer.name);
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
