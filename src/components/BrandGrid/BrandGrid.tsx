import { brands } from '../../data/mock';
import { ParticlesBackground } from '../ParticlesBackground/ParticlesBackground';
import './BrandGrid.css';

export function BrandGrid() {
  return (
    <section
      className="section brand-grid-section"
      id="brands"
      data-tune="brand-grid"
      data-tune-label="Блок: марки автомобилей"
    >
      <ParticlesBackground />
      <div className="section__inner brand-grid-section__inner">
        <div className="section-heading">
          <p className="section-kicker" data-tune-layer="brands-kicker">
            Совместимость
          </p>
          <h2 className="section-title" data-tune-layer="brands-title">
            Работаем с популярными марками
          </h2>
          <p className="section-copy" data-tune-layer="brands-copy">
            Текстовые бейджи помогают показать покрытие без спорного использования фирменных логотипов.
          </p>
        </div>

        <div className="brand-grid" data-tune-layer="brands-list">
          {brands.map((brand) => (
            <span className="brand-grid__item" key={brand}>
              {brand}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
