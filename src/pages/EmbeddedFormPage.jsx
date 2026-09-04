import { useAuth } from '../context/AuthContext';
import './EmbeddedFormPage.css';

export default function EmbeddedFormPage({ title, src }) {
  const { volunteer, profileRefreshed } = useAuth();

  // Wait for the background profile refresh (see AuthContext) before
  // building the iframe URL — without this, jumping straight to this page
  // right after opening the app can render before `volunteer.phone` is
  // populated, silently sending the form with no reporter identification.
  if (!profileRefreshed) {
    return (
      <div className="embedded-form-page">
        <h1 className="embedded-form-page__title">{title}</h1>
        <p className="embedded-form-page__loading">טוען…</p>
      </div>
    );
  }

  // Prefills the reporter's phone into a hidden text field on the Fillout
  // form, so a logged-in volunteer never has to identify themselves again.
  // Deliberately a plain phone value (not the volunteer's record ID) —
  // Fillout's linked-record "שם מדווח" field doesn't sync reliably when
  // prefilled this way, so the actual volunteer link is resolved
  // server-side from this phone number instead (see api/mokad.js).
  // Harmless if the form has no such registered parameter.
  const url = new URL(src);
  if (volunteer?.phone) {
    url.searchParams.set('reporter_phone', volunteer.phone);
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
