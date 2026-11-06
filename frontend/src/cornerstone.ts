import { init as initCore } from "@cornerstonejs/core";
import { init as initDicomLoader} from "@cornerstonejs/dicom-image-loader";
import { init as initTools } from "@cornerstonejs/tools";

let initialization: Promise<void> | undefined;

export function initializeCornerstone(): Promise<void> {
    initialization ??= (async () => {
        await initCore();

        await initDicomLoader({
            maxWebWorkers: 2,
        });

        await initTools(); 
    })();

    return initialization;
}
