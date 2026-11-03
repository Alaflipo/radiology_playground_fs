import { init as initCore } from "@cornerstonejs/core";
import {
  init as initDicomLoader,
} from "@cornerstonejs/dicom-image-loader";

let initialization: Promise<void> | undefined;

export function initializeCornerstone(): Promise<void> {
    initialization ??= (async () => {
        await initCore();

        await initDicomLoader({
            maxWebWorkers: 2,
        });
    })();

    return initialization;
}
