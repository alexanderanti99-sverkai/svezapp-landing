import { ClipboardCheck, FileSearch, ShoppingBag } from 'lucide-react';
import { steps } from '../../data/mock';
import './HowItWorks.css';

const icons = [FileSearch, ClipboardCheck, ShoppingBag];

export function HowItWorks() {
  return (
    <section
      className="section workflow-section"
      id="how-it-works"
      data-tune="workflow"
      data-tune-label="Блок: как это работает"
    >
      <div className="section__inner">
        <div className="section-heading">
          <p className="section-kicker" data-tune-layer="workflow-kicker">
            Процесс
          </p>
          <h2 className="section-title" data-tune-layer="workflow-title">
            Как это работает
          </h2>
        </div>

        <div className="workflow-grid" data-tune-layer="workflow-cards">
          {steps.map((step, index) => {
            const Icon = icons[index];

            return (
              <article className="workflow-card technical-panel" key={step.title}>
                <div className="workflow-card__icon" aria-hidden="true">
                  <Icon />
                </div>
                <p>{step.eyebrow}</p>
                <h3>{step.title}</h3>
                <span>{step.text}</span>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
