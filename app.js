/* PDF Fusion — client-side file combiner */
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const state = { items: [], busy: false, outputUrl: null };
  const MAX_FILE_COUNT = 150;
  const MB = 1024 * 1024;
  const ACCEPTED = new Set([
    'pdf', 'jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg',
    'docx', 'xlsx', 'xls', 'pptx', 'odt', 'rtf',
    'txt', 'md', 'csv', 'json', 'xml', 'log', 'yaml', 'yml', 'html', 'htm'
  ]);

  const el = {
    fileInput: $('fileInput'), dropzone: $('dropzone'), browseBtn: $('browseBtn'),
    fileList: $('fileList'), emptyState: $('emptyState'), countBadge: $('countBadge'),
    fileListHint: $('fileListHint'), clearBtn: $('clearBtn'), buildBtn: $('buildBtn'),
    buildButtonText: $('buildButtonText'), outputName: $('outputName'), notice: $('notice'),
    progressBox: $('progressBox'), progressLabel: $('progressLabel'),
    progressPercent: $('progressPercent'), progressFill: $('progressFill'),
    resultBox: $('resultBox'), resultMessage: $('resultMessage'), downloadLink: $('downloadLink')
  };

  const extensionOf = (name) => (String(name).split('.').pop() || '').toLowerCase();
  const formatBytes = (bytes) => {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
    if (bytes < MB) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / MB).toFixed(2)} MB`;
  };

  function showNotice(message, type = 'error') {
    el.notice.textContent = message;
    el.notice.className = `notice visible${type === 'success' ? ' success' : ''}`;
  }

  function hideNotice() {
    el.notice.textContent = '';
    el.notice.className = 'notice';
  }

  function clearResult() {
    el.resultBox.classList.add('hidden');
    if (state.outputUrl) URL.revokeObjectURL(state.outputUrl);
    state.outputUrl = null;
  }

  function iconFor(item) {
    if (item.kind === 'pdf') return ['PDF', 'type-pdf'];
    if (item.kind === 'image') return ['IMG', 'type-image'];
    if (['DOCX', 'XLS', 'PPT', 'ODT', 'RTF'].includes(item.badge)) return [item.badge, 'type-office'];
    return [item.badge || 'FILE', 'type-text'];
  }

  function render() {
    el.fileList.innerHTML = '';
    const count = state.items.length;
    el.emptyState.classList.toggle('hidden', count > 0);
    el.countBadge.textContent = `${count} ${count === 1 ? 'file' : 'files'}`;
    el.fileListHint.textContent = count
      ? 'Drag files to reorder them. This will be the order in your PDF.'
      : 'Your files will appear here in the order they will be merged.';
    el.clearBtn.disabled = count === 0 || state.busy;
    el.buildBtn.disabled = count === 0 || state.busy;

    state.items.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'file-item';
      row.draggable = !state.busy;
      row.dataset.id = item.id;

      const [badge, className] = iconFor(item);
      const icon = document.createElement('div');
      icon.className = `file-type-icon ${className}`;
      icon.textContent = badge;

      const main = document.createElement('div');
      main.className = 'file-main';
      const name = document.createElement('div');
      name.className = 'file-name';
      name.textContent = item.name;
      name.title = item.name;
      const meta = document.createElement('div');
      meta.className = 'file-meta';
      const detail = item.kind === 'pdf'
        ? `${item.pages} ${item.pages === 1 ? 'page' : 'pages'}`
        : item.kind === 'image' ? 'Image · converted to a PDF page' : 'Document · converted to readable text';
      meta.textContent = `${detail} · ${formatBytes(item.size)}`;
      main.append(name, meta);

      const actions = document.createElement('div');
      actions.className = 'file-actions';
      const up = document.createElement('button');
      up.type = 'button'; up.className = 'order-button'; up.textContent = '↑';
      up.title = 'Move up'; up.setAttribute('aria-label', `Move ${item.name} up`);
      up.disabled = index === 0 || state.busy;
      up.addEventListener('click', () => moveItem(index, index - 1));

      const down = document.createElement('button');
      down.type = 'button'; down.className = 'order-button'; down.textContent = '↓';
      down.title = 'Move down'; down.setAttribute('aria-label', `Move ${item.name} down`);
      down.disabled = index === count - 1 || state.busy;
      down.addEventListener('click', () => moveItem(index, index + 1));

      const remove = document.createElement('button');
      remove.type = 'button'; remove.className = 'remove-button'; remove.textContent = '×';
      remove.title = 'Remove file'; remove.setAttribute('aria-label', `Remove ${item.name}`);
      remove.disabled = state.busy;
      remove.addEventListener('click', () => {
        state.items.splice(index, 1);
        clearResult(); hideNotice(); render();
      });
      actions.append(up, down, remove);
      row.append(icon, main, actions);

      row.addEventListener('dragstart', (event) => {
        row.classList.add('dragging');
        event.dataTransfer.setData('text/plain', item.id);
        event.dataTransfer.effectAllowed = 'move';
      });
      row.addEventListener('dragend', () => row.classList.remove('dragging'));
      row.addEventListener('dragover', (event) => {
        event.preventDefault();
        row.classList.add('drag-target');
      });
      row.addEventListener('dragleave', () => row.classList.remove('drag-target'));
      row.addEventListener('drop', (event) => {
        event.preventDefault();
        row.classList.remove('drag-target');
        const fromId = event.dataTransfer.getData('text/plain');
        const from = state.items.findIndex((entry) => entry.id === fromId);
        if (from >= 0 && from !== index) moveItem(from, index);
      });
      el.fileList.appendChild(row);
    });
  }

  function moveItem(from, to) {
    if (state.busy || to < 0 || to >= state.items.length) return;
    const [item] = state.items.splice(from, 1);
    state.items.splice(to, 0, item);
    clearResult(); render();
  }

  function addItem(item) {
    if (state.items.length >= MAX_FILE_COUNT) throw new Error(`You can merge up to ${MAX_FILE_COUNT} files at a time.`);
    item.id = `file-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    state.items.push(item);
    clearResult(); render();
  }

  function cleanHtml(html) {
    const parsed = new DOMParser().parseFromString(html, 'text/html');
    parsed.querySelectorAll('script,style,noscript,iframe,svg,canvas,nav,footer,header,form').forEach((node) => node.remove());
    return (parsed.body.innerText || parsed.body.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
  }

  async function extractPptx(buffer) {
    if (!window.JSZip) throw new Error('The PowerPoint reader could not be loaded. Refresh the page and try again.');
    const zip = await JSZip.loadAsync(buffer);
    const paths = Object.keys(zip.files)
      .filter((path) => /^ppt\/slides\/slide\d+\.xml$/.test(path))
      .sort((a, b) => Number(a.match(/slide(\d+)/)[1]) - Number(b.match(/slide(\d+)/)[1]));
    const chunks = [];
    for (let i = 0; i < paths.length; i++) {
      const xml = await zip.files[paths[i]].async('text');
      const doc = new DOMParser().parseFromString(xml, 'application/xml');
      const paragraphs = [...doc.getElementsByTagName('a:p')]
        .map((paragraph) => [...paragraph.getElementsByTagName('a:t')].map((node) => node.textContent).join(''))
        .filter(Boolean);
      chunks.push(`SLIDE ${i + 1}\n${paragraphs.join('\n')}`);
    }
    return chunks.join('\n\n');
  }

  async function extractOdt(buffer) {
    if (!window.JSZip) throw new Error('The OpenDocument reader could not be loaded. Refresh the page and try again.');
    const zip = await JSZip.loadAsync(buffer);
    const contentFile = zip.file('content.xml');
    if (!contentFile) throw new Error('The ODT document has no readable content.xml file.');
    const xml = await contentFile.async('text');
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    return (doc.documentElement.textContent || '').replace(/\s+/g, ' ').trim();
  }

  async function parseFile(file) {
    const ext = extensionOf(file.name);
    if (!ACCEPTED.has(ext)) {
      throw new Error(`.${ext || 'unknown'} files are not supported. Please convert this file to one of the listed formats first.`);
    }
    const buffer = await file.arrayBuffer();

    if (ext === 'pdf') {
      if (!window.PDFLib) throw new Error('The PDF library could not be loaded. Check your Internet connection and refresh the page.');
      const pdf = await PDFLib.PDFDocument.load(buffer.slice(0), { ignoreEncryption: false });
      return { name: file.name, kind: 'pdf', data: buffer, size: file.size, pages: pdf.getPageCount() };
    }

    if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg'].includes(ext)) {
      return { name: file.name, kind: 'image', data: file, size: file.size, ext };
    }

    let content = '';
    let badge = 'TXT';
    if (ext === 'docx') {
      if (!window.mammoth) throw new Error('The Word reader could not be loaded. Refresh the page and try again.');
      const result = await mammoth.extractRawText({ arrayBuffer: buffer });
      content = result.value; badge = 'DOCX';
    } else if (ext === 'xlsx' || ext === 'xls') {
      if (!window.XLSX) throw new Error('The spreadsheet reader could not be loaded. Refresh the page and try again.');
      const workbook = XLSX.read(buffer, { type: 'array' });
      content = workbook.SheetNames.map((sheetName) => {
        const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName]);
        return `SHEET: ${sheetName}\n${csv}`;
      }).join('\n\n');
      badge = 'XLS';
    } else if (ext === 'pptx') {
      content = await extractPptx(buffer); badge = 'PPT';
    } else if (ext === 'odt') {
      content = await extractOdt(buffer); badge = 'ODT';
    } else if (ext === 'rtf') {
      content = new TextDecoder().decode(buffer)
        .replace(/\\'[0-9a-f]{2}/gi, ' ')
        .replace(/\\[a-z]+-?\d* ?/gi, ' ')
        .replace(/[{}]/g, '')
        .replace(/\s+/g, ' ').trim();
      badge = 'RTF';
    } else if (ext === 'html' || ext === 'htm') {
      content = cleanHtml(new TextDecoder().decode(buffer)); badge = 'HTML';
    } else {
      content = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
      badge = ext === 'csv' ? 'CSV' : 'TXT';
    }

    if (!content.trim()) content = '(No readable text was found in this file.)';
    return { name: file.name, kind: 'text', content, size: file.size, badge };
  }

  async function handleFiles(fileList) {
    if (state.busy || !fileList?.length) return;
    hideNotice();
    const files = Array.from(fileList);
    const errors = [];
    for (const file of files) {
      if (state.items.length >= MAX_FILE_COUNT) {
        errors.push(`The limit of ${MAX_FILE_COUNT} files has been reached.`);
        break;
      }
      try {
        const item = await parseFile(file);
        addItem(item);
      } catch (error) {
        errors.push(`${file.name}: ${error.message || error}`);
      }
    }
    el.fileInput.value = '';
    if (errors.length) showNotice(errors.slice(0, 5).join('  •  ') + (errors.length > 5 ? `  •  And ${errors.length - 5} more.` : ''));
    else if (files.length) showNotice(`${files.length} ${files.length === 1 ? 'file was' : 'files were'} added successfully.`, 'success');
  }

  function sanitizePdfText(text) {
    return String(text)
      .replace(/\r/g, '')
      .replace(/\t/g, '    ')
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2013\u2014]/g, '-')
      .replace(/\u2026/g, '...')
      .replace(/[^\u0000-\u00FF]/g, '?');
  }

  function wrapText(text, font, fontSize, maxWidth) {
    const lines = [];
    const paragraphs = sanitizePdfText(text).split('\n');
    for (const paragraph of paragraphs) {
      if (!paragraph.trim()) { lines.push(''); continue; }
      const words = paragraph.split(/\s+/);
      let line = '';
      for (const word of words) {
        const candidate = line ? `${line} ${word}` : word;
        if (line && font.widthOfTextAtSize(candidate, fontSize) > maxWidth) {
          lines.push(line); line = word;
        } else {
          line = candidate;
        }
      }
      if (line) lines.push(line);
    }
    return lines;
  }

  async function addTextDocument(pdfDoc, item, fonts) {
    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const margin = 48;
    const titleSize = 13;
    const bodySize = 9.5;
    const lineHeight = 13.5;
    const maxWidth = pageWidth - margin * 2;
    const title = sanitizePdfText(item.name).slice(0, 110);
    const lines = wrapText(item.content, fonts.regular, bodySize, maxWidth);
    let page = null;
    let y = 0;

    const newPage = () => {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      page.drawText(title, { x: margin, y: pageHeight - margin, size: titleSize, font: fonts.bold });
      page.drawLine({ start: { x: margin, y: pageHeight - margin - 12 }, end: { x: pageWidth - margin, y: pageHeight - margin - 12 }, thickness: 0.7, color: PDFLib.rgb(0.76, 0.77, 0.81) });
      y = pageHeight - margin - 34;
    };
    newPage();

    for (const line of lines) {
      if (y < margin + lineHeight) newPage();
      if (line) page.drawText(line, { x: margin, y, size: bodySize, font: fonts.regular, maxWidth });
      y -= lineHeight;
    }
  }

  async function imageBytesAsPng(file) {
    let bitmap;
    try {
      if ('createImageBitmap' in window) {
        bitmap = await createImageBitmap(file);
      } else {
        bitmap = await new Promise((resolve, reject) => {
          const url = URL.createObjectURL(file);
          const image = new Image();
          image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
          image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('This image could not be decoded by your browser.')); };
          image.src = url;
        });
      }
      const width = bitmap.width || bitmap.naturalWidth;
      const height = bitmap.height || bitmap.naturalHeight;
      if (!width || !height) throw new Error('This image has invalid dimensions.');
      const maxDimension = 2600;
      const scale = Math.min(1, maxDimension / Math.max(width, height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      const context = canvas.getContext('2d', { alpha: false });
      if (!context) throw new Error('Your browser could not prepare this image.');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise((resolve, reject) => canvas.toBlob((result) => result ? resolve(result) : reject(new Error('Image conversion failed.')), 'image/png'));
      return { bytes: new Uint8Array(await blob.arrayBuffer()), width: canvas.width, height: canvas.height };
    } finally {
      if (bitmap && typeof bitmap.close === 'function') bitmap.close();
    }
  }

  async function addImagePage(pdfDoc, item) {
    const image = await imageBytesAsPng(item.data);
    const embedded = await pdfDoc.embedPng(image.bytes);
    const landscape = image.width > image.height;
    const pageSize = landscape ? [841.89, 595.28] : [595.28, 841.89];
    const margin = 34;
    const availableWidth = pageSize[0] - margin * 2;
    const availableHeight = pageSize[1] - margin * 2;
    const scale = Math.min(availableWidth / embedded.width, availableHeight / embedded.height);
    const width = embedded.width * scale;
    const height = embedded.height * scale;
    const page = pdfDoc.addPage(pageSize);
    page.drawImage(embedded, {
      x: (pageSize[0] - width) / 2,
      y: (pageSize[1] - height) / 2,
      width,
      height
    });
  }

  function setProgress(percent, label) {
    const value = Math.max(0, Math.min(100, Math.round(percent)));
    el.progressBox.classList.remove('hidden');
    el.progressLabel.textContent = label;
    el.progressPercent.textContent = `${value}%`;
    el.progressFill.style.width = `${value}%`;
  }

  function safeFileName(value) {
    let name = String(value || 'merged-files.pdf').trim();
    name = name.replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, ' ');
    if (!name) name = 'merged-files.pdf';
    if (!name.toLowerCase().endsWith('.pdf')) name += '.pdf';
    return name.slice(0, 84);
  }

  async function buildPdf() {
    if (!state.items.length || state.busy) return;
    state.busy = true;
    hideNotice();
    clearResult();
    el.buildButtonText.textContent = 'Merging…';
    render();
    setProgress(0, 'Preparing your PDF…');

    try {
      if (!window.PDFLib) throw new Error('The PDF library could not be loaded. Check your Internet connection and refresh the page.');
      const pdfDoc = await PDFLib.PDFDocument.create();
      const fonts = {
        regular: await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica),
        bold: await pdfDoc.embedFont(PDFLib.StandardFonts.HelveticaBold)
      };

      for (let index = 0; index < state.items.length; index++) {
        const item = state.items[index];
        const start = (index / state.items.length) * 88;
        setProgress(start, `Adding ${index + 1} of ${state.items.length}: ${item.name}`);

        if (item.kind === 'pdf') {
          const source = await PDFLib.PDFDocument.load(item.data.slice(0), { ignoreEncryption: false });
          const pages = await pdfDoc.copyPages(source, source.getPageIndices());
          pages.forEach((page) => pdfDoc.addPage(page));
        } else if (item.kind === 'image') {
          await addImagePage(pdfDoc, item);
        } else {
          await addTextDocument(pdfDoc, item, fonts);
        }
        setProgress(((index + 1) / state.items.length) * 88, `Added ${index + 1} of ${state.items.length} files`);
      }

      if (pdfDoc.getPageCount() === 0) throw new Error('No pages could be created from the selected files.');
      pdfDoc.setTitle('Merged files');
      pdfDoc.setCreator('PDF Fusion');
      setProgress(94, 'Finalizing PDF…');
      const bytes = await pdfDoc.save({ useObjectStreams: true });
      const blob = new Blob([bytes], { type: 'application/pdf' });
      state.outputUrl = URL.createObjectURL(blob);
      const fileName = safeFileName(el.outputName.value);
      el.downloadLink.href = state.outputUrl;
      el.downloadLink.download = fileName;
      el.resultMessage.textContent = `${pdfDoc.getPageCount()} pages · ${formatBytes(blob.size)}`;
      el.resultBox.classList.remove('hidden');
      el.outputName.value = fileName;
      setProgress(100, 'Your PDF is ready.');
    } catch (error) {
      console.error('PDF Fusion error:', error);
      showNotice(`Could not create the PDF: ${error.message || error}`);
      el.progressBox.classList.add('hidden');
    } finally {
      state.busy = false;
      el.buildButtonText.textContent = 'Merge into PDF';
      render();
    }
  }

  el.browseBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    el.fileInput.click();
  });
  el.dropzone.addEventListener('click', (event) => {
    if (event.target.closest('button')) return;
    el.fileInput.click();
  });
  el.dropzone.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      el.fileInput.click();
    }
  });
  el.fileInput.addEventListener('change', (event) => handleFiles(event.target.files));
  ['dragenter', 'dragover'].forEach((type) => el.dropzone.addEventListener(type, (event) => {
    event.preventDefault();
    el.dropzone.classList.add('dragover');
  }));
  ['dragleave', 'drop'].forEach((type) => el.dropzone.addEventListener(type, (event) => {
    event.preventDefault();
    el.dropzone.classList.remove('dragover');
  }));
  el.dropzone.addEventListener('drop', (event) => handleFiles(event.dataTransfer.files));
  el.clearBtn.addEventListener('click', () => {
    if (state.busy) return;
    state.items = [];
    clearResult(); hideNotice();
    el.progressBox.classList.add('hidden');
    render();
  });
  el.buildBtn.addEventListener('click', buildPdf);
  el.outputName.addEventListener('input', () => {
    if (state.outputUrl) clearResult();
  });

  render();
})();
