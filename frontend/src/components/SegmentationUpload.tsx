import { useEffect, useRef, useState } from "react";
import {cache, imageLoader, metaData, type Types} from "@cornerstonejs/core";
import { segmentation, Enums } from "@cornerstonejs/tools";
import { adaptersSEG } from "@cornerstonejs/adapters";
import { Stack, Switch } from "@mui/material";

export default function SegmentationUpload({viewport}: {viewport: Types.IStackViewport}) {
    const [loading, setLoading] = useState(false);
    const [maskVisible, setMaskVisible] = useState(true); 

    // the id's of registered cornerstone segmentations
    const segmentationIds = useRef<string[]>([]);
    // identifiers of the gnerated labelmap images in the cache 
    const maskImageIds = useRef<string[]>([]);

    function clear() {
        segmentationIds.current.forEach((id) =>
            segmentation.removeSegmentation(id)
        );
        maskImageIds.current.forEach((id) =>
            cache.removeImageLoadObject(id)
        );

        segmentationIds.current = [];
        maskImageIds.current = [];
    }

    useEffect(() => {
        return () => clear();
    }, []);

    async function upload(file: File) {
        setLoading(true);

        try {
            const imageIds = viewport.getImageIds();

            // Make the original images' metadata available.
            for (const imageId of imageIds) {
                await imageLoader.loadAndCacheImage(imageId);
            }

            // adapter reads the SEG, matches its frames to the original images, and creates labelmap images.
            // labelmap images store a segment label at each pixel 
            const { labelMapImages } = await adaptersSEG.Cornerstone3D.Segmentation
                .createFromDICOMSegBuffer(
                    imageIds, 
                    await file.arrayBuffer(), 
                    { metadataProvider: metaData }
                );

            clear();

            // Separate layers support overlapping segments.
            for (const layer of labelMapImages) {
                const segmentationId = crypto.randomUUID();
                const ids = layer.map((image: { imageId: string }) => image.imageId);

                segmentation.addSegmentations([{
                    segmentationId,
                    representation: {
                        type: Enums.SegmentationRepresentations.Labelmap,
                        data: { imageIds: ids },
                    },
                }]);

                segmentationIds.current.push(segmentationId);
                maskImageIds.current.push(...ids);
            }

            await segmentation.addLabelmapRepresentationToViewport(
                viewport.id,
                segmentationIds.current.map((segmentationId) => ({
                    segmentationId,
                }))
            );
            toggleMask(maskVisible);

            viewport.render();
        } catch (error) {
            console.error("SEG import failed:", error);
        } finally {
            setLoading(false);
        }
    }

    function toggleMask(visible: boolean) {
        setMaskVisible(visible);

        segmentationIds.current.forEach((segmentationId) =>
            segmentation.config.visibility.setSegmentationRepresentationVisibility(
                viewport.id,
                {
                    segmentationId,
                    type: Enums.SegmentationRepresentations.Labelmap,
                },
                visible
            )
        );

        viewport.render();
    }

    return (
        <Stack direction={'row'}>
            <label>
                {loading ? "Loading..." : "Upload SEG: "}
                <input
                    type="file"
                    accept=".dcm"
                    disabled={loading}
                    onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void upload(file);
                        event.target.value = "";
                    }}
                />
            </label>
            <Switch
                checked={maskVisible}
                onChange={() => toggleMask(!maskVisible)}
            />
        </Stack>
    );
}
