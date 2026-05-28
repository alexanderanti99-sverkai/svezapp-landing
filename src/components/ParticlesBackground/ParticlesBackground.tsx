import './ParticlesBackground.css';

export function ParticlesBackground() {
  return (
    <div className="particles-background" aria-hidden="true">
      {Array.from({ length: 22 }, (_, index) => (
        <span key={index} />
      ))}
    </div>
  );
}
