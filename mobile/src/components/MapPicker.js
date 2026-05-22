import { useRef, useEffect } from 'react';
import { WebView } from 'react-native-webview';

export default function MapPicker({ value, onChange, centerOn, isDark, style }) {
  const ref = useRef(null);
  const initial = value || centerOn || { lat: -34.9011, lng: -56.1645 }; // Montevideo
  const tiles = isDark ? 'dark_all' : 'light_all';

  const html = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>html,body,#map{height:100%;margin:0;padding:0}</style>
</head>
<body>
<div id="map"></div>
<script>
  var map = L.map('map', { attributionControl: false, zoomControl: true }).setView([${initial.lat}, ${initial.lng}], 13);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/${tiles}/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map);
  var marker = ${value ? `L.circleMarker([${value.lat},${value.lng}],{radius:9,color:'#fff',weight:3,fillColor:'#EF4444',fillOpacity:1}).addTo(map)` : 'null'};
  function place(lat, lng) {
    if (marker) { marker.setLatLng([lat, lng]); }
    else { marker = L.circleMarker([lat, lng], { radius:9, color:'#fff', weight:3, fillColor:'#EF4444', fillOpacity:1 }).addTo(map); }
  }
  function post(lat, lng) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ lat: lat, lng: lng }));
  }
  map.on('click', function (e) { place(e.latlng.lat, e.latlng.lng); post(e.latlng.lat, e.latlng.lng); });
  function recv(ev) {
    try {
      var d = JSON.parse(ev.data);
      if (d && d.center) { map.setView([d.lat, d.lng], 15); place(d.lat, d.lng); post(d.lat, d.lng); }
    } catch (e) {}
  }
  document.addEventListener('message', recv);
  window.addEventListener('message', recv);
</script>
</body>
</html>`;

  useEffect(() => {
    if (centerOn && ref.current) {
      ref.current.injectJavaScript(
        `recv({ data: JSON.stringify({ center: true, lat: ${centerOn.lat}, lng: ${centerOn.lng} }) }); true;`
      );
    }
  }, [centerOn]);

  return (
    <WebView
      ref={ref}
      style={style}
      originWhitelist={['*']}
      source={{ html }}
      onMessage={(e) => {
        try {
          const d = JSON.parse(e.nativeEvent.data);
          onChange(d.lat, d.lng);
        } catch {}
      }}
    />
  );
}
