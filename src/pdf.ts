import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { safePdfFilename } from "./report";

export async function exportReportPdf(element: HTMLElement, experimentName: string, studentName: string): Promise<void> {
  const canvas = await html2canvas(element, { backgroundColor: "#ffffff", scale: 2, useCORS: true });
  const pdf = new jsPDF("p", "mm", "a4");
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 12;
  const printedWidth = pageWidth - margin * 2;
  const printedHeight = (canvas.height * printedWidth) / canvas.width;
  const image = canvas.toDataURL("image/png");
  let position = margin;
  let remaining = printedHeight;
  pdf.addImage(image, "PNG", margin, position, printedWidth, printedHeight);
  remaining -= pageHeight - margin * 2;
  while (remaining > 0) {
    position = margin - (printedHeight - remaining);
    pdf.addPage();
    pdf.addImage(image, "PNG", margin, position, printedWidth, printedHeight);
    remaining -= pageHeight - margin * 2;
  }
  pdf.save(safePdfFilename(experimentName, studentName));
}
