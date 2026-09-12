// Contract double used only by Playwright. Live provider checks are separate.
export function installGoogleMapsDouble() {
  const state = {
    mapsCreated: 0,
    markersCreated: 0,
    markersRemoved: 0,
    failLoads: 0,
    imports: [],
    maps: [],
  };
  window.__testMaps = state;
  class LatLng {
    constructor(point) {
      this.point = { lat: point.lat, lng: point.lng };
    }
    lat() {
      return this.point.lat;
    }
    lng() {
      return this.point.lng;
    }
    toJSON() {
      return { ...this.point };
    }
  }
  class Bounds {
    points = [];
    extend(point) {
      this.points.push(point);
      return this;
    }
  }
  const event = {
    addListenerOnce(target, name, callback) {
      const listener = target.addListener(name, (...args) => {
        listener.remove();
        callback(...args);
      });
      return listener;
    },
    trigger(target, name, ...args) {
      target.listeners.get(name)?.forEach((callback) => callback(...args));
    },
    clearInstanceListeners(target) {
      target.listeners.clear();
    },
  };
  class TestMap {
    listeners = new Map();
    markers = new Set();
    constructor(host, options) {
      state.mapsCreated++;
      state.maps.push(this);
      this.host = host;
      this.center = options.center;
      this.zoom = options.zoom;
      this.options = options;
      host.style.background = "#eee6d7";
      this.surface = document.createElement("div");
      this.surface.className = "test-map-surface";
      this.surface.tabIndex = 0;
      this.surface.setAttribute("role", "region");
      this.surface.setAttribute("aria-label", "Map");
      this.surface.style.cssText = "position:absolute;inset:0";
      host.append(this.surface);
      const attribution = document.createElement("a");
      attribution.className = "test-map-attribution";
      attribution.href = "https://maps.google.com/";
      attribution.textContent = "Google";
      attribution.style.cssText =
        "position:absolute;bottom:4px;left:4px;padding:4px;background:white;font-size:12px";
      host.append(attribution);
      this.surface.addEventListener("click", (e) => {
        const box = this.surface.getBoundingClientRect();
        const scale = this.scale();
        event.trigger(this, "click", {
          latLng: new LatLng({
            lat: this.center.lat - (e.clientY - box.y - box.height / 2) / scale,
            lng: this.center.lng + (e.clientX - box.x - box.width / 2) / scale,
          }),
        });
      });
      this.surface.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight") {
          this.center = { ...this.center, lng: this.center.lng + 0.005 };
          this.update();
        }
      });
      setTimeout(() => event.trigger(this, "idle"), 0);
    }
    scale() {
      return (256 * 2 ** this.zoom) / 360;
    }
    update() {
      this.markers.forEach((marker) => marker.render());
    }
    addListener(name, callback) {
      if (!this.listeners.has(name)) this.listeners.set(name, new Set());
      this.listeners.get(name).add(callback);
      return { remove: () => this.listeners.get(name)?.delete(callback) };
    }
    getMapCapabilities() {
      return { isAdvancedMarkersAvailable: true };
    }
    moveCamera({ center, zoom }) {
      if (center) this.center = center;
      if (zoom !== undefined) this.zoom = zoom;
      this.update();
    }
    fitBounds(bounds) {
      const lats = bounds.points.map((point) => point.lat);
      const lngs = bounds.points.map((point) => point.lng);
      this.center = {
        lat: (Math.min(...lats) + Math.max(...lats)) / 2,
        lng: (Math.min(...lngs) + Math.max(...lngs)) / 2,
      };
      this.zoom = 12;
      this.update();
    }
    getCenter() {
      return new LatLng(this.center);
    }
    getZoom() {
      return this.zoom;
    }
    setZoom(zoom) {
      this.zoom = zoom;
      this.update();
    }
    setOptions(options) {
      Object.assign(this.options, options);
    }
    unbindAll() {
      this.listeners.clear();
    }
  }
  class AdvancedMarker extends HTMLElement {
    constructor(options = {}) {
      super();
      state.markersCreated++;
      this.style.position = "absolute";
      this.position = options.position;
      this.title = options.title ?? "";
      this.style.pointerEvents = options.gmpClickable ? "auto" : "none";
      if (options.gmpClickable) {
        this.tabIndex = 0;
        this.setAttribute("role", "button");
        this.setAttribute("aria-label", this.title);
      }
      this.addEventListener("click", (event) => {
        event.stopPropagation();
        this.dispatchEvent(new Event("gmp-click"));
      });
      this.addEventListener("keydown", (event) => {
        if (["Enter", " "].includes(event.key))
          this.dispatchEvent(new Event("gmp-click"));
      });
      this.map = options.map;
    }
    set map(map) {
      if (this.currentMap) {
        this.currentMap.markers.delete(this);
        this.remove();
        state.markersRemoved++;
      }
      this.currentMap = map;
      if (map) {
        map.markers.add(this);
        map.surface.append(this);
        this.render();
      }
    }
    get map() {
      return this.currentMap;
    }
    set position(point) {
      this.point = point;
      this.render();
    }
    get position() {
      return this.point;
    }
    set zIndex(value) {
      this.style.zIndex = String(value);
    }
    render() {
      if (!this.currentMap || !this.point) return;
      const map = this.currentMap;
      this.style.left =
        map.host.clientWidth / 2 +
        (this.point.lng - map.center.lng) * map.scale() +
        "px";
      this.style.top =
        map.host.clientHeight / 2 -
        (this.point.lat - map.center.lat) * map.scale() +
        "px";
      this.style.transform = "translate(-50%, -50%)";
    }
  }
  customElements.define("gmp-advanced-marker", AdvancedMarker);
  const maps = {
    Map: TestMap,
    LatLngBounds: Bounds,
    event,
    marker: { AdvancedMarkerElement: AdvancedMarker },
    importLibrary: async (name) => {
      state.imports.push(name);
      if (state.failLoads > 0) {
        state.failLoads--;
        throw new Error("Simulated SDK load failure");
      }
      return name === "maps"
        ? { Map: TestMap }
        : { AdvancedMarkerElement: AdvancedMarker };
    },
  };
  window.google = { maps };
}
