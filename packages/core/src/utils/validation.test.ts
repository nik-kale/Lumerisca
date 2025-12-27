import { describe, it, expect } from 'vitest';
import {
  validatePrompt,
  validateUrl,
  validateApiKey,
  sanitizeText,
  sanitizeHtml,
  ValidationError,
  MAX_LENGTHS
} from './validation.js';

describe('Validation Utilities', () => {
  describe('validatePrompt', () => {
    it('should pass for valid prompts', () => {
      const prompt = 'Hello, world!';
      expect(validatePrompt(prompt)).toBe(prompt);
    });

    it('should throw for empty prompts', () => {
      expect(() => validatePrompt('')).toThrow(ValidationError);
      expect(() => validatePrompt('   ')).toThrow(ValidationError);
    });

    it('should throw if prompt is too long', () => {
      const longPrompt = 'a'.repeat(MAX_LENGTHS.PROMPT + 1);
      expect(() => validatePrompt(longPrompt)).toThrow(ValidationError);
    });

    it('should sanitize input', () => {
      const dirty = 'Hello <script>alert(1)</script>';
      expect(validatePrompt(dirty)).toBe('Hello alert(1)');
    });
  });

  describe('validateUrl', () => {
    it('should pass for valid HTTPS URLs', () => {
      const url = 'https://example.com';
      expect(validateUrl(url)).toBe(url + '/');
    });

    it('should throw for HTTP URLs when httpsOnly is true', () => {
      const url = 'http://example.com';
      expect(() => validateUrl(url)).toThrow(ValidationError);
    });

    it('should allow HTTP URLs when httpsOnly is false', () => {
      const url = 'http://example.com';
      expect(validateUrl(url, false)).toBe(url + '/');
    });

    it('should throw for private networks', () => {
      expect(() => validateUrl('https://localhost')).toThrow(ValidationError);
      expect(() => validateUrl('https://127.0.0.1')).toThrow(ValidationError);
      expect(() => validateUrl('https://192.168.1.1')).toThrow(ValidationError);
    });

    it('should throw for invalid URL strings', () => {
      expect(() => validateUrl('not a url')).toThrow(ValidationError);
    });
  });

  describe('validateApiKey', () => {
    it('should validate OpenAI keys', () => {
      const key = 'sk-' + 'a'.repeat(48);
      expect(validateApiKey(key, 'openai')).toBe(key);
    });

    it('should throw for invalid OpenAI keys', () => {
      const key = 'sk-invalid';
      expect(() => validateApiKey(key, 'openai')).toThrow(ValidationError);
    });

    it('should validate Anthropic keys', () => {
      const key = 'sk-ant-' + 'a'.repeat(90);
      expect(validateApiKey(key, 'anthropic')).toBe(key);
    });
  });

  describe('sanitizeText', () => {
    it('should remove HTML tags', () => {
      expect(sanitizeText('<b>Bold</b>')).toBe('Bold');
    });

    it('should remove javascript: protocol', () => {
      expect(sanitizeText('javascript:alert(1)')).toBe('alert(1)');
    });

    it('should remove inline event handlers', () => {
      expect(sanitizeText('onload=alert(1)')).toBe('');
    });
  });

  describe('sanitizeHtml', () => {
    it('should remove script tags', () => {
      expect(sanitizeHtml('<script>alert(1)</script>')).toBe('');
    });

    it('should remove event handlers', () => {
      expect(sanitizeHtml('<div onclick="alert(1)">Click</div>')).toBe('<div >Click</div>');
    });

    it('should remove javascript: links', () => {
      expect(sanitizeHtml('<a href="javascript:alert(1)">Link</a>')).toBe('<a href="#">Link</a>');
    });
  });
});

