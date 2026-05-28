import { useEffect, useRef, useState } from 'react';
import carNormal from '../../assets/images/mercedes-normal.png';
import carXray from '../../assets/images/mercedes-xray.jpg';
import './CarReveal.css';

type Point = {
  x: number;
  y: number;
};

const IMAGE_SIZE = {
  width: 1672,
  height: 941,
};

const HOOD_POLYGON: Point[] = [
  { x: 0.346, y: 0.292 },
  { x: 0.406, y: 0.305 },
  { x: 0.468, y: 0.311 },
  { x: 0.5, y: 0.312 },
  { x: 0.532, y: 0.311 },
  { x: 0.594, y: 0.305 },
  { x: 0.654, y: 0.292 },
  { x: 0.674, y: 0.36 },
  { x: 0.704, y: 0.45 },
  { x: 0.719, y: 0.508 },
  { x: 0.704, y: 0.555 },
  { x: 0.668, y: 0.62 },
  { x: 0.625, y: 0.672 },
  { x: 0.56, y: 0.699 },
  { x: 0.5, y: 0.707 },
  { x: 0.44, y: 0.699 },
  { x: 0.375, y: 0.672 },
  { x: 0.332, y: 0.62 },
  { x: 0.296, y: 0.555 },
  { x: 0.281, y: 0.508 },
  { x: 0.296, y: 0.45 },
  { x: 0.326, y: 0.36 },
];

const isPointInPolygon = (point: Point, polygon: Point[]) => {
  let isInside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    const intersects = yi > point.y !== yj > point.y
      && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;

    if (intersects) {
      isInside = !isInside;
    }
  }

  return isInside;
};

const getImagePoint = (containerPoint: Point, rect: DOMRect): Point => {
  const scale = Math.max(rect.width / IMAGE_SIZE.width, rect.height / IMAGE_SIZE.height);
  const renderedWidth = IMAGE_SIZE.width * scale;
  const renderedHeight = IMAGE_SIZE.height * scale;
  const offsetX = (rect.width - renderedWidth) / 2;
  const offsetY = (rect.height - renderedHeight) / 2;

  return {
    x: (containerPoint.x - offsetX) / renderedWidth,
    y: (containerPoint.y - offsetY) / renderedHeight,
  };
};

export function CarReveal() {
  const [isHovered, setIsHovered] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const activeRef = useRef(false);
  const currentRef = useRef<Point | null>(null);
  const targetRef = useRef<Point | null>(null);

  const setActive = (nextValue: boolean) => {
    if (activeRef.current === nextValue) {
      return;
    }

    activeRef.current = nextValue;
    setIsHovered(nextValue);
  };

  const animateReveal = () => {
    const root = rootRef.current;
    const target = targetRef.current;

    if (!root || !target) {
      frameRef.current = null;
      return;
    }

    const current = currentRef.current || target;
    const next = {
      x: current.x + (target.x - current.x) * 0.18,
      y: current.y + (target.y - current.y) * 0.18,
    };
    const distance = Math.hypot(target.x - next.x, target.y - next.y);

    currentRef.current = next;
    root.style.setProperty('--reveal-x', `${next.x}px`);
    root.style.setProperty('--reveal-y', `${next.y}px`);

    if (activeRef.current || distance > 0.4) {
      frameRef.current = window.requestAnimationFrame(animateReveal);
    } else {
      frameRef.current = null;
    }
  };

  const startAnimation = () => {
    if (frameRef.current !== null) {
      return;
    }

    frameRef.current = window.requestAnimationFrame(animateReveal);
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const pointer = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    const imagePoint = getImagePoint(pointer, rect);
    const isInsideHood = isPointInPolygon(imagePoint, HOOD_POLYGON);

    if (!isInsideHood) {
      setActive(false);
      return;
    }

    targetRef.current = pointer;
    currentRef.current = currentRef.current || pointer;
    setActive(true);
    startAnimation();
  };

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  return (
    <div
      className={isHovered ? 'car-reveal is-hovered' : 'car-reveal'}
      data-tune="hero-car"
      data-tune-label="Hero: автомобиль"
      onMouseLeave={() => setActive(false)}
      onMouseMove={handleMouseMove}
      ref={rootRef}
    >
      <img
        className="car-reveal__image car-reveal__image--normal"
        src={carNormal}
        alt="Премиальный автомобиль"
        data-tune-layer="car-normal"
      />
      <img
        className="car-reveal__image car-reveal__image--xray"
        src={carXray}
        alt=""
        aria-hidden="true"
        data-tune-layer="car-xray"
        data-tune-default-x="0"
        data-tune-default-y="0"
        data-tune-default-center-snap="false"
        data-tune-default-edge-snap="false"
        data-tune-default-align-preview="true"
        data-tune-default-preview-opacity="1"
      />
      <div className="car-reveal__caption technical-panel" data-tune-layer="car-caption">
        <span>X-ray hood zone</span>
        <strong>scan only over bonnet</strong>
      </div>
    </div>
  );
}
