"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl, { type StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapPopup } from "./map-popup";

export interface MapMarker {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  placeType: string;
  description: string | null;
  personCount: number;
  eventCount: number;
  eventTypes: string[];
  timeRange: {
    earliest: number | null;
    latest: number | null;
  };
}

interface InteractiveMapProps {
  markers: MapMarker[];
  onMarkerClick?: (marker: MapMarker) => void;
  centerLat?: number;
  centerLng?: number;
  zoom?: number;
  style?: "streets" | "satellite" | "terrain";
}

export function InteractiveMap({
  markers,
  onMarkerClick,
  centerLat = 20,
  centerLng = 0,
  zoom = 2,
  style = "streets",
}: InteractiveMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null);
  const [popupPosition, setPopupPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const mapMarkers = useRef<maplibregl.Marker[]>([]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current) return;
    if (map.current) return; // Already initialized

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: getMapStyle(style),
      center: [centerLng, centerLat],
      zoom: zoom,
    });

    // Add navigation controls
    map.current.addControl(new maplibregl.NavigationControl(), "top-right");

    // Add scale control
    map.current.addControl(
      new maplibregl.ScaleControl({
        maxWidth: 100,
        unit: "metric",
      }),
      "bottom-left"
    );

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [centerLat, centerLng, style, zoom]);

  // Sync center/zoom when props change
  useEffect(() => {
    if (!map.current) return;
    map.current.setCenter([centerLng, centerLat]);
    map.current.setZoom(zoom);
  }, [centerLat, centerLng, zoom]);

  // Update map style
  useEffect(() => {
    if (!map.current) return;
    map.current.setStyle(getMapStyle(style));
  }, [style]);

  // Update markers
  useEffect(() => {
    if (!map.current) return;

    // Remove existing markers
    mapMarkers.current.forEach((marker) => marker.remove());
    mapMarkers.current = [];

    // Add new markers
    markers.forEach((markerData) => {
      const el = createMarkerElement(markerData);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([markerData.longitude, markerData.latitude])
        .addTo(map.current!);

      el.addEventListener("click", (e) => {
        e.stopPropagation();
        setSelectedMarker(markerData);

        // Calculate popup position
        const rect = el.getBoundingClientRect();
        setPopupPosition({
          x: rect.left + rect.width / 2,
          y: rect.top,
        });

        if (onMarkerClick) {
          onMarkerClick(markerData);
        }
      });

      mapMarkers.current.push(marker);
    });

    // Fit map to markers if there are any
    if (markers.length > 0 && map.current) {
      const bounds = new maplibregl.LngLatBounds();
      markers.forEach((marker) => {
        bounds.extend([marker.longitude, marker.latitude]);
      });
      map.current.fitBounds(bounds, { padding: 50, maxZoom: 12 });
    }
  }, [markers, onMarkerClick]);

  return (
    <div className="relative h-full w-full">
      <div ref={mapContainer} className="h-full w-full rounded-lg" />

      {selectedMarker && popupPosition && (
        <MapPopup
          marker={selectedMarker}
          position={popupPosition}
          onClose={() => {
            setSelectedMarker(null);
            setPopupPosition(null);
          }}
        />
      )}
    </div>
  );
}

function getMapStyle(
  style: "streets" | "satellite" | "terrain"
): StyleSpecification {
  // Using OpenStreetMap tiles (free and open source)
  switch (style) {
    case "satellite":
      return {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: [
              "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            ],
            tileSize: 256,
            attribution: "Tiles © Esri",
          },
        },
        layers: [
          {
            id: "osm",
            type: "raster",
            source: "osm",
            minzoom: 0,
            maxzoom: 22,
          },
        ],
      };
    case "terrain":
      return {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.opentopomap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "© OpenTopoMap",
          },
        },
        layers: [
          {
            id: "osm",
            type: "raster",
            source: "osm",
            minzoom: 0,
            maxzoom: 17,
          },
        ],
      };
    case "streets":
    default:
      return {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "© OpenStreetMap contributors",
          },
        },
        layers: [
          {
            id: "osm",
            type: "raster",
            source: "osm",
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      };
  }
}

function createMarkerElement(marker: MapMarker): HTMLDivElement {
  const el = document.createElement("div");
  el.className = "map-marker";

  // Use different colors based on event types
  let bgColor = "hsl(var(--primary))";
  if (marker.eventTypes.includes("BIRTH")) {
    bgColor = "hsl(142, 71%, 45%)"; // Green for births
  } else if (marker.eventTypes.includes("DEATH")) {
    bgColor = "hsl(0, 84%, 60%)"; // Red for deaths
  } else if (marker.eventTypes.includes("MARRIAGE")) {
    bgColor = "hsl(280, 100%, 70%)"; // Purple for marriages
  }

  // Create inner div for marker styling
  const inner = document.createElement("div");
  inner.style.backgroundColor = bgColor;
  inner.style.width = "32px";
  inner.style.height = "32px";
  inner.style.borderRadius = "50%";
  inner.style.border = "3px solid white";
  inner.style.boxShadow = "0 2px 4px rgba(0,0,0,0.3)";
  inner.style.display = "flex";
  inner.style.alignItems = "center";
  inner.style.justifyContent = "center";
  inner.style.cursor = "pointer";
  inner.style.transition = "transform 0.2s";
  inner.style.color = "white";
  inner.style.fontWeight = "600";
  inner.style.fontSize = "12px";

  // Set text content safely
  inner.textContent = marker.personCount > 0 ? String(marker.personCount) : "•";

  el.appendChild(inner);

  // Add hover effect
  el.addEventListener("mouseenter", () => {
    inner.style.transform = "scale(1.2)";
  });

  el.addEventListener("mouseleave", () => {
    inner.style.transform = "scale(1)";
  });

  return el;
}
