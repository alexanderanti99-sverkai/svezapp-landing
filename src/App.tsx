import { Benefits } from './components/Benefits/Benefits';
import { BrandGrid } from './components/BrandGrid/BrandGrid';
import { CursorGlow } from './components/CursorGlow/CursorGlow';
import { Footer } from './components/Footer/Footer';
import { Header } from './components/Header/Header';
import { Hero } from './components/Hero/Hero';
import { HowItWorks } from './components/HowItWorks/HowItWorks';
import { SiteTuner } from './components/SiteTuner/SiteTuner';
import './App.css';

function App() {
  return (
    <div className="app-shell">
      <CursorGlow />
      <Header />
      <main className="page-main">
        <Hero />
        <BrandGrid />
        <HowItWorks />
        <Benefits />
        <section
          className="section quality-section"
          id="contacts"
          data-tune="quality-section"
          data-tune-label="Нижний блок: лозунг"
        >
          <div className="section__inner quality-section__inner">
            <div className="quality-section__copy">
              <p className="section-kicker" data-tune-layer="quality-kicker">
                Внутренняя точность
              </p>
              <h2 className="section-title" data-tune-layer="quality-title">
                Качество, которое видно изнутри
              </h2>
              <p className="section-copy" data-tune-layer="quality-copy">
                Подбираем детали внимательно, чтобы они подходили к автомобилю и задаче клиента.
              </p>
            </div>
            <div className="quality-section__car" aria-hidden="true" data-tune-layer="quality-car">
              <span>Quality and reliability</span>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <SiteTuner />
    </div>
  );
}

export default App;
