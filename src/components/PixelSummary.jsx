/** Native disclosure behavior, with the game's existing pink pixel button. */
export default function PixelSummary({ children, className = '', ...props }) {
  return (
    <summary className={`px-disclosure ${className}`} {...props}>
      <span className="px-btn px-disclosure-icon" aria-hidden="true"><span /></span>
      <span className="px-disclosure-content">{children}</span>
    </summary>
  )
}
