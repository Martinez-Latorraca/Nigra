import { WebView } from 'react-native-webview';

export default function PetMap({ lat, lng, isDark, style }) {
  const latitude = Number(lat);
  const longitude = Number(lng);

  const tiles = isDark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

  const html = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>html,body,#map{height:100%;margin:0;padding:0;background:transparent}</style>
</head>
<body>
<div id="map"></div>
<script>
  var map = L.map('map', {
    zoomControl: false, attributionControl: false,
    dragging: false, scrollWheelZoom: false, doubleClickZoom: false, touchZoom: false
  }).setView([${latitude}, ${longitude}], 15);
  L.tileLayer('${tiles}', { maxZoom: 19 }).addTo(map);
  L.circleMarker([${latitude}, ${longitude}], {
    radius: 9, color: '#fff', weight: 3, fillColor: '#EF4444', fillOpacity: 1
  }).addTo(map);
</script>
</body>
</html>`;

  return (
    <WebView
      style={style}
      originWhitelist={['*']}
      source={{ html }}
      scrollEnabled={false}
      pointerEvents="none"
    />
  );
}
