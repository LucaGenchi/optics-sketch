// Pure viewport mathematics shared by wheel controls and touch gestures.

export const VIEW_MIN_ZOOM = 0.15;
export const VIEW_MAX_ZOOM = 8;

export function clampZoom(value, min = VIEW_MIN_ZOOM, max = VIEW_MAX_ZOOM) {
  return Math.min(max, Math.max(min, value));
}

// Zoom around a screen-space point. Coordinates are local to the canvas.
export function zoomViewAt(view, point, factor, min = VIEW_MIN_ZOOM, max = VIEW_MAX_ZOOM) {
  const z = clampZoom(view.z * factor, min, max);
  return {
    x: point.x - (point.x - view.x) * (z / view.z),
    y: point.y - (point.y - view.y) * (z / view.z),
    z,
  };
}

// Keep the world point below the initial pinch centre below the moving centre.
// This combines two-finger panning and scaling without accumulating drift.
export function pinchView(startView, startCenter, startDistance, center, distance, min = VIEW_MIN_ZOOM, max = VIEW_MAX_ZOOM) {
  const scale = startDistance > 0 ? distance / startDistance : 1;
  const z = clampZoom(startView.z * scale, min, max);
  const worldX = (startCenter.x - startView.x) / startView.z;
  const worldY = (startCenter.y - startView.y) / startView.z;
  return { x: center.x - worldX * z, y: center.y - worldY * z, z };
}
