import html2canvas from 'html2canvas';

export async function exportElementAsPNG(element: HTMLElement, filename: string) {
  const canvas = await html2canvas(element, {
    backgroundColor: '#ffffff',
    scale: 2,
    logging: false,
  });
  const link = document.createElement('a');
  link.download = `${filename}.png`;
  link.href = canvas.toDataURL('image/png');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
