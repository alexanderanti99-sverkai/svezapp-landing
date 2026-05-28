import { Gauge, ShieldCheck } from 'lucide-react';
import { CarReveal } from '../CarReveal/CarReveal';
import { SearchBar } from '../SearchBar/SearchBar';
import './Hero.css';

export function Hero() {
  return (
    <section className="hero" id="top">
      <div className="hero__bg" aria-hidden="true">
        <CarReveal />
      </div>

      <div className="hero__scan" aria-hidden="true" />

      <div className="hero__content">
        <div
          className="hero__text"
          data-tune="hero-copy"
          data-tune-label="Hero: текст"
          data-tune-default-x="-671"
          data-tune-default-y="-319"
        >
          <p className="hero__eyebrow" data-tune-layer="hero-eyebrow">
            Graphite studio parts
          </p>
          <h1 data-tune-layer="hero-title">
            Автозапчасти, которые подходят с первого раза
          </h1>
          <p className="hero__lead" data-tune-layer="hero-lead">
            Введите артикул - мы найдём деталь в наличии, проверим совместимость и подготовим предложение.
          </p>

          <div className="hero__badges" data-tune-layer="hero-badges" aria-label="Ключевые преимущества">
            <span>
              <ShieldCheck aria-hidden="true" />
              Проверка совместимости
            </span>
            <span>
              <Gauge aria-hidden="true" />
              Поставка от 1 дня
            </span>
          </div>
        </div>
      </div>

      <div
        className="hero__search-plate"
        data-tune="hero-search"
        data-tune-label="Hero: поиск-номер"
        data-tune-default-x="4"
        data-tune-default-y="-55"
      >
        <SearchBar variant="plate" />
      </div>
    </section>
  );
}
