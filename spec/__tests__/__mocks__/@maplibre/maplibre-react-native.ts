// Mock Jest de @maplibre/maplibre-react-native.
// Le vrai package charge des modules TurboModule natifs (MLRNCameraModule, etc.)
// qui n'existent pas dans l'environnement Jest. On expose des composants factices.

export const Map = 'MapLibreMap';
export const Camera = 'MapLibreCamera';
export const ViewAnnotation = 'MapLibreViewAnnotation';
export const MarkerView = 'MapLibreMarkerView';
export const UserLocation = 'MapLibreUserLocation';
export const ShapeSource = 'MapLibreShapeSource';
export const SymbolLayer = 'MapLibreSymbolLayer';
export const CircleLayer = 'MapLibreCircleLayer';
export const LineLayer = 'MapLibreLineLayer';
export const FillLayer = 'MapLibreFillLayer';
