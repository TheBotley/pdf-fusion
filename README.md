# PDF Fusion

PDF Fusion is a free, static website for combining supported files into one downloadable PDF. It runs in the browser and is designed to be hosted on GitHub Pages.

## Features

- Add multiple files by browsing or drag and drop.
- Reorder files before merging.
- Remove individual files or clear the list.
- Merge existing PDFs without rasterizing their pages.
- Convert images into PDF pages.
- Convert common Office and text documents into readable PDF text pages.
- Choose the output PDF filename and download the result.
- No account, backend, upload endpoint, or API key.

## Supported formats

- PDF
- Images: JPG/JPEG, PNG, WEBP, GIF (first frame), BMP, SVG (when supported by the browser)
- Documents: DOCX, ODT, RTF
- Spreadsheets: XLSX, XLS
- Presentations: PPTX
- Text and data: TXT, MD, CSV, JSON, XML, LOG, YAML, YML, HTML, HTM

### Conversion notes

PDF pages are copied into the output PDF and normally retain their original text and vector quality. Images are converted to PDF pages; very large images are downscaled to a maximum dimension of 2600 pixels. Office and text formats are converted to readable text pages. Complex page layouts, fonts, charts, images embedded inside Office documents, animations, formulas as visual layouts, and other rich formatting may not be preserved. PPTX conversion extracts slide text only. Excel sheets are converted to CSV-like text. GIF conversion uses the first frame.

This tool cannot convert every possible file format. Password-protected PDFs, legacy binary Office formats such as DOC/PPT, audio/video, archives, and proprietary formats are not supported directly. Convert those files to a supported format first.

## Run locally

1. Download or clone this repository.
2. Open `index.html` in a recent version of Chrome, Edge, Firefox, or Safari.
3. Keep an Internet connection available so the JavaScript libraries can load from their CDNs.

There is no application server. The content of local files is read and processed in the browser; the files are not uploaded by PDF Fusion. The page does load its libraries and web fonts from third-party CDNs.

## Publish free with GitHub Pages

1. Sign in to [GitHub](https://github.com/) and create a new **Public** repository, for example `pdf-fusion`.
2. In the repository, choose **Add file → Upload files**.
3. Upload `index.html`, `styles.css`, `app.js`, `.nojekyll`, and `README.md` to the repository root.
4. Commit the uploaded files to the `main` branch.
5. Open **Settings → Pages**.
6. Under **Build and deployment**, select **Deploy from a branch**.
7. Select branch **main** and folder **/(root)**, then save.
8. After GitHub finishes publishing, the website will be available at:

   `https://YOUR-GITHUB-USERNAME.github.io/pdf-fusion/`

Replace `YOUR-GITHUB-USERNAME` with your GitHub username. Keep `index.html` at the repository root. Future changes can be published by uploading the updated files and committing them.

## Notes

- GitHub Pages hosts the static website only; the merge itself happens on each visitor's device.
- Large files may use significant browser memory and processing time. The browser or device may impose its own limits.
- The resulting PDF is not guaranteed to fit any particular AI service's upload limit.
