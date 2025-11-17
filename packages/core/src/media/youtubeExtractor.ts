/**
 * YouTube video transcript and metadata extraction
 * Supports extracting transcripts, chapters, and video metadata
 */

import { logger } from "../utils/logger.js";
import { LumeriscaError } from "../utils/errors.js";

const log = logger.scope("YouTubeExtractor");

export interface YouTubeTranscript {
  text: string;
  start: number;
  duration: number;
}

export interface YouTubeChapter {
  title: string;
  timestamp: number;
  duration?: number;
}

export interface YouTubeMetadata {
  videoId: string;
  title: string;
  author: string;
  duration: number;
  description: string;
  publishDate?: string;
  viewCount?: number;
}

export interface YouTubeExtraction {
  metadata: YouTubeMetadata;
  transcript: YouTubeTranscript[];
  chapters: YouTubeChapter[];
  fullText: string;
  summary?: string;
}

/**
 * Extract YouTube video ID from URL
 */
export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/, // Direct video ID
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Fetch YouTube video transcript
 * Uses YouTube's timedtext API (caption tracks)
 */
export async function fetchTranscript(
  videoId: string,
  language: string = "en"
): Promise<YouTubeTranscript[]> {
  log.info("Fetching transcript", { videoId, language });

  try {
    // First, get the video page to extract caption tracks
    const videoPageUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const videoPageResponse = await fetch(videoPageUrl);

    if (!videoPageResponse.ok) {
      throw new LumeriscaError(
        `Failed to fetch video page: ${videoPageResponse.status}`,
        "MEDIA_ERROR"
      );
    }

    const html = await videoPageResponse.text();

    // Extract caption tracks from the page
    const captionTracksMatch = html.match(
      /"captionTracks":(\[.*?\])/
    );

    if (!captionTracksMatch) {
      // Try to extract from initial player response
      const playerResponseMatch = html.match(
        /var ytInitialPlayerResponse = ({.+?});/
      );

      if (!playerResponseMatch) {
        throw new LumeriscaError(
          "No captions available for this video",
          "MEDIA_ERROR"
        );
      }

      try {
        const playerResponse = JSON.parse(playerResponseMatch[1]);
        const captions =
          playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

        if (!captions || captions.length === 0) {
          throw new LumeriscaError(
            "No captions available for this video",
            "MEDIA_ERROR"
          );
        }

        // Find the requested language or default to first available
        let captionTrack = captions.find((track: any) =>
          track.languageCode === language
        );

        if (!captionTrack) {
          log.warn(`Language ${language} not found, using ${captions[0].languageCode}`);
          captionTrack = captions[0];
        }

        const transcriptUrl = captionTrack.baseUrl;
        return await fetchTranscriptFromUrl(transcriptUrl);
      } catch (error) {
        throw new LumeriscaError(
          `Failed to parse player response: ${error}`,
          "MEDIA_ERROR"
        );
      }
    }

    const captionTracks = JSON.parse(captionTracksMatch[1]);

    // Find the requested language or default to first available
    let captionTrack = captionTracks.find(
      (track: any) => track.languageCode === language
    );

    if (!captionTrack) {
      log.warn(`Language ${language} not found, using ${captionTracks[0].languageCode}`);
      captionTrack = captionTracks[0];
    }

    const transcriptUrl = captionTrack.baseUrl;
    return await fetchTranscriptFromUrl(transcriptUrl);
  } catch (error) {
    if (error instanceof LumeriscaError) {
      throw error;
    }

    log.error("Failed to fetch transcript", { error, videoId });
    throw new LumeriscaError(
      `Failed to fetch transcript: ${error}`,
      "MEDIA_ERROR"
    );
  }
}

/**
 * Fetch transcript from timedtext URL
 */
async function fetchTranscriptFromUrl(url: string): Promise<YouTubeTranscript[]> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new LumeriscaError(
      `Failed to fetch transcript: ${response.status}`,
      "MEDIA_ERROR"
    );
  }

  const xml = await response.text();
  return parseTranscriptXml(xml);
}

/**
 * Parse YouTube transcript XML
 */
function parseTranscriptXml(xml: string): YouTubeTranscript[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, "text/xml");
  const textElements = doc.getElementsByTagName("text");

  const transcript: YouTubeTranscript[] = [];

  for (let i = 0; i < textElements.length; i++) {
    const element = textElements[i];
    const text = decodeHTMLEntities(element.textContent || "");
    const start = parseFloat(element.getAttribute("start") || "0");
    const duration = parseFloat(element.getAttribute("dur") || "0");

    transcript.push({ text, start, duration });
  }

  log.info("Parsed transcript", { segments: transcript.length });
  return transcript;
}

/**
 * Decode HTML entities in transcript text
 */
function decodeHTMLEntities(text: string): string {
  const textarea = document.createElement("textarea");
  textarea.innerHTML = text;
  return textarea.value;
}

/**
 * Extract chapters from video description
 */
export function extractChapters(description: string): YouTubeChapter[] {
  const chapters: YouTubeChapter[] = [];

  // Match timestamp patterns: 0:00, 1:23, 12:34:56
  const timestampRegex = /(\d{1,2}:)?(\d{1,2}):(\d{2})\s+(.+?)(?:\n|$)/g;

  let match;
  while ((match = timestampRegex.exec(description)) !== null) {
    const hours = match[1] ? parseInt(match[1].replace(":", "")) : 0;
    const minutes = parseInt(match[2]);
    const seconds = parseInt(match[3]);
    const title = match[4].trim();

    const timestamp = hours * 3600 + minutes * 60 + seconds;

    chapters.push({ title, timestamp });
  }

  // Calculate durations
  for (let i = 0; i < chapters.length - 1; i++) {
    chapters[i].duration = chapters[i + 1].timestamp - chapters[i].timestamp;
  }

  log.info("Extracted chapters", { count: chapters.length });
  return chapters;
}

/**
 * Fetch video metadata from YouTube
 */
export async function fetchMetadata(videoId: string): Promise<YouTubeMetadata> {
  log.info("Fetching metadata", { videoId });

  try {
    const videoPageUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const response = await fetch(videoPageUrl);

    if (!response.ok) {
      throw new LumeriscaError(
        `Failed to fetch video page: ${response.status}`,
        "MEDIA_ERROR"
      );
    }

    const html = await response.text();

    // Extract from ytInitialPlayerResponse
    const playerResponseMatch = html.match(
      /var ytInitialPlayerResponse = ({.+?});/
    );

    if (!playerResponseMatch) {
      throw new LumeriscaError(
        "Failed to extract player response",
        "MEDIA_ERROR"
      );
    }

    const playerResponse = JSON.parse(playerResponseMatch[1]);
    const videoDetails = playerResponse.videoDetails;

    const metadata: YouTubeMetadata = {
      videoId,
      title: videoDetails.title || "Unknown Title",
      author: videoDetails.author || "Unknown Author",
      duration: parseInt(videoDetails.lengthSeconds || "0"),
      description: videoDetails.shortDescription || "",
      viewCount: parseInt(videoDetails.viewCount || "0"),
    };

    log.info("Fetched metadata", { title: metadata.title });
    return metadata;
  } catch (error) {
    if (error instanceof LumeriscaError) {
      throw error;
    }

    log.error("Failed to fetch metadata", { error, videoId });
    throw new LumeriscaError(
      `Failed to fetch metadata: ${error}`,
      "MEDIA_ERROR"
    );
  }
}

/**
 * Convert transcript to full text
 */
export function transcriptToText(transcript: YouTubeTranscript[]): string {
  return transcript.map((segment) => segment.text).join(" ");
}

/**
 * Format timestamp for display (MM:SS or HH:MM:SS)
 */
export function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  }

  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Extract complete YouTube video data
 */
export async function extractYouTubeData(
  url: string,
  language: string = "en"
): Promise<YouTubeExtraction> {
  const videoId = extractVideoId(url);

  if (!videoId) {
    throw new LumeriscaError("Invalid YouTube URL", "VALIDATION_ERROR");
  }

  log.info("Extracting YouTube data", { videoId, url });

  const [metadata, transcript] = await Promise.all([
    fetchMetadata(videoId),
    fetchTranscript(videoId, language),
  ]);

  const chapters = extractChapters(metadata.description);
  const fullText = transcriptToText(transcript);

  return {
    metadata,
    transcript,
    chapters,
    fullText,
  };
}

/**
 * Generate YouTube video summary prompt
 */
export function generateSummaryPrompt(extraction: YouTubeExtraction): string {
  const { metadata, chapters, fullText } = extraction;

  let prompt = `Summarize this YouTube video:\n\n`;
  prompt += `**Title**: ${metadata.title}\n`;
  prompt += `**Author**: ${metadata.author}\n`;
  prompt += `**Duration**: ${formatTimestamp(metadata.duration)}\n\n`;

  if (chapters.length > 0) {
    prompt += `**Chapters**:\n`;
    chapters.forEach((chapter) => {
      prompt += `- ${formatTimestamp(chapter.timestamp)}: ${chapter.title}\n`;
    });
    prompt += `\n`;
  }

  prompt += `**Transcript**:\n${fullText}\n\n`;
  prompt += `Provide a concise summary with:\n`;
  prompt += `1. Main topic and purpose\n`;
  prompt += `2. Key points (3-5 bullet points)\n`;
  prompt += `3. Notable quotes or insights\n`;
  prompt += `4. Who should watch this video\n`;

  return prompt;
}
