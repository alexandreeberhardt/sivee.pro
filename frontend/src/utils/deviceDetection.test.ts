import { describe, it, expect, afterEach } from 'vitest';
import { isMobileDevice } from './deviceDetection';

describe('isMobileDevice', () => {
  const originalUserAgent = navigator.userAgent;

  const setUserAgent = (ua: string) => {
    Object.defineProperty(navigator, 'userAgent', {
      value: ua,
      writable: true,
      configurable: true,
    });
  };

  afterEach(() => {
    Object.defineProperty(navigator, 'userAgent', {
      value: originalUserAgent,
      writable: true,
      configurable: true,
    });
  });

  it('returns false for a desktop Chrome user agent', () => {
    setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
    expect(isMobileDevice()).toBe(false);
  });

  it('returns false for a desktop Firefox user agent', () => {
    setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0'
    );
    expect(isMobileDevice()).toBe(false);
  });

  it('returns false for a desktop Safari user agent', () => {
    setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15'
    );
    expect(isMobileDevice()).toBe(false);
  });

  it('returns true for an iPhone user agent', () => {
    setUserAgent(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1'
    );
    expect(isMobileDevice()).toBe(true);
  });

  it('returns true for an Android user agent', () => {
    setUserAgent(
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
    );
    expect(isMobileDevice()).toBe(true);
  });

  it('returns true for an iPad user agent', () => {
    setUserAgent(
      'Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1'
    );
    expect(isMobileDevice()).toBe(true);
  });

  it('returns true for a BlackBerry user agent', () => {
    setUserAgent(
      'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.1.0.346 Mobile Safari/534.11+'
    );
    expect(isMobileDevice()).toBe(true);
  });

  it('returns true for an Opera Mini user agent', () => {
    setUserAgent(
      'Opera/9.80 (Android; Opera Mini/36.2.2254/191.256; U; en) Presto/2.12.423 Version/12.16'
    );
    expect(isMobileDevice()).toBe(true);
  });

  it('returns true for an iPod user agent', () => {
    setUserAgent(
      'Mozilla/5.0 (iPod touch; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
    );
    expect(isMobileDevice()).toBe(true);
  });
});
