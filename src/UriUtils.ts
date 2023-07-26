export default class UriUtils {
  private static PUBLIC_URL_ROOT = '.coveragetiles.com';

  static getSubdomain(url: string): string | null {
    const urlObj = new URL(url);

    if (!urlObj.hostname.endsWith(UriUtils.PUBLIC_URL_ROOT)) return null;

    const subdomain = urlObj.hostname.slice(0, -UriUtils.PUBLIC_URL_ROOT.length);

    return subdomain;
  }

  static getPath(url: string): string {
    const urlObj = new URL(url);

    return urlObj.pathname;
  }

  static getTilesVersion(url: string): string | null {
    // https://234-15.coveragetiles.com/2023-07-04/4g/0/0/0.png
    const path = UriUtils.getPath(url);
    const pathParts = path.split('/');
    const tilesVersion = pathParts?.[1];

    return tilesVersion || null;
  }
}
