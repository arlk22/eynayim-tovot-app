import './PhotoLightbox.css';

export default function PhotoLightbox({ src, onClose }) {
  if (!src) return null;

  function handleClose(e) {
    e.stopPropagation();
    onClose();
  }

  return (
    <div className="photo-lightbox__backdrop" onClick={handleClose}>
      <button type="button" className="photo-lightbox__close" onClick={handleClose} aria-label="סגירה">
        ✕
      </button>
      <img src={src} alt="" className="photo-lightbox__image" onClick={(e) => e.stopPropagation()} />
    </div>
  );
}
