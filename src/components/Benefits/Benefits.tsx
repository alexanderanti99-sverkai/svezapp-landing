import { BadgeCheck, Clock3, MousePointerClick, SearchCheck } from 'lucide-react';
import { benefits } from '../../data/mock';
import './Benefits.css';

const icons = [BadgeCheck, SearchCheck, Clock3, MousePointerClick];

export function Benefits() {
  return (
    <section
      className="section benefits-section"
      id="benefits"
      data-tune="benefits"
      data-tune-label="Блок: преимущества"
    >
      <div className="section__inner benefits-section__inner">
        <div className="section-heading">
          <p className="section-kicker" data-tune-layer="benefits-kicker">
            Преимущества
          </p>
          <h2 className="section-title" data-tune-layer="benefits-title">
            Больше уверенности до заказа
          </h2>
        </div>

        <div className="benefits-grid" data-tune-layer="benefits-cards">
          {benefits.map((benefit, index) => {
            const Icon = icons[index];

            return (
              <article className="benefit-card" key={benefit.title}>
                <Icon aria-hidden="true" />
                <h3>{benefit.title}</h3>
                <p>{benefit.text}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
