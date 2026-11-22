import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { WebView } from 'react-native-webview';
import { cartoTiles } from '../lib/config';
import { pinSvg } from '../lib/mapPin';
import { palette } from '../lib/theme';

// Mapa a pantalla completa de la pestaña Mapa (Mapa.dc.html): Leaflet en un
// WebView con pins de reportes (pin de marca Coral/Teal, agrupados en
// clusters), cuadrados de vets, tu ubicación y el radio de alertas.
//
// Comunicación:
//  - App → mapa: setData({ pets, vets, selected, user }) y flyTo(lat, lng, zoom).
//  - Mapa → app (onEvent): { type: 'bounds', minLat, maxLat, minLng, maxLng, zoom },
//    { type: 'select', kind: 'pet'|'vet', id }, { type: 'deselect' }.

const STETHOSCOPE =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFF6F0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
  '<path d="M11 2v2"/><path d="M5 2v2"/><path d="M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1"/>' +
  '<path d="M8 15a6 6 0 0 0 12 0v-3"/><circle cx="20" cy="10" r="2"/></svg>';

function buildHtml({ center, zoom, isDark, vetBg }) {
  const pins = {
    lost: pinSvg(palette.coral, 38),
    found: pinSvg(palette.teal, 38),
    lostBig: pinSvg(palette.coral, 56),
    foundBig: pinSvg(palette.teal, 56),
  };
  return `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"></script>
<style>
  html,body,#map{height:100%;margin:0;padding:0;background:${isDark ? '#1A1A2E' : palette.arena}}
  .leaflet-control-attribution{font-size:9px;opacity:.7}
  .pin{filter:drop-shadow(0 3px 4px rgba(26,26,46,.25))}
  .pin svg{display:block}
  .vet{width:36px;height:36px;box-sizing:border-box;border-radius:12px;background:${vetBg};border:3px solid #fff;
       box-shadow:0 3px 6px rgba(26,26,46,.22);display:flex;align-items:center;justify-content:center}
  .vet.sel{transform:scale(1.25)}
  .cluster{width:44px;height:44px;box-sizing:border-box;border-radius:50%;background:${palette.coral};
       border:4px solid rgba(255,255,255,.85);box-shadow:0 3px 6px rgba(26,26,46,.22);display:flex;
       align-items:center;justify-content:center;font:900 16px system-ui,sans-serif;color:${palette.arena}}
  .me{width:18px;height:18px;box-sizing:border-box;border-radius:50%;background:${palette.violeta};
       border:3px solid #fff;box-shadow:0 0 0 8px rgba(155,109,255,.22)}
</style>
</head><body><div id="map"></div>
<script>
  var PINS = ${JSON.stringify(pins)};
  var VET_ICON = ${JSON.stringify(STETHOSCOPE)};
  var post = function (m) { window.ReactNativeWebView.postMessage(JSON.stringify(m)); };
  var map = L.map('map', { zoomControl: false, attributionControl: true })
    .setView([${center.lat}, ${center.lng}], ${zoom});
  L.tileLayer(${JSON.stringify(cartoTiles(isDark))}, {
    maxZoom: 19, attribution: '&copy; OpenStreetMap &copy; CARTO'
  }).addTo(map);

  var petLayer = L.markerClusterGroup({
    showCoverageOnHover: false, spiderfyOnMaxZoom: true, maxClusterRadius: 50,
    iconCreateFunction: function (cl) {
      return L.divIcon({ html: '<div class="cluster">' + cl.getChildCount() + '</div>', className: '', iconSize: [44, 44] });
    }
  }).addTo(map);
  var vetLayer = L.layerGroup().addTo(map);
  var meLayer = L.layerGroup().addTo(map);

  function petIcon(p, sel) {
    var key = (p.status === 'found' ? 'found' : 'lost') + (sel ? 'Big' : '');
    var w = sel ? 56 : 38, h = Math.round(w * 148 / 120);
    return L.divIcon({ html: '<div class="pin">' + PINS[key] + '</div>', className: '', iconSize: [w, h], iconAnchor: [w / 2, h] });
  }
  function vetIcon(sel) {
    return L.divIcon({ html: '<div class="vet' + (sel ? ' sel' : '') + '">' + VET_ICON + '</div>', className: '', iconSize: [36, 36] });
  }

  window.mimo = {
    setData: function (d) {
      petLayer.clearLayers(); vetLayer.clearLayers(); meLayer.clearLayers();
      var sel = d.selected || {};
      (d.pets || []).forEach(function (p) {
        var isSel = sel.kind === 'pet' && sel.id === p.id;
        var m = L.marker([p.lat, p.lng], { icon: petIcon(p, isSel), zIndexOffset: isSel ? 1000 : 0 });
        m.on('click', function () { post({ type: 'select', kind: 'pet', id: p.id }); });
        // El seleccionado va fuera del cluster para que siempre se vea grande.
        (isSel ? vetLayer : petLayer).addLayer(m);
      });
      (d.vets || []).forEach(function (v) {
        var isSel = sel.kind === 'vet' && sel.id === v.id;
        var m = L.marker([v.lat, v.lng], { icon: vetIcon(isSel), zIndexOffset: isSel ? 1000 : 500 });
        m.on('click', function () { post({ type: 'select', kind: 'vet', id: v.id }); });
        vetLayer.addLayer(m);
      });
      if (d.user) {
        if (d.user.radiusKm) {
          L.circle([d.user.lat, d.user.lng], {
            radius: d.user.radiusKm * 1000, color: '${palette.violeta}', weight: 2, dashArray: '6 6',
            fillColor: '${palette.violeta}', fillOpacity: 0.07, interactive: false
          }).addTo(meLayer);
        }
        L.marker([d.user.lat, d.user.lng], {
          icon: L.divIcon({ html: '<div class="me"></div>', className: '', iconSize: [18, 18] }), interactive: false
        }).addTo(meLayer);
      }
    },
    flyTo: function (lat, lng, zoom) { map.flyTo([lat, lng], zoom || map.getZoom(), { duration: 0.6 }); }
  };

  function sendBounds() {
    var b = map.getBounds();
    post({ type: 'bounds', minLat: b.getSouth(), maxLat: b.getNorth(), minLng: b.getWest(), maxLng: b.getEast(), zoom: map.getZoom() });
  }
  var t = null;
  map.on('moveend', function () { clearTimeout(t); t = setTimeout(sendBounds, 250); });
  map.on('click', function () { post({ type: 'deselect' }); });
  post({ type: 'ready' });
  sendBounds();
</script></body></html>`;
}

const ExploreMap = forwardRef(function ExploreMap({ initialCenter, initialZoom = 14, isDark, vetBg, data, onEvent, style }, ref) {
  const web = useRef(null);
  const ready = useRef(false);
  const lastData = useRef(data);

  // El HTML solo cambia con el tema; el centro inicial se fija al montar.
  const center = useRef(initialCenter).current;
  const html = useMemo(
    () => buildHtml({ center, zoom: initialZoom, isDark, vetBg }),
    [center, initialZoom, isDark, vetBg]
  );

  const push = (d) => {
    if (!ready.current || !web.current) return;
    web.current.injectJavaScript(`window.mimo && window.mimo.setData(${JSON.stringify(d)}); true;`);
  };

  useEffect(() => {
    lastData.current = data;
    push(data);
  }, [data]);

  useImperativeHandle(ref, () => ({
    flyTo: (lat, lng, zoom) =>
      web.current?.injectJavaScript(`window.mimo && window.mimo.flyTo(${lat}, ${lng}, ${zoom ?? 'undefined'}); true;`),
  }));

  return (
    <WebView
      ref={web}
      key={isDark ? 'dark' : 'light'}
      originWhitelist={['*']}
      source={{ html }}
      style={style}
      javaScriptEnabled
      domStorageEnabled
      onLoadStart={() => {
        ready.current = false;
      }}
      onMessage={(e) => {
        let msg;
        try {
          msg = JSON.parse(e.nativeEvent.data);
        } catch {
          return;
        }
        if (msg.type === 'ready') {
          ready.current = true;
          push(lastData.current);
        }
        onEvent?.(msg);
      }}
    />
  );
});

export default ExploreMap;
