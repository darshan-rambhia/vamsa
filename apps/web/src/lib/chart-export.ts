export interface ExportOptions {
  title: string;
  orientation: "portrait" | "landscape";
  includeMetadata?: boolean;
  scale?: number;
}

/**
 * Color map for CSS variables to hex colors.
 * These match the Vamsa design system colors defined in styles.css.
 * Using hex values because svg2pdf.js and canvas don't support oklch().
 */
const COLOR_MAP: Record<string, string> = {
  // Light mode colors (default)
  "--color-background": "#faf9f7",
  "--color-foreground": "#22573e",
  "--color-card": "#f2f0ec",
  "--color-card-foreground": "#22573e",
  "--color-popover": "#faf9f7",
  "--color-popover-foreground": "#22573e",
  "--color-primary": "#22573e",
  "--color-primary-foreground": "#faf9f7",
  "--color-secondary": "#4a8f6e",
  "--color-secondary-foreground": "#faf9f7",
  "--color-muted": "#f2f0ec",
  "--color-muted-foreground": "#6b5c4d",
  "--color-accent": "#e8e4dc",
  "--color-accent-foreground": "#22573e",
  "--color-destructive": "#b54545",
  "--color-destructive-foreground": "#faf9f7",
  "--color-border": "#d4d0c8",
  "--color-input": "#d4d0c8",
  "--color-ring": "#22573e",
  // Chart colors
  "--color-chart-1": "#3d7a5a",
  "--color-chart-2": "#a67c52",
  "--color-chart-3": "#6b8e5c",
  "--color-chart-4": "#b5a078",
  "--color-chart-5": "#4a8f7a",
};

/**
 * Resolve CSS variables in an SVG element to actual color values.
 * This is necessary for PDF/PNG export since svg2pdf.js and canvas
 * cannot interpret CSS custom properties.
 */
function resolveCssVariables(svgElement: SVGElement): SVGElement {
  // Clone the SVG to avoid modifying the original
  const svgClone = svgElement.cloneNode(true) as SVGElement;

  // Helper to resolve a CSS variable value
  const resolveVar = (value: string): string => {
    if (!value || !value.includes("var(")) return value;

    // Handle var() references
    return value.replace(
      /var\(--([^,)]+)(?:,\s*([^)]+))?\)/g,
      (match, varName, fallback) => {
        const cssVarName = `--${varName}`;
        // Use color map lookup
        const resolved = COLOR_MAP[cssVarName];
        return resolved || fallback || match;
      }
    );
  };

  // Helper to resolve color-mix() to a solid color
  const resolveColorMix = (value: string): string => {
    if (!value.includes("color-mix")) return value;

    // For color-mix with transparency, extract the base color and apply opacity
    // color-mix(in oklch, var(--color-primary) 10%, transparent) -> rgba version
    const match = value.match(
      /color-mix\(in\s+\w+,\s*([^,]+)\s+(\d+)%,\s*transparent\)/
    );
    if (match) {
      const baseColor = resolveVar(match[1].trim());
      const percentage = parseInt(match[2], 10) / 100;

      // Convert hex to rgba with opacity
      if (baseColor.startsWith("#")) {
        const r = parseInt(baseColor.slice(1, 3), 16);
        const g = parseInt(baseColor.slice(3, 5), 16);
        const b = parseInt(baseColor.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${percentage})`;
      }
      // Fallback: forest green with opacity
      return `rgba(34, 87, 62, ${percentage})`;
    }
    return value;
  };

  // Attributes that may contain color values
  const colorAttributes = [
    "fill",
    "stroke",
    "stop-color",
    "flood-color",
    "lighting-color",
  ];

  // Walk through all elements in the cloned SVG
  const processElement = (element: Element) => {
    // Process color attributes
    for (const attr of colorAttributes) {
      const value = element.getAttribute(attr);
      if (value && (value.includes("var(") || value.includes("color-mix"))) {
        let resolved = resolveVar(value);
        resolved = resolveColorMix(resolved);
        element.setAttribute(attr, resolved);
      }
    }

    // Process inline styles
    if (element instanceof SVGElement || element instanceof HTMLElement) {
      const style = element.getAttribute("style");
      if (style && (style.includes("var(") || style.includes("color-mix"))) {
        let resolved = resolveVar(style);
        resolved = resolveColorMix(resolved);
        element.setAttribute("style", resolved);
      }
    }

    // Recursively process children
    for (const child of element.children) {
      processElement(child);
    }
  };

  processElement(svgClone);
  return svgClone;
}

/**
 * Export SVG element to PDF using jsPDF and svg2pdf.js
 */
export async function exportToPDF(
  svgElement: SVGElement,
  options: ExportOptions
): Promise<void> {
  // Dynamic imports to defer heavy libraries until user clicks export
  const [{ jsPDF }, svg2pdfModule] = await Promise.all([
    import("jspdf"),
    import("svg2pdf.js"),
  ]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const svg2pdf = svg2pdfModule.svg2pdf || (svg2pdfModule as any).default;

  const { title, orientation, includeMetadata = true, scale = 1 } = options;

  // Resolve CSS variables before export
  const resolvedSvg = resolveCssVariables(svgElement);

  // Get SVG dimensions
  const bbox = (svgElement as SVGGraphicsElement).getBBox();
  const width = bbox.width * scale;
  const height = bbox.height * scale;

  // Determine page size based on orientation
  // Use A4 by default, but adjust if needed for large charts
  const pageWidth = orientation === "landscape" ? 297 : 210; // mm
  const pageHeight = orientation === "landscape" ? 210 : 297; // mm

  // Create new PDF with appropriate orientation
  const pdf = new jsPDF({
    orientation,
    unit: "mm",
    format: "a4",
  });

  // Add metadata if requested
  if (includeMetadata) {
    pdf.setProperties({
      title: `Vamsa - ${title}`,
      subject: "Family Tree Chart",
      author: "Vamsa",
      creator: "Vamsa Chart Export",
    });

    // Add title and date to PDF
    pdf.setFontSize(16);
    pdf.text(title, 10, 15);

    pdf.setFontSize(10);
    const dateStr = new Date().toLocaleDateString();
    pdf.text(`Generated on ${dateStr}`, 10, 22);
  }

  // Calculate the position to center the SVG on the page
  const marginTop = includeMetadata ? 30 : 10;
  const availableWidth = pageWidth - 20; // 10mm margins
  const availableHeight = pageHeight - marginTop - 10;

  // Scale SVG to fit page while maintaining aspect ratio
  const svgAspectRatio = width / height;
  const pageAspectRatio = availableWidth / availableHeight;

  let svgWidth: number;
  let svgHeight: number;

  if (svgAspectRatio > pageAspectRatio) {
    // SVG is wider than page
    svgWidth = availableWidth;
    svgHeight = availableWidth / svgAspectRatio;
  } else {
    // SVG is taller than page
    svgHeight = availableHeight;
    svgWidth = availableHeight * svgAspectRatio;
  }

  const x = (pageWidth - svgWidth) / 2;
  const y = marginTop;

  try {
    // Convert SVG to PDF using the resolved SVG
    await svg2pdf(resolvedSvg, pdf, {
      x,
      y,
      width: svgWidth,
      height: svgHeight,
    });

    // Save the PDF
    const filename = `vamsa-${title.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.pdf`;
    pdf.save(filename);
  } catch (error) {
    console.error("Error exporting to PDF:", error);
    throw new Error("Failed to export chart to PDF");
  }
}

/**
 * Export SVG element to PNG using canvas approach
 */
export function exportToPNG(
  svgElement: SVGElement,
  filename: string,
  scale: number = 2
): void {
  try {
    // Create a canvas element
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Could not get canvas context");
    }

    // Get SVG dimensions and apply scale
    const bbox = (svgElement as SVGGraphicsElement).getBBox();
    const width = bbox.width * scale;
    const height = bbox.height * scale;

    // Set canvas dimensions
    canvas.width = width;
    canvas.height = height;

    // Resolve CSS variables before export
    const svgClone = resolveCssVariables(svgElement);

    // Set explicit width and height attributes on the cloned SVG
    svgClone.setAttribute("width", width.toString());
    svgClone.setAttribute("height", height.toString());

    // Serialize SVG to string
    const svgData = new XMLSerializer().serializeToString(svgClone);

    // Create blob and URL
    const svgBlob = new Blob([svgData], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(svgBlob);

    // Load SVG as image and draw to canvas
    const img = new Image();
    img.onload = () => {
      // Fill white background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw the image
      ctx.drawImage(img, 0, 0, width, height);

      // Convert canvas to blob and download
      canvas.toBlob((blob) => {
        if (!blob) {
          throw new Error("Failed to create PNG blob");
        }

        const link = document.createElement("a");
        link.download = filename;
        link.href = URL.createObjectURL(blob);
        link.click();

        // Cleanup
        URL.revokeObjectURL(url);
        URL.revokeObjectURL(link.href);
      }, "image/png");
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      throw new Error("Failed to load SVG image");
    };

    img.src = url;
  } catch (error) {
    console.error("Error exporting to PNG:", error);
    throw new Error("Failed to export chart to PNG");
  }
}

/**
 * Export SVG element to SVG file
 */
export function exportToSVG(svgElement: SVGElement, filename: string): void {
  try {
    // Resolve CSS variables before export so the SVG works standalone
    const svgClone = resolveCssVariables(svgElement);

    // Ensure the SVG has proper xmlns attributes
    svgClone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    svgClone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");

    // Serialize SVG to string
    const svgData = new XMLSerializer().serializeToString(svgClone);

    // Create blob and download
    const svgBlob = new Blob([svgData], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(svgBlob);

    const link = document.createElement("a");
    link.download = filename;
    link.href = url;
    link.click();

    // Cleanup
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error exporting to SVG:", error);
    throw new Error("Failed to export chart to SVG");
  }
}
