const API_BASE = 'http://localhost:5000/api/community';
const API_ORIGIN = (() => {
  try { return new URL(API_BASE).origin; } catch { return ''; }
})();

export default function Avatar({ src, alt, className, placeholder }) {
  let resolved = src || '';
  if (resolved && typeof resolved === 'string' && resolved.startsWith('/')) {
    resolved = `${API_ORIGIN}${resolved}`;
  }
  return (
    <img
      className={className}
      src={resolved || placeholder}
      alt={alt || 'avatar'}
      onError={(e) => {
        if (placeholder && e.currentTarget.src !== placeholder) {
          e.currentTarget.src = placeholder;
        }
      }}
    />
  );
}
