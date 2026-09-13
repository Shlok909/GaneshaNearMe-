// Contract double used only by Playwright. Live provider checks are separate.
export function installGoogleMapsDouble() {
  const state = {
    mapsCreated: 0,
    markersCreated: 0,
    markersRemoved: 0,
    failLoads: 0,
    imports: [],
    maps: [],
    routeRequests: [],
    routeResponses: [],
    polylines: [],
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
    lines = new Set();
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
      this.lines.forEach(line => line.render());
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
      this.fittedPoints = bounds.points;
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
    getDiv() { return this.host; }
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
  class Polyline {
    constructor(options) {
      this.options = options;
      state.polylines.push(this);
      this.element = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      this.element.setAttribute("class", "test-route-polyline");
      this.element.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none";
      this.path = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
      this.path.setAttribute("fill", "none");
      this.path.setAttribute("stroke", options.strokeColor);
      this.path.setAttribute("stroke-width", String(options.strokeWeight));
      this.element.append(this.path);
      if (options.map) this.setMap(options.map);
    }
    setMap(map) {
      this.map?.lines.delete(this);
      this.element.remove();
      this.map = map;
      if (map) {
        map.lines.add(this);
        map.surface.prepend(this.element);
        this.render();
      }
    }
    render() {
      const map = this.map;
      if (!map) return;
      this.path.setAttribute("points", this.options.path.map(point => [
        map.host.clientWidth / 2 + (point.lng - map.center.lng) * map.scale(),
        map.host.clientHeight / 2 - (point.lat - map.center.lat) * map.scale(),
      ].join(",")).join(" "));
    }
  }
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    if (String(input) === "/api/routes") {
      if (new Headers(init.headers).has("X-Goog-Api-Key")) throw new Error("Routes key leaked to browser request");
      const body = JSON.parse(init.body);
      const request = {
        origin: body.origin,
        destination: body.destination,
        travelMode: "DRIVE",
      };
      state.routeRequests.push(request);
      const response = state.routeResponses.shift() || {};
      if (response.delay) await new Promise(resolve => setTimeout(resolve, response.delay));
      if (response.error) return Response.json({ error: response.error }, { status: 403 });
      if (response.empty) return Response.json({ route: null });
      // Deliberately bent contract path, distinct from a straight origin/destination line.
      const path = [request.origin, { lat: request.origin.lat, lng: request.destination.lng }, request.destination];
      return Response.json({ route: {
        path,
        distanceMeters: 3400, durationMillis: 480000,
        warnings: response.warnings || [],
      } });
    }
    return originalFetch(input, init);
  };
  const maps = {
    Map: TestMap,
    Polyline,
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
