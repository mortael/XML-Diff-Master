# XML Diff Master (Offline Edition)

A powerful, browser-based XML comparison tool designed for developers. It runs entirely in the browser (single-file HTML) and supports robust formatting, sorting, and diffing of complex XML files.

## 🚀 Features

### 🔍 Advanced Diffing
- **Side-by-Side Comparison**: Edit "Original" and "Modified" XMLs and see differences instantly.
- **Smart Diff**: Ignores insignificant whitespace (optional) but preserves meaningful formatting in mixed content.
- **Visual Indicators**: Color-coded additions, deletions, and modifications.

### 🛠️ Robust Formatting & Sorting
- **Intelligent Formatting**: 
  - Handles **Mixed Content** (text + tags) correctly by preserving whitespace within text blocks.
  - **Normalize Whitespace** option: Collapses formatting-induced newlines in mixed content to ensure clean diffs against minified files.
- **Attribute Sorting**: Sorts XML attributes alphabetically for consistent comparison.
- **Tag Sorting**: Sorts child elements (structure-only) to help compare logically equivalent but unordered XMLs.
- **Preservation**: Correctly handles `<![CDATA[...]]>`, `<!DOCTYPE ...>`, comments, and XML declarations.

### ⚙️ User-Centric Workflow
- **Offline Ready**: The entire app is contained in `index.html`. No build step or server required.
- **File Persistence**: Remembers the filenames you uploaded or dropped, allowing for easy "Save Back" workflow.
- **Tri-State Auto-Formatting**:
  - **None**: strict manual control.
  - **On Paste**: Automatically formats pasted content (Defaut).
  - **Always**: Formats on Paste, Drag & Drop, and File Load.
- **Granular Actions**: Apply Format/Sort to **Left**, **Right**, or **Both** editors.

## 📦 Installation & Usage

### Online / CDN Mode (Default)
1. Simply open `index.html` in any modern web browser.
2. It will load React, Tailwind, and other dependencies from `unpkg.com` and `cdn.tailwindcss.com`.

### Completely Offline Mode
To use without an internet connection:
1. Open `index.html`.
2. Look at the comments in the `<head>` section.
3. Download the listed libraries (React, ReactDOM, Babel, Tailwind, Diff) into a `lib/` folder.
4. Uncomment the "Offline Mode" script tags in `index.html`.

## 🎮 How to Use

1. **Load Data**: Drag & drop XML files, click the Upload icon, or paste text.
2. **Settings**: Click the Gear icon to configure:
   - **Normalize Mixed Content**: Enable this if comparing a "Pretty" file against a "Minified" file to ignore line-break differences.
   - **Auto-Format**: Choose when the tool should prettify your input.
3. **Format / Sort**:
   - Click the **Format** button to indent and beautify.
   - Click the **Sort** button to alphabetize attributes and elements.
   - Use the **Arrow** next to the button to apply to only Left or Right side.
4. **Compare**: Switch to "Diff" view (top right) to see the changes.
5. **Save**: Click the Download icon to save your changes back to disk.

## 🚀 GitHub Pages Deployment

This project includes a GitHub Actions workflow that automatically builds and deploys the application to GitHub Pages.

### Enabling GitHub Pages

To enable GitHub Pages for your repository:

1. Go to your repository **Settings**
2. Navigate to **Pages** in the left sidebar
3. Under **Build and deployment**:
   - Set **Source** to "GitHub Actions"
4. The workflow will automatically trigger on:
   - Every push to the `main` branch
   - Manual trigger via the Actions tab (workflow_dispatch)

Once enabled, your site will be available at: `https://<username>.github.io/<repository-name>/`

The workflow:
- Installs Node.js dependencies
- Builds the project using `npm run build`
- Deploys the contents of the `dist` folder to GitHub Pages

## 📄 License
MIT
