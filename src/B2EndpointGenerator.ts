import UriUtils from './UriUtils';
import TileVersions from './tileVersions.json';

type ValidPlmns = keyof typeof TileVersions;

export default class B2EndpointGenerator {
  private static SERVER_HOSTNAME = 'f003.backblazeb2.com';
  private static BUCKET_NAME = 'coverage-map-archive-eu';

  private static plmnToNetworkName(plmn: string): string | null {
    switch (plmn) {
      case '234-10':
        return 'o2';

      case '234-15':
        return 'vodafone';

      case '234-20':
        return 'three';

      case '234-30':
        return 'ee';
    }

    return null;
  }

  private static plmnToCountryCode(plmn: string): string | null {
    const mcc = plmn.split('-')[0];

    switch (mcc) {
      case '234':
        return 'gb';
    }

    return null;
  }

  private static verifyPlmn(plmn: string): plmn is ValidPlmns {
    if (!/^\d\d\d-\d\d\d?$/.test(plmn)) return false;

    return plmn in Object.keys(TileVersions);
  }

  private static generateB2Uri(networkName: string, countryCode: string, path: string): string {
    return `https://${B2EndpointGenerator.SERVER_HOSTNAME}/file/${B2EndpointGenerator.BUCKET_NAME}/${countryCode}/${networkName}${path}`;
  }

  // private static getBlankTileUri(): string {
  //   return `https://${B2EndpointGenerator.SERVER_HOSTNAME}/file/${B2EndpointGenerator.BUCKET_NAME}/256_blank_tile.png`;
  // }

  static getB2Endpoint(uri: string): string | null {
    const subdomain = UriUtils.getSubdomain(uri);

    if (!subdomain || !B2EndpointGenerator.verifyPlmn(subdomain)) {
      return null;
    }

    const networkName = B2EndpointGenerator.plmnToNetworkName(subdomain);

    if (!networkName) {
      return null;
    }

    const countryCode = B2EndpointGenerator.plmnToCountryCode(subdomain);

    if (!countryCode) {
      return null;
    }

    const tilesVersion = UriUtils.getTilesVersion(uri);

    if (tilesVersion === 'latest') {
      return B2EndpointGenerator.generateB2Uri(
        networkName,
        countryCode,
        UriUtils.getPath(uri).replace('/latest/', `/${TileVersions[subdomain]}/`),
      );
    }

    return B2EndpointGenerator.generateB2Uri(networkName, countryCode, UriUtils.getPath(uri));
  }
}
