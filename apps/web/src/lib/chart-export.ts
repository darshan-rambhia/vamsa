import { jsPDF } from "jspdf";

export interface ExportOptions {
  title: string;
  orientation: "portrait" | "landscape";
  includeMetadata?: boolean;
  scale?: number;
}

/**
 * Export SVG element to PDF using jsPDF and svg2pdf.js
 */
export async function exportToPDF(
  svgElement: SVGElement,
  options: ExportOptions
): Promise<void> {
  // Dynamic import to handle CommonJS module
  const svg2pdfModule = await import("svg2pdf.js");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const svg2pdf = svg2pdfModule.svg2pdf || (svg2pdfModule as any).default;

  const { title, orientation, includeMetadata = true, scale = 1 } = options;

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
    // Convert SVG to PDF
    await svg2pdf(svgElement, pdf, {
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

    // Clone the SVG to avoid modifying the original
    const svgClone = svgElement.cloneNode(true) as SVGElement;

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
    // Clone the SVG to avoid modifying the original
    const svgClone = svgElement.cloneNode(true) as SVGElement;

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
