import { ChangeEvent, PointerEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Download, Grip, SlidersHorizontal, Upload, X } from 'lucide-react';
import './SiteTuner.css';

type LayerType = 'text' | 'media' | 'element';

type TuneLayer = {
  key: string;
  label: string;
  type: LayerType;
  node: HTMLElement;
};

type TuneBlock = {
  id: string;
  label: string;
  node: HTMLElement;
  layers: TuneLayer[];
};

type TuneBaseState = {
  x: number;
  y: number;
  scale: number;
  width: number;
  height: number;
  centerSnap: boolean;
  edgeSnap: boolean;
};

type TuneLayerState = TuneBaseState & {
  content: string | null;
  fontFamily: string;
  fontScale: number;
  fontWeight: number;
  lineHeight: number;
  letterSpacing: number;
  mediaSrc: string | null;
  alignPreview: boolean;
  previewOpacity: number;
};

type TuneBlockState = TuneBaseState & {
  label: string;
  layers: Record<string, TuneLayerState>;
};

type TuneState = {
  version: number;
  elements: Record<string, TuneBlockState>;
};

type LayerBox = {
  key: string;
  label: string;
  type: LayerType;
  rect: DOMRect;
};

type OverlayState = {
  blockRect: DOMRect | null;
  layers: LayerBox[];
};

type GuideState = {
  x: number | null;
  y: number | null;
};

const STORAGE_KEY = 'svezapp-layout-tuner-v6';
const EXPORT_VERSION = 12;
const SNAP_DISTANCE = 10;
const malformedHeightKey = 'heigФht';

const baseTransformState: TuneBaseState = {
  x: 0,
  y: 0,
  scale: 1,
  width: 0,
  height: 0,
  centerSnap: true,
  edgeSnap: true,
};

const defaultLayerState = (): TuneLayerState => ({
  ...baseTransformState,
  content: null,
  fontFamily: '',
  fontScale: 1,
  fontWeight: 0,
  lineHeight: 0,
  letterSpacing: 0,
  mediaSrc: null,
  alignPreview: false,
  previewOpacity: 0.55,
});

const numberOr = (value: unknown, fallback: number) => (
  typeof value === 'number' && Number.isFinite(value) ? value : fallback
);

const booleanOr = (value: unknown, fallback: boolean) => (
  typeof value === 'boolean' ? value : fallback
);

const readNumberData = (node: HTMLElement | undefined, key: string, fallback: number) => {
  const raw = node?.dataset[key];
  const parsed = raw === undefined ? Number.NaN : Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const readBooleanData = (node: HTMLElement | undefined, key: string, fallback: boolean) => {
  const raw = node?.dataset[key];

  if (raw === 'true') {
    return true;
  }

  if (raw === 'false') {
    return false;
  }

  return fallback;
};

const defaultBaseStateForNode = (node?: HTMLElement): TuneBaseState => ({
  x: readNumberData(node, 'tuneDefaultX', baseTransformState.x),
  y: readNumberData(node, 'tuneDefaultY', baseTransformState.y),
  scale: readNumberData(node, 'tuneDefaultScale', baseTransformState.scale),
  width: readNumberData(node, 'tuneDefaultWidth', baseTransformState.width),
  height: readNumberData(node, 'tuneDefaultHeight', baseTransformState.height),
  centerSnap: readBooleanData(node, 'tuneDefaultCenterSnap', baseTransformState.centerSnap),
  edgeSnap: readBooleanData(node, 'tuneDefaultEdgeSnap', baseTransformState.edgeSnap),
});

const defaultLayerStateForNode = (node?: HTMLElement): TuneLayerState => ({
  ...defaultLayerState(),
  ...defaultBaseStateForNode(node),
  alignPreview: readBooleanData(node, 'tuneDefaultAlignPreview', false),
  previewOpacity: readNumberData(node, 'tuneDefaultPreviewOpacity', 0.55),
});

const hasExplicitTuneDefaults = (node?: HTMLElement) => Boolean(
  node
  && Object.keys(node.dataset).some((key) => key.startsWith('tuneDefault')),
);

const createDefaultState = (): TuneState => ({
  version: EXPORT_VERSION,
  elements: {},
});

const serializeState = (nextState: TuneState) => JSON.stringify(nextState, null, 2);

const normalizeBaseState = (item: Partial<Record<string, unknown>> | undefined, defaults: TuneBaseState): TuneBaseState => ({
  x: numberOr(item?.x, defaults.x),
  y: numberOr(item?.y, defaults.y),
  scale: numberOr(item?.scale, defaults.scale),
  width: numberOr(item?.width, defaults.width),
  height: numberOr(item?.height ?? item?.[malformedHeightKey], defaults.height),
  centerSnap: booleanOr(item?.centerSnap, defaults.centerSnap),
  edgeSnap: booleanOr(item?.edgeSnap, defaults.edgeSnap),
});

const normalizeLayerState = (
  item: Partial<Record<string, unknown>> | undefined,
  defaults: TuneLayerState,
): TuneLayerState => ({
  ...defaults,
  ...normalizeBaseState(item, defaults),
  content: typeof item?.content === 'string' || item?.content === null ? item.content : defaults.content,
  fontFamily: typeof item?.fontFamily === 'string' ? item.fontFamily : defaults.fontFamily,
  fontScale: numberOr(item?.fontScale, defaults.fontScale),
  fontWeight: numberOr(item?.fontWeight, defaults.fontWeight),
  lineHeight: numberOr(item?.lineHeight, defaults.lineHeight),
  letterSpacing: numberOr(item?.letterSpacing, defaults.letterSpacing),
  mediaSrc: typeof item?.mediaSrc === 'string' || item?.mediaSrc === null ? item.mediaSrc : defaults.mediaSrc,
  alignPreview: booleanOr(item?.alignPreview, defaults.alignPreview),
  previewOpacity: numberOr(item?.previewOpacity, defaults.previewOpacity),
});

const normalizeBlockState = (
  item: Partial<Record<string, unknown>> | undefined,
  label: string,
  defaults: TuneBaseState,
  layers: Record<string, TuneLayerState> = {},
): TuneBlockState => ({
  ...normalizeBaseState(item, defaults),
  label,
  layers,
});

const isEditableText = (node: HTMLElement) => {
  const tagName = node.tagName.toLowerCase();
  return ['h1', 'h2', 'h3', 'p', 'a', 'button', 'li', 'span', 'strong'].includes(tagName);
};

const getLayerLabel = (node: HTMLElement, fallback: string) => {
  const explicit = node.getAttribute('data-tune-layer-label');
  const text = node.textContent?.replace(/\s+/g, ' ').trim();
  const alt = node instanceof HTMLImageElement ? node.alt : '';
  return explicit || alt || text?.slice(0, 48) || fallback;
};

const getLayerType = (node: HTMLElement): LayerType => {
  if (node instanceof HTMLImageElement) {
    return 'media';
  }

  return isEditableText(node) ? 'text' : 'element';
};

const setInlineStyle = (node: HTMLElement, property: string, value = '') => {
  if (value) {
    node.style.setProperty(property, value);
  } else {
    node.style.removeProperty(property);
  }
};

const ensureOriginalSnapshot = (node: HTMLElement) => {
  if (node.dataset.tunerOriginalized) {
    return;
  }

  const computed = getComputedStyle(node);
  node.dataset.tunerOriginalized = 'true';
  node.dataset.tunerInlineTransform = node.style.transform;
  node.dataset.tunerBaseTransform = computed.transform;
  node.dataset.tunerInlineWidth = node.style.width;
  node.dataset.tunerInlineHeight = node.style.height;
  node.dataset.tunerBaseFontSize = computed.fontSize;
  node.dataset.tunerInlineFontSize = node.style.fontSize;
  node.dataset.tunerInlineFontWeight = node.style.fontWeight;
  node.dataset.tunerInlineLineHeight = node.style.lineHeight;
  node.dataset.tunerInlineLetterSpacing = node.style.letterSpacing;
  node.dataset.tunerInlineFontFamily = node.style.fontFamily;
  node.dataset.tunerInlineOpacity = node.style.getPropertyValue('opacity');
  node.dataset.tunerInlineClipPath = node.style.getPropertyValue('clip-path');
  node.dataset.tunerInlineMaskImage = node.style.getPropertyValue('mask-image');
  node.dataset.tunerInlineWebkitMaskImage = node.style.getPropertyValue('-webkit-mask-image');

  if (isEditableText(node)) {
    node.dataset.tunerBaseContent = node.textContent || '';
  }

  if (node instanceof HTMLImageElement) {
    node.dataset.tunerBaseSrc = node.src;
  }
};

const resetNode = (node: HTMLElement) => {
  if (!node.dataset.tunerOriginalized) {
    return;
  }

  node.style.transform = node.dataset.tunerInlineTransform || '';
  node.style.width = node.dataset.tunerInlineWidth || '';
  node.style.height = node.dataset.tunerInlineHeight || '';
  node.style.fontSize = node.dataset.tunerInlineFontSize || '';
  node.style.fontWeight = node.dataset.tunerInlineFontWeight || '';
  node.style.lineHeight = node.dataset.tunerInlineLineHeight || '';
  node.style.letterSpacing = node.dataset.tunerInlineLetterSpacing || '';
  node.style.fontFamily = node.dataset.tunerInlineFontFamily || '';
  setInlineStyle(node, 'opacity', node.dataset.tunerInlineOpacity);
  setInlineStyle(node, 'clip-path', node.dataset.tunerInlineClipPath);
  setInlineStyle(node, 'mask-image', node.dataset.tunerInlineMaskImage);
  setInlineStyle(node, '-webkit-mask-image', node.dataset.tunerInlineWebkitMaskImage);

  if (isEditableText(node) && node.dataset.tunerBaseContent !== undefined) {
    node.textContent = node.dataset.tunerBaseContent;
  }

  if (node instanceof HTMLImageElement && node.dataset.tunerBaseSrc) {
    node.src = node.dataset.tunerBaseSrc;
  }
};

const applyBaseTransform = (node: HTMLElement, item: TuneBaseState) => {
  ensureOriginalSnapshot(node);

  const base = node.dataset.tunerBaseTransform && node.dataset.tunerBaseTransform !== 'none'
    ? `${node.dataset.tunerBaseTransform} `
    : '';
  const defaults = defaultBaseStateForNode(node);
  const deltaX = item.x - defaults.x;
  const deltaY = item.y - defaults.y;
  const deltaScale = defaults.scale === 0 ? item.scale : item.scale / defaults.scale;

  node.style.transform = `${base}translate3d(${deltaX}px, ${deltaY}px, 0) scale(${deltaScale})`;
  node.style.transformOrigin = 'center center';
  node.style.width = item.width > 0 ? `${item.width}px` : node.dataset.tunerInlineWidth || '';
  node.style.height = item.height > 0 ? `${item.height}px` : node.dataset.tunerInlineHeight || '';
};

const applyLayerState = (node: HTMLElement, item: TuneLayerState, allowPreview = false) => {
  applyBaseTransform(node, item);

  if (item.fontFamily) {
    node.style.fontFamily = item.fontFamily;
  }

  if (item.fontScale !== 1) {
    const base = parseFloat(node.dataset.tunerBaseFontSize || getComputedStyle(node).fontSize || '16');
    node.style.fontSize = `${base * item.fontScale}px`;
  }

  if (item.fontWeight) {
    node.style.fontWeight = String(item.fontWeight);
  }

  if (item.lineHeight) {
    node.style.lineHeight = String(item.lineHeight);
  }

  if (item.letterSpacing) {
    node.style.letterSpacing = `${item.letterSpacing}px`;
  }

  if (isEditableText(node) && item.content !== null) {
    node.textContent = item.content;
  }

  if (node instanceof HTMLImageElement) {
    node.src = item.mediaSrc || node.dataset.tunerBaseSrc || node.src;
  }

  if (node instanceof HTMLImageElement) {
    const shouldPreview = allowPreview && item.alignPreview;
    const previewOpacity = Number.isFinite(item.previewOpacity) ? item.previewOpacity : 0.55;

    setInlineStyle(node, 'opacity', shouldPreview ? String(previewOpacity) : node.dataset.tunerInlineOpacity);
    setInlineStyle(node, 'clip-path', shouldPreview ? 'none' : node.dataset.tunerInlineClipPath);
    setInlineStyle(node, 'mask-image', shouldPreview ? 'none' : node.dataset.tunerInlineMaskImage);
    setInlineStyle(node, '-webkit-mask-image', shouldPreview ? 'none' : node.dataset.tunerInlineWebkitMaskImage);
  }
};

const discoverBlocks = () => {
  const blockNodes = Array.from(document.querySelectorAll<HTMLElement>('[data-tune]')).filter(
    (node) => !node.closest('.site-tuner'),
  );

  return blockNodes.map<TuneBlock>((node) => {
    const id = node.dataset.tune || '';
    const layerNodes = Array.from(
      node.querySelectorAll<HTMLElement>('[data-tune-layer], h1, h2, h3, p, a, button, li, img, span, strong'),
    ).filter((layerNode) => layerNode.closest('[data-tune]') === node && !layerNode.closest('.site-tuner'));

    const layers = layerNodes.map<TuneLayer>((layerNode, index) => {
      const key = layerNode.dataset.tuneLayer || `${layerNode.tagName.toLowerCase()}-${index}`;
      layerNode.dataset.tunerKey = key;

      return {
        key,
        label: getLayerLabel(layerNode, key),
        type: getLayerType(layerNode),
        node: layerNode,
      };
    });

    return {
      id,
      label: node.dataset.tuneLabel || id,
      node,
      layers,
    };
  });
};

const createBlockStateFromBlock = (block: TuneBlock): TuneBlockState => {
  const layers = block.layers.reduce<Record<string, TuneLayerState>>((accumulator, layer) => {
    if (hasExplicitTuneDefaults(layer.node)) {
      accumulator[layer.key] = defaultLayerStateForNode(layer.node);
    }

    return accumulator;
  }, {});

  return {
    ...defaultBaseStateForNode(block.node),
    label: block.label,
    layers,
  };
};

const shouldKeepBlockState = (block: TuneBlock) => (
  hasExplicitTuneDefaults(block.node) || block.layers.some((layer) => hasExplicitTuneDefaults(layer.node))
);

const mergeBlockDefaults = (block: TuneBlock, existing?: TuneBlockState): TuneBlockState => {
  const blockDefaults = createBlockStateFromBlock(block);

  if (!existing) {
    return blockDefaults;
  }

  const layers = { ...existing.layers };

  block.layers.forEach((layer) => {
    if (hasExplicitTuneDefaults(layer.node) && !layers[layer.key]) {
      layers[layer.key] = defaultLayerStateForNode(layer.node);
    }
  });

  return {
    ...existing,
    label: block.label,
    layers,
  };
};

const createDefaultStateForBlocks = (nextBlocks: TuneBlock[]): TuneState => {
  const elements = nextBlocks.reduce<Record<string, TuneBlockState>>((accumulator, block) => {
    if (shouldKeepBlockState(block)) {
      accumulator[block.id] = createBlockStateFromBlock(block);
    }

    return accumulator;
  }, {});

  return {
    version: EXPORT_VERSION,
    elements,
  };
};

const normalizeElements = (rawElements: unknown): Record<string, TuneBlockState> => {
  if (!rawElements || typeof rawElements !== 'object') {
    return {};
  }

  return Object.fromEntries(
    Object.entries(rawElements as Record<string, unknown>).map(([key, value]) => {
      const rawBlock = value as Partial<Record<string, unknown>>;
      const rawLayers = rawBlock.layers && typeof rawBlock.layers === 'object'
        ? rawBlock.layers as Record<string, Partial<Record<string, unknown>>>
        : {};

      return [
        key,
        normalizeBlockState(rawBlock, typeof rawBlock.label === 'string' ? rawBlock.label : key, baseTransformState, Object.fromEntries(
          Object.entries(rawLayers).map(([layerKey, layerValue]) => [
            layerKey,
            normalizeLayerState(layerValue, defaultLayerState()),
          ]),
        )),
      ];
    }),
  );
};

const loadState = (): TuneState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return createDefaultState();
    }

    const parsed = JSON.parse(raw) as TuneState;

    if (!parsed || typeof parsed !== 'object' || !parsed.elements) {
      return createDefaultState();
    }

    return {
      version: EXPORT_VERSION,
      elements: normalizeElements(parsed.elements),
    };
  } catch {
    return createDefaultState();
  }
};

export function SiteTuner() {
  const [open, setOpen] = useState(false);
  const [blocks, setBlocks] = useState<TuneBlock[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState('');
  const [selectedLayerKey, setSelectedLayerKey] = useState('');
  const [state, setState] = useState<TuneState>(loadState);
  const [overlay, setOverlay] = useState<OverlayState>({ blockRect: null, layers: [] });
  const [guides, setGuides] = useState<GuideState>({ x: null, y: null });
  const [jsonValue, setJsonValue] = useState('');
  const [status, setStatus] = useState('');
  const [customFonts, setCustomFonts] = useState<string[]>([]);
  const dragRef = useRef<(() => void) | null>(null);

  const selectedBlock = useMemo(
    () => blocks.find((block) => block.id === selectedBlockId) || blocks[0],
    [blocks, selectedBlockId],
  );

  const selectedLayer = useMemo(
    () => selectedBlock?.layers.find((layer) => layer.key === selectedLayerKey),
    [selectedBlock, selectedLayerKey],
  );

  const selectedBlockState = useMemo<TuneBlockState>(() => {
    if (!selectedBlock) {
      return { ...baseTransformState, label: '', layers: {} };
    }

    return state.elements[selectedBlock.id] || createBlockStateFromBlock(selectedBlock);
  }, [selectedBlock, state.elements]);

  const selectedLayerState = useMemo<TuneLayerState>(() => {
    if (!selectedLayer) {
      return defaultLayerState();
    }

    return {
      ...defaultLayerStateForNode(selectedLayer.node),
      ...selectedBlockState.layers[selectedLayer.key],
    };
  }, [selectedBlockState.layers, selectedLayer]);

  const activeState = selectedLayer ? selectedLayerState : selectedBlockState;

  const refreshBlocks = useCallback(() => {
    const nextBlocks = discoverBlocks();
    setBlocks(nextBlocks);
    setSelectedBlockId((current) => current || nextBlocks[0]?.id || '');
    setState((previous) => {
      let changed = false;
      const elements = { ...previous.elements };

      nextBlocks.forEach((block) => {
        if (!shouldKeepBlockState(block)) {
          return;
        }

        const merged = mergeBlockDefaults(block, elements[block.id]);

        if (merged !== elements[block.id]) {
          elements[block.id] = merged;
          changed = true;
        }
      });

      return changed ? { version: EXPORT_VERSION, elements } : previous;
    });
  }, []);

  const updateOverlay = useCallback(() => {
    if (!open || !selectedBlock) {
      setOverlay({ blockRect: null, layers: [] });
      return;
    }

    setOverlay({
      blockRect: selectedBlock.node.getBoundingClientRect(),
      layers: selectedBlock.layers.map((layer) => ({
        key: layer.key,
        label: layer.label,
        type: layer.type,
        rect: layer.node.getBoundingClientRect(),
      })),
    });
  }, [open, selectedBlock]);

  const updateBlockState = useCallback(
    (patch: Partial<TuneBlockState>) => {
      if (!selectedBlock) {
        return;
      }

      setState((previous) => {
        const current = previous.elements[selectedBlock.id] || {
          ...defaultBaseStateForNode(selectedBlock.node),
          label: selectedBlock.label,
          layers: {},
        };

        return {
          version: EXPORT_VERSION,
          elements: {
            ...previous.elements,
            [selectedBlock.id]: {
              ...current,
              ...patch,
              label: selectedBlock.label,
              layers: current.layers || {},
            },
          },
        };
      });
    },
    [selectedBlock],
  );

  const updateLayerStateByKey = useCallback(
    (layerKey: string, patch: Partial<TuneLayerState>) => {
      if (!selectedBlock || !layerKey) {
        return;
      }

      setState((previous) => {
        const currentBlock = previous.elements[selectedBlock.id] || {
          ...defaultBaseStateForNode(selectedBlock.node),
          label: selectedBlock.label,
          layers: {},
        };

        const layerNode = selectedBlock.layers.find((layer) => layer.key === layerKey)?.node;
        const currentLayer = currentBlock.layers[layerKey] || defaultLayerStateForNode(layerNode);

        return {
          version: EXPORT_VERSION,
          elements: {
            ...previous.elements,
            [selectedBlock.id]: {
              ...currentBlock,
              label: selectedBlock.label,
              layers: {
                ...currentBlock.layers,
                [layerKey]: {
                  ...currentLayer,
                  ...patch,
                },
              },
            },
          },
        };
      });
    },
    [selectedBlock],
  );

  const updateLayerState = useCallback(
    (patch: Partial<TuneLayerState>) => {
      if (!selectedLayer) {
        return;
      }

      updateLayerStateByKey(selectedLayer.key, patch);
    },
    [selectedLayer, updateLayerStateByKey],
  );

  const updateActiveState = useCallback(
    (patch: Partial<TuneBlockState & TuneLayerState>) => {
      if (selectedLayer) {
        updateLayerState(patch);
      } else {
        updateBlockState(patch);
      }
    },
    [selectedLayer, updateBlockState, updateLayerState],
  );

  const resetAllNodes = useCallback(() => {
    discoverBlocks().forEach((block) => {
      resetNode(block.node);
      block.layers.forEach((layer) => resetNode(layer.node));
    });
  }, []);

  const applyTuning = useCallback(() => {
    blocks.forEach((block) => {
      const blockState = state.elements[block.id];

      if (blockState) {
        applyBaseTransform(block.node, blockState);
      } else {
        resetNode(block.node);
      }

      block.layers.forEach((layer) => {
        const layerState = blockState?.layers?.[layer.key];

        if (layerState) {
          applyLayerState(layer.node, layerState, open);
        } else {
          resetNode(layer.node);
        }
      });
    });

    if (open) {
      window.requestAnimationFrame(updateOverlay);
    }
  }, [blocks, open, state.elements, updateOverlay]);

  const startDrag = (
    event: PointerEvent<HTMLButtonElement | HTMLDivElement>,
    target: 'block' | 'layer',
    layerKey?: string,
  ) => {
    if (!selectedBlock || !overlay.blockRect) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (layerKey) {
      setSelectedLayerKey(layerKey);
    } else {
      setSelectedLayerKey('');
    }

    const startX = event.clientX;
    const startY = event.clientY;
    const startBlockState = selectedBlockState;
    const startLayer = layerKey
      ? selectedBlock.layers.find((layer) => layer.key === layerKey)
      : selectedLayer;
    const startLayerState = layerKey
      ? selectedBlockState.layers[layerKey] || defaultLayerStateForNode(startLayer?.node)
      : selectedLayerState;
    const parentRect = selectedBlock.node.getBoundingClientRect();
    const initialLayerRect = startLayer?.node.getBoundingClientRect();
    const initialBlockRect = selectedBlock.node.getBoundingClientRect();

    const handleMove = (moveEvent: globalThis.PointerEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      setGuides({ x: null, y: null });

      if (target === 'block') {
        let nextX = startBlockState.x + dx;
        let nextY = startBlockState.y + dy;
        const nextCenterX = initialBlockRect.left + dx + initialBlockRect.width / 2;
        const nextCenterY = initialBlockRect.top + dy + initialBlockRect.height / 2;
        const nextLeft = initialBlockRect.left + dx;
        const nextRight = initialBlockRect.right + dx;
        const pageCenterX = window.innerWidth / 2;
        const pageCenterY = window.innerHeight / 2;
        const nextGuides: GuideState = { x: null, y: null };

        if (startBlockState.centerSnap && Math.abs(nextCenterX - pageCenterX) < SNAP_DISTANCE) {
          nextX += pageCenterX - nextCenterX;
          nextGuides.x = pageCenterX;
        }

        if (startBlockState.centerSnap && Math.abs(nextCenterY - pageCenterY) < SNAP_DISTANCE) {
          nextY += pageCenterY - nextCenterY;
          nextGuides.y = pageCenterY;
        }

        if (startBlockState.edgeSnap && Math.abs(nextLeft - 0) < SNAP_DISTANCE) {
          nextX += 0 - nextLeft;
          nextGuides.x = 0;
        }

        if (startBlockState.edgeSnap && Math.abs(nextRight - window.innerWidth) < SNAP_DISTANCE) {
          nextX += window.innerWidth - nextRight;
          nextGuides.x = window.innerWidth;
        }

        setGuides(nextGuides);
        updateBlockState({ x: Math.round(nextX), y: Math.round(nextY) });
        return;
      }

      if (!startLayer || !initialLayerRect) {
        return;
      }

      let nextX = startLayerState.x + dx;
      let nextY = startLayerState.y + dy;
      const moved = {
        left: initialLayerRect.left + dx,
        right: initialLayerRect.right + dx,
        top: initialLayerRect.top + dy,
        bottom: initialLayerRect.bottom + dy,
        centerX: initialLayerRect.left + dx + initialLayerRect.width / 2,
        centerY: initialLayerRect.top + dy + initialLayerRect.height / 2,
      };
      const nextGuides: GuideState = { x: null, y: null };

      if (startLayerState.edgeSnap) {
        if (Math.abs(moved.left - parentRect.left) < SNAP_DISTANCE) {
          nextX += parentRect.left - moved.left;
          nextGuides.x = parentRect.left;
        }

        if (Math.abs(moved.right - parentRect.right) < SNAP_DISTANCE) {
          nextX += parentRect.right - moved.right;
          nextGuides.x = parentRect.right;
        }

        if (Math.abs(moved.top - parentRect.top) < SNAP_DISTANCE) {
          nextY += parentRect.top - moved.top;
          nextGuides.y = parentRect.top;
        }

        if (Math.abs(moved.bottom - parentRect.bottom) < SNAP_DISTANCE) {
          nextY += parentRect.bottom - moved.bottom;
          nextGuides.y = parentRect.bottom;
        }
      }

      if (startLayerState.centerSnap) {
        const parentCenterX = parentRect.left + parentRect.width / 2;
        const parentCenterY = parentRect.top + parentRect.height / 2;

        if (Math.abs(moved.centerX - parentCenterX) < SNAP_DISTANCE) {
          nextX += parentCenterX - moved.centerX;
          nextGuides.x = parentCenterX;
        }

        if (Math.abs(moved.centerY - parentCenterY) < SNAP_DISTANCE) {
          nextY += parentCenterY - moved.centerY;
          nextGuides.y = parentCenterY;
        }
      }

      setGuides(nextGuides);
      updateLayerStateByKey(startLayer.key, { x: Math.round(nextX), y: Math.round(nextY) });
    };

    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      dragRef.current = null;
      setGuides({ x: null, y: null });
      updateOverlay();
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    dragRef.current = handleUp;
  };

  const handleExport = () => {
    const serialized = serializeState(state);
    setJsonValue(serialized);
    setStatus('JSON готов к передаче.');
  };

  const handleImport = () => {
    try {
      const parsed = JSON.parse(jsonValue) as TuneState;

      if (!parsed || !parsed.elements) {
        throw new Error('Invalid tuner JSON');
      }

      const normalizedElements = normalizeElements(parsed.elements);

      blocks.forEach((block) => {
        if (shouldKeepBlockState(block)) {
          normalizedElements[block.id] = mergeBlockDefaults(block, normalizedElements[block.id]);
        }
      });

      setState({
        version: EXPORT_VERSION,
        elements: normalizedElements,
      });
      setStatus('Настройки импортированы.');
    } catch {
      setStatus('Не удалось импортировать JSON.');
    }
  };

  const handleReset = () => {
    const nextState = createDefaultStateForBlocks(blocks);
    setState(nextState);
    setJsonValue(serializeState(nextState));
    setStatus('Временные настройки сброшены.');
    resetAllNodes();
  };

  const handleMediaChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file || !selectedLayer || selectedLayer.type !== 'media') {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      updateLayerState({ mediaSrc: String(reader.result) });
      setStatus('Изображение заменено во временном слое.');
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleFontUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const name = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Zа-яА-Я0-9_-]/g, '-');
      const url = URL.createObjectURL(file);
      const face = new FontFace(name, `url(${url})`);
      await face.load();
      document.fonts.add(face);
      setCustomFonts((current) => Array.from(new Set([...current, name])));
      updateActiveState({ fontFamily: name });
      setStatus(`Шрифт ${name} подключён к выбранному слою.`);
    } catch {
      setStatus('Не удалось подключить шрифт.');
    }

    event.target.value = '';
  };

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    setJsonValue(serializeState(state));
  }, [state]);

  useEffect(() => {
    document.body.classList.toggle('tuner-active', open);

    if (open) {
      refreshBlocks();
    } else {
      setOverlay({ blockRect: null, layers: [] });
    }

    return () => {
      document.body.classList.remove('tuner-active');
    };
  }, [open, refreshBlocks]);

  useEffect(() => {
    refreshBlocks();
  }, [refreshBlocks]);

  useEffect(() => {
    if (!selectedLayerKey && selectedBlock?.layers[0]) {
      return;
    }

    if (selectedLayerKey && !selectedBlock?.layers.some((layer) => layer.key === selectedLayerKey)) {
      setSelectedLayerKey('');
    }
  }, [selectedBlock, selectedLayerKey]);

  useEffect(() => {
    applyTuning();
  }, [applyTuning]);

  useEffect(() => {
    const onResize = () => updateOverlay();
    const onScroll = () => updateOverlay();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onScroll);
      dragRef.current?.();
    };
  }, [updateOverlay]);

  if (!open) {
    return (
      <button className="site-tuner__launcher" type="button" onClick={() => setOpen(true)}>
        <SlidersHorizontal aria-hidden="true" />
        Настроить макет
      </button>
    );
  }

  return (
    <div className="site-tuner" aria-label="Визуальный тюнер макета">
      <div className="site-tuner__overlay">
        {guides.x !== null ? <span className="site-tuner__guide site-tuner__guide--x" style={{ left: guides.x }} /> : null}
        {guides.y !== null ? <span className="site-tuner__guide site-tuner__guide--y" style={{ top: guides.y }} /> : null}
        {overlay.blockRect ? (
          <div
            className="site-tuner__block-box"
            style={{
              left: overlay.blockRect.left,
              top: overlay.blockRect.top,
              width: overlay.blockRect.width,
              height: overlay.blockRect.height,
            }}
            onPointerDown={(event) => startDrag(event, 'block')}
          >
            <button
              className="site-tuner__block-handle"
              type="button"
              onPointerDown={(event) => startDrag(event, 'block')}
            >
              <Grip aria-hidden="true" />
              Весь блок
            </button>
          </div>
        ) : null}
        {overlay.layers.map((layer) => {
          const isSelected = layer.key === selectedLayerKey;

          return (
            <button
              className={isSelected ? 'site-tuner__layer-handle is-selected' : 'site-tuner__layer-handle'}
              key={layer.key}
              style={{
                left: layer.rect.left + layer.rect.width / 2,
                top: layer.rect.top + layer.rect.height / 2,
              }}
              type="button"
              title={layer.label}
              onClick={() => setSelectedLayerKey(layer.key)}
              onPointerDown={(event) => startDrag(event, 'layer', layer.key)}
            >
              {isSelected ? layer.label : ''}
            </button>
          );
        })}
      </div>

      <aside className="site-tuner__panel">
        <div className="site-tuner__panel-head">
          <div>
            <strong>Настройки макета</strong>
            <span>Временный слой, экспорт через JSON</span>
          </div>
          <button type="button" aria-label="Закрыть тюнер" onClick={() => setOpen(false)}>
            <X aria-hidden="true" />
          </button>
        </div>

        <label className="site-tuner__field">
          <span>Элемент</span>
          <select
            value={selectedBlock?.id || ''}
            onChange={(event) => {
              setSelectedBlockId(event.target.value);
              setSelectedLayerKey('');
            }}
          >
            {blocks.map((block) => (
              <option value={block.id} key={block.id}>
                {block.label}
              </option>
            ))}
          </select>
        </label>

        <label className="site-tuner__field">
          <span>Слой внутри</span>
          <select value={selectedLayerKey} onChange={(event) => setSelectedLayerKey(event.target.value)}>
            <option value="">Весь блок</option>
            {selectedBlock?.layers.map((layer) => (
              <option value={layer.key} key={layer.key}>
                {layer.label}
              </option>
            ))}
          </select>
        </label>

        <div className="site-tuner__mode">
          <span>Курсор двигает</span>
          <strong>{selectedLayer ? 'Выбранный слой' : 'Весь блок'}</strong>
        </div>

        <div className="site-tuner__grid">
          <NumberControl label="x" value={activeState.x} onChange={(value) => updateActiveState({ x: value })} />
          <NumberControl label="y" value={activeState.y} onChange={(value) => updateActiveState({ y: value })} />
          <NumberControl
            label="scale"
            step={0.05}
            value={activeState.scale}
            onChange={(value) => updateActiveState({ scale: value })}
          />
          <NumberControl
            label="width"
            value={activeState.width}
            onChange={(value) => updateActiveState({ width: value })}
          />
          <NumberControl
            label="height"
            value={activeState.height}
            onChange={(value) => updateActiveState({ height: value })}
          />
        </div>

        <div className="site-tuner__switches">
          <label>
            <input
              checked={activeState.edgeSnap}
              type="checkbox"
              onChange={(event) => updateActiveState({ edgeSnap: event.target.checked })}
            />
            Магнит к краям блока
          </label>
          <label>
            <input
              checked={activeState.centerSnap}
              type="checkbox"
              onChange={(event) => updateActiveState({ centerSnap: event.target.checked })}
            />
            Мягкий магнит к центру
          </label>
        </div>

        {selectedLayer?.type === 'text' ? (
          <div className="site-tuner__text-tools">
            <label className="site-tuner__field">
              <span>Текст</span>
              <textarea
                value={selectedLayerState.content ?? selectedLayer.node.textContent ?? ''}
                onChange={(event) => updateLayerState({ content: event.target.value })}
              />
            </label>

            <div className="site-tuner__grid">
              <NumberControl
                label="font scale"
                step={0.05}
                value={selectedLayerState.fontScale}
                onChange={(value) => updateLayerState({ fontScale: value })}
              />
              <NumberControl
                label="weight"
                value={selectedLayerState.fontWeight}
                onChange={(value) => updateLayerState({ fontWeight: value })}
              />
              <NumberControl
                label="line height"
                step={0.05}
                value={selectedLayerState.lineHeight}
                onChange={(value) => updateLayerState({ lineHeight: value })}
              />
              <NumberControl
                label="letter spacing"
                step={0.1}
                value={selectedLayerState.letterSpacing}
                onChange={(value) => updateLayerState({ letterSpacing: value })}
              />
            </div>

            <label className="site-tuner__field">
              <span>Font family</span>
              <select
                value={selectedLayerState.fontFamily}
                onChange={(event) => updateLayerState({ fontFamily: event.target.value })}
              >
                <option value="">Manrope / исходный</option>
                {customFonts.map((font) => (
                  <option value={font} key={font}>
                    {font}
                  </option>
                ))}
              </select>
            </label>

            <label className="site-tuner__upload">
              <input type="file" accept=".woff,.woff2,.ttf,.otf" onChange={handleFontUpload} />
              Загрузить шрифт
            </label>
          </div>
        ) : null}

        {selectedLayer?.type === 'media' ? (
          <div className="site-tuner__media-tools">
            <label className="site-tuner__check-row">
              <input
                checked={selectedLayerState.alignPreview}
                type="checkbox"
                onChange={(event) => updateLayerState({ alignPreview: event.target.checked })}
              />
              Показать слой поверх для совмещения
            </label>
            <NumberControl
              label="preview opacity"
              min={0}
              max={1}
              step={0.05}
              value={selectedLayerState.previewOpacity}
              onChange={(value) => updateLayerState({ previewOpacity: Math.min(1, Math.max(0, value)) })}
            />
            <label className="site-tuner__upload">
              <input type="file" accept="image/*" onChange={handleMediaChange} />
              Заменить изображение
            </label>
            <button type="button" onClick={() => updateLayerState({ mediaSrc: null })}>
              Сбросить медиа
            </button>
          </div>
        ) : null}

        <div className="site-tuner__actions">
          <button type="button" onClick={handleExport}>
            <Download aria-hidden="true" />
            Экспорт JSON
          </button>
          <button type="button" onClick={handleImport}>
            <Upload aria-hidden="true" />
            Импорт JSON
          </button>
          <button type="button" onClick={handleReset}>
            Сброс
          </button>
        </div>

        <label className="site-tuner__field">
          <span>Настройки для передачи</span>
          <textarea
            className="site-tuner__json"
            value={jsonValue}
            onChange={(event) => setJsonValue(event.target.value)}
            placeholder="Экспортируйте JSON или вставьте настройки для импорта"
          />
        </label>

        {status ? <p className="site-tuner__status">{status}</p> : null}
      </aside>
    </div>
  );
}

type NumberControlProps = {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
};

function NumberControl({ label, value, min, max, step = 1, onChange }: NumberControlProps) {
  return (
    <label className="site-tuner__field">
      <span>{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={Number.isFinite(value) ? value : 0}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}
