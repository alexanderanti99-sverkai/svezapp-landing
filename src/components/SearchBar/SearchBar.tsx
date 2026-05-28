import { FormEvent, useMemo, useState } from 'react';
import { ArrowRight, ScanSearch } from 'lucide-react';
import './SearchBar.css';

type SearchMode = 'article' | 'vin';

type SearchResult = {
  article: string;
  name: string;
  delivery: string;
  mode: SearchMode;
};

type SearchBarProps = {
  compact?: boolean;
  variant?: 'default' | 'plate';
};

const modeLabels: Record<SearchMode, string> = {
  article: 'Артикул',
  vin: 'VIN',
};

export function SearchBar({ compact = false, variant = 'default' }: SearchBarProps) {
  const [mode, setMode] = useState<SearchMode>('article');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState<SearchResult | null>(null);
  const isPlate = variant === 'plate';

  const placeholder = useMemo(
    () => (mode === 'article' ? 'Введите артикул запчасти' : 'Введите VIN автомобиля'),
    [mode],
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalized = query.trim();

    if (!normalized) {
      setResult(null);
      setError(mode === 'article' ? 'Введите артикул' : 'Введите VIN');
      return;
    }

    setError('');
    setResult({
      article: normalized.toUpperCase(),
      name: mode === 'article' ? 'Запчасть будет найдена по базе' : 'Подбор будет выполнен по VIN',
      delivery: 'от 1 дня',
      mode,
    });
  };

  const rootClassName = [
    'search-block',
    compact ? 'search-block--compact' : '',
    isPlate ? 'search-block--plate' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={rootClassName} id="search">
      <form className="search-block__form" onSubmit={handleSubmit} noValidate>
        <div className="search-block__tabs" aria-label="Тип поиска" data-tune-layer="search-tabs">
          {(Object.keys(modeLabels) as SearchMode[]).map((item) => (
            <button
              className={mode === item ? 'search-block__tab is-active' : 'search-block__tab'}
              key={item}
              type="button"
              onClick={() => {
                setMode(item);
                setError('');
                setResult(null);
              }}
            >
              {modeLabels[item]}
            </button>
          ))}
        </div>

        <label className="search-block__label" htmlFor="part-search" data-tune-layer="search-label">
          {mode === 'article' ? 'Поиск по артикулу' : 'Подбор по VIN'}
        </label>

        <div className="search-block__field">
          <ScanSearch aria-hidden="true" />
          <input
            id="part-search"
            aria-describedby={error ? 'part-search-error' : result ? 'part-search-result' : undefined}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={placeholder}
            autoComplete="off"
          />
          <button className="premium-button premium-button--primary search-block__submit" type="submit">
            {mode === 'article' ? 'Найти деталь' : 'Подобрать'}
            <ArrowRight aria-hidden="true" />
          </button>
        </div>

        {error ? (
          <p className="search-block__message search-block__message--error" id="part-search-error">
            {error}
          </p>
        ) : null}
      </form>

      {result ? (
        <div className="search-block__result technical-panel" id="part-search-result" role="status">
          <p>
            {result.mode === 'article'
              ? `Заявка по артикулу ${result.article} подготовлена. В будущем здесь будет поиск по базе.`
              : `Заявка по VIN ${result.article} подготовлена. В будущем здесь будет точный подбор по автомобилю.`}
          </p>
          <dl>
            <div>
              <dt>{result.mode === 'article' ? 'Артикул' : 'VIN'}</dt>
              <dd>{result.article}</dd>
            </div>
            <div>
              <dt>Наименование</dt>
              <dd>{result.name}</dd>
            </div>
            <div>
              <dt>Срок поставки</dt>
              <dd>{result.delivery}</dd>
            </div>
          </dl>
        </div>
      ) : null}
    </div>
  );
}
