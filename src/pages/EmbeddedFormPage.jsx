import './EmbeddedFormPage.css';

export default function EmbeddedFormPage({ title, src }) {
  return (
    <div className="embedded-form-page">
      <h1 className="embedded-form-page__title">{title}</h1>
      <iframe
        className="embedded-form-page__iframe"
        src={src}
        title={title}
        loading="lazy"
      />
    </div>
  );
}
