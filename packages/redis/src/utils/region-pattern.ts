import { PasteRegion } from "@pasteboard/core";

export default function subscribePatternForRegion(region: PasteRegion): string {
    const lastComponent = region.suffix(1).jsonPath.replace(/([\[\]*?])/g, '\\$1');
    const childrenPattern = `${lastComponent}[.[]*`;

    return region.slice(0, -1).jsonPath + childrenPattern;
}
