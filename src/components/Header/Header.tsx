import { Menu, Phone, ShoppingCart } from 'lucide-react';
import './Header.css';

const navItems = [
  { href: '#search', label: 'Поиск' },
  { href: '#brands', label: 'Марки' },
  { href: '#how-it-works', label: 'Как работает' },
  { href: '#benefits', label: 'Преимущества' },
  { href: '#contacts', label: 'Контакты' },
];

export function Header() {
  return (
    <header className="site-header" data-tune="header" data-tune-label="Шапка: навигация">
      <a className="site-header__logo" href="#top" aria-label="SVEЖZAPP" data-tune-layer="header-logo">
        SVE<span>Ж</span>ZAPP
      </a>

      <nav className="site-header__nav" aria-label="Главная навигация" data-tune-layer="header-nav">
        {navItems.map((item) => (
          <a className="site-header__link" href={item.href} key={item.href}>
            {item.label}
          </a>
        ))}
      </nav>

      <div className="site-header__actions" data-tune-layer="header-actions">
        <a className="site-header__phone" href="tel:+79999999999">
          <Phone aria-hidden="true" />
          +7 (XXX) XXX-XX-XX
        </a>
        <button className="site-header__cart" type="button" aria-label="Корзина">
          <ShoppingCart aria-hidden="true" />
        </button>
        <button className="site-header__menu" type="button" aria-label="Открыть меню">
          <Menu aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
