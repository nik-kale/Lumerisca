# Media Processing Guide

## Overview

Lumerisca v2.0 introduces comprehensive multi-modal media processing capabilities, allowing you to extract, analyze, and interact with various media types directly in your browser. All processing happens client-side for maximum privacy.

## Supported Media Types

### 1. YouTube Videos
Extract transcripts, chapters, and metadata from YouTube videos.

**Features:**
- Automatic transcript extraction in multiple languages
- Chapter detection from video descriptions
- Video metadata (title, author, duration, views)
- Clickable timestamps
- AI-powered summarization

**How to Use:**
1. **Right-click on YouTube link**: Select "Lumerisca: Summarize Video"
2. **On YouTube page**: Right-click anywhere → "Lumerisca: Summarize This Video"
3. Lumerisca will extract the transcript and generate a summary

**Supported URLs:**
- `https://www.youtube.com/watch?v=VIDEO_ID`
- `https://youtu.be/VIDEO_ID`

**Example Output:**
```
Video: "How to Build a RAG System"
Author: Tech Channel
Duration: 15:32

Chapters:
- 0:00: Introduction
- 2:15: Understanding RAG
- 8:30: Implementation
- 13:00: Conclusion

Summary: This video explains how to build a Retrieval-Augmented
Generation system...
```

### 2. PDF Documents
Extract and analyze text from PDF files.

**Features:**
- In-browser PDF text extraction (no server upload)
- Metadata extraction (title, author, keywords)
- Page-by-page navigation
- Full-text search within PDF
- Table detection
- Citation generation (APA, MLA, Chicago)
- Chat with PDF content

**How to Use:**
1. **Right-click on PDF link**: Select "Lumerisca: Summarize PDF"
2. **In sidepanel**: Upload PDF file using file picker
3. Ask questions about the PDF content

**File Limits:**
- Maximum size: 10MB
- All formats supported by PDF.js

**Example Queries:**
- "Summarize this PDF"
- "What are the key findings on page 5?"
- "Find all mentions of 'machine learning'"
- "Generate an APA citation for this document"

### 3. OCR (Text from Images)
Extract text from screenshots and images using Optical Character Recognition.

**Features:**
- In-browser OCR (Tesseract.js)
- 100+ language support
- Handwriting recognition
- Table extraction from images
- Confidence scoring
- Code detection and formatting

**How to Use:**
1. **Right-click on any image**: Select "Lumerisca: Extract Text (OCR)"
2. View extracted text with confidence level
3. Copy text to clipboard

**Supported Languages:**
- English (eng)
- Spanish (spa)
- French (fra)
- German (deu)
- Chinese Simplified (chi_sim)
- Chinese Traditional (chi_tra)
- Japanese (jpn)
- Korean (kor)
- Arabic (ara)
- And 90+ more languages

**Best Results:**
- Clear, high-contrast images
- Horizontal text (not rotated)
- Font size >= 12pt
- PNG or JPEG format

**Example Use Cases:**
- Extract text from screenshots
- Copy text from scanned documents
- Extract code from code screenshots
- Read text from memes or infographics

### 4. Image Analysis
AI-powered visual understanding of images and screenshots.

**Features:**
- Automatic analysis type detection
- UI/UX design analysis
- Code screenshot understanding
- Diagram and flowchart explanation
- Chart and graph interpretation
- Photo description

**How to Use:**
1. **Right-click on any image**: Select "Lumerisca: Analyze Image"
2. Receive detailed AI analysis

**Analysis Types:**

**UI/UX Design:**
- Layout and component identification
- Design pattern recognition
- Usability assessment
- Improvement suggestions

**Code Screenshots:**
- Programming language detection
- Code explanation
- Pattern identification
- Issue detection

**Diagrams:**
- Flow and structure description
- Component relationship mapping
- Process explanation

**Charts/Graphs:**
- Chart type identification
- Data trend analysis
- Key insight extraction

## Privacy & Security

### Client-Side Processing
All media processing happens in your browser:
- ✅ No data sent to external servers (except AI API)
- ✅ PDF.js runs locally
- ✅ Tesseract.js OCR runs locally
- ✅ No file uploads to third parties

### File Size Limits
To protect your browser from running out of memory:
- PDFs: 10MB maximum
- Images: 5MB maximum
- Audio: 50MB maximum

### Content Validation
All files are validated before processing:
- MIME type checking
- Magic number validation
- Sandboxed processing
- Executable content stripped from PDFs

### Rate Limiting
Media processing respects rate limits:
- OCR: 5 images per minute
- PDF: 2 documents per minute
- YouTube: 10 videos per minute

## Performance Tips

### YouTube Videos
- Transcript extraction is fast (<2 seconds)
- Long videos (>1 hour) may have large transcripts
- Choose appropriate language for best accuracy

### PDF Processing
- First page loads fastest
- Large PDFs (>100 pages) may take 10-30 seconds
- Scanned PDFs require OCR (slower)
- Text-based PDFs are fastest

### OCR
- Clear images process faster (<2 seconds)
- Blurry images may take 5-10 seconds
- Larger images take longer
- Compress images if possible

### Image Analysis
- Requires vision-capable AI model (GPT-4 Vision, Claude 3)
- Image is compressed before sending to AI
- Analysis quality depends on image clarity

## Troubleshooting

### "Failed to extract transcript"
**Causes:**
- Video has no captions
- Captions are disabled
- Video is private or restricted
- Network issue

**Solutions:**
- Check if video has captions on YouTube
- Try again in a few moments
- Verify internet connection

### "PDF file too large"
**Cause:** PDF exceeds 10MB limit

**Solutions:**
- Compress PDF using online tools
- Extract specific pages
- Split PDF into smaller files

### "OCR confidence very poor"
**Causes:**
- Image is blurry or low resolution
- Text is rotated or skewed
- Poor contrast
- Unusual font

**Solutions:**
- Use higher resolution image
- Ensure text is horizontal
- Increase image contrast
- Try different language setting

### "No text found in image"
**Causes:**
- Image contains no text
- Text is too small
- Image format not supported

**Solutions:**
- Verify image contains visible text
- Use larger image
- Convert to PNG or JPEG

## API Reference

### YouTube Extractor

```typescript
import { extractYouTubeData } from "@lumerisca/core";

const extraction = await extractYouTubeData(url, language);
// Returns: { metadata, transcript, chapters, fullText }
```

### PDF Extractor

```typescript
import { extractPdfFromFile, searchInPdf } from "@lumerisca/core";

const extraction = await extractPdfFromFile(file);
// Returns: { metadata, pages, fullText, pageCount }

const results = searchInPdf(extraction, "search term");
// Returns: [{ pageNumber, text, index }]
```

### OCR Engine

```typescript
import { extractFromImage, SUPPORTED_LANGUAGES } from "@lumerisca/core";

const result = await extractFromImage(file, { language: "eng" });
// Returns: { text, confidence, words, lines }
```

### Image Analyzer

```typescript
import {
  imageToDataUrl,
  compressImage,
  generateAnalysisPrompt
} from "@lumerisca/core";

const dataUrl = await imageToDataUrl(file);
const compressed = await compressImage(dataUrl);
const prompt = generateAnalysisPrompt({ analysisType: "ui_ux" });
```

## Keyboard Shortcuts

- `Ctrl+Shift+L` (Mac: `Cmd+Shift+L`): Toggle Lumerisca panel
- `Ctrl+V`: Paste image for OCR (in sidepanel)
- `Ctrl+U`: Upload file (in sidepanel)

## Best Practices

### For YouTube Videos
1. **Use for learning**: Get quick summaries of educational videos
2. **Reference chapters**: Jump to specific sections using timestamps
3. **Multi-language**: Change language for non-English videos

### For PDFs
1. **Ask specific questions**: More effective than full summary
2. **Reference page numbers**: "What does page 5 say about X?"
3. **Extract tables**: Use table detection for structured data

### For OCR
1. **Screenshot first**: Take clean screenshot before OCR
2. **Crop to text**: Remove unnecessary parts of image
3. **High contrast**: Ensure good contrast between text and background

### For Image Analysis
1. **Provide context**: Tell AI what to focus on
2. **High quality**: Use high-resolution images
3. **Clear subject**: Single clear subject per image

## Limitations

### YouTube
- ❌ Cannot process videos without captions
- ❌ Cannot download video files
- ❌ Age-restricted videos may not work
- ❌ Some videos block transcript access

### PDF
- ❌ 10MB file size limit
- ❌ Scanned PDFs may have imperfect text extraction
- ❌ Complex layouts may not preserve formatting
- ❌ Password-protected PDFs not supported

### OCR
- ❌ Accuracy varies by image quality
- ❌ Handwriting recognition is approximate
- ❌ Cannot handle severely rotated text
- ❌ Some fonts may not be recognized

### Image Analysis
- ❌ Requires vision-capable AI model
- ❌ Costs more tokens than text-only
- ❌ Quality depends on AI model capabilities
- ❌ Cannot analyze NSFW or prohibited content

## Future Enhancements

Planned for future versions:
- 🔮 Audio transcription from files
- 🔮 Real-time microphone transcription
- 🔮 Screenshot annotation tools
- 🔮 Video frame extraction
- 🔮 Animated GIF frame-by-frame analysis
- 🔮 Batch processing multiple files
- 🔮 Export extracted data (CSV, JSON)
- 🔮 Advanced table extraction with formatting
- 🔮 Automatic language detection for OCR

## Examples

### Example 1: Research Paper Analysis

```
1. Right-click PDF link → "Lumerisca: Summarize PDF"
2. Wait for extraction
3. Ask: "What are the main findings?"
4. Ask: "What methodology was used?"
5. Ask: "Generate an APA citation"
```

### Example 2: Code Screenshot to Text

```
1. Take screenshot of code
2. Right-click image → "Lumerisca: Extract Text (OCR)"
3. Copy extracted code
4. Ask: "Explain this code"
```

### Example 3: Tutorial Video Summary

```
1. On YouTube video page
2. Right-click → "Lumerisca: Summarize This Video"
3. Review chapter breakdown
4. Ask: "What are the key steps?"
5. Click timestamps to jump to sections
```

### Example 4: UI Design Critique

```
1. Right-click on design mockup
2. Select "Lumerisca: Analyze Image"
3. Review AI analysis of layout
4. Ask: "How can I improve this design?"
5. Ask: "What design patterns are used?"
```

## Getting Help

If you encounter issues with media processing:

1. Check this documentation
2. Review [Troubleshooting](#troubleshooting) section
3. Check browser console for errors
4. Report issues at https://github.com/anthropics/claude-code/issues

## Related Documentation

- [User Guide](./USER_GUIDE.md): Complete feature overview
- [API Reference](./API_REFERENCE.md): Technical API documentation
- [Security](../SECURITY.md): Security and privacy details
- [Roadmap](../ROADMAP.md): Future features and plans
