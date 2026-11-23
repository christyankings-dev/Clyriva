function download(filename: string, content: BlobPart, mime: string): void {
  const blob = new Blob([content], {
    type: mime,
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export { download };
