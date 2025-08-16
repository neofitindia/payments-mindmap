export interface Point {
  x: number;
  y: number;
}

export interface SVGCoordinateParams {
  clientX: number;
  clientY: number;
  svgElement: SVGSVGElement;
  panOffset: Point;
  svgWidth?: number;
  svgHeight?: number;
}

export const convertScreenToSVGCoordinates = ({
  clientX,
  clientY,
  svgElement,
  panOffset,
  svgWidth = 800,
  svgHeight = 600
}: SVGCoordinateParams): Point => {
  const rect = svgElement.getBoundingClientRect();
  
  const svgX = ((clientX - rect.left) / rect.width) * svgWidth - panOffset.x;
  const svgY = ((clientY - rect.top) / rect.height) * svgHeight - panOffset.y;
  
  return { x: svgX, y: svgY };
};

export const calculatePanDelta = (current: Point, last: Point): Point => ({
  x: current.x - last.x,
  y: current.y - last.y
});

export const applyPanOffset = (offset: Point, delta: Point): Point => ({
  x: offset.x + delta.x,
  y: offset.y + delta.y
});

export const hasPositionChanged = (
  prev: Record<string, Point>, 
  current: Record<string, Point>
): boolean => {
  const prevKeys = Object.keys(prev);
  const currentKeys = Object.keys(current);
  
  if (prevKeys.length !== currentKeys.length) return true;
  
  return currentKeys.some(id => {
    const prevPos = prev[id];
    const currentPos = current[id];
    return !prevPos || !currentPos || 
           prevPos.x !== currentPos.x || 
           prevPos.y !== currentPos.y;
  });
};