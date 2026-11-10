import { useEffect, useRef, useState } from "react";
import {cache, imageLoader, metaData, type Types, Enums as CoreEnums, utilities} from "@cornerstonejs/core";
import { segmentation, Enums } from "@cornerstonejs/tools";
import { adaptersSEG } from "@cornerstonejs/adapters";
import { List, ListItem, Stack, Switch } from "@mui/material";
import AnatomicalStructuresList from "./AnatomicalStructureViewer";

type SegmentDescription = {
    SegmentNumber: number | string;
    SegmentLabel?: string;
};

export default function SegmentationUpload({viewport}: {viewport: Types.IStackViewport}) {
    const [loading, setLoading] = useState(false);
    const [maskVisible, setMaskVisible] = useState(true); 
    const [currentASSlice, setCurrentASSlice] = useState<{index: number, name: string}[]>([]); 
    const [hoveredLabel, setHoveredLabel] = useState("");

    const [tooltipPosition, setTooltipPosition] = useState({x: 0, y: 0});

    // the id's of registered cornerstone segmentations
    const segmentationIds = useRef<string[]>([]);
    // identifiers of the gnerated labelmap images in the cache 
    const maskImageIds = useRef<string[]>([]);
    // map labelmap numbers to organ names 
    const anatomicalStructures = useRef<Record<number, string>>({});

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

    useEffect(() => {
        viewport.element.addEventListener(
            CoreEnums.Events.STACK_NEW_IMAGE, 
            updateAnatomicalStructureList, 
        );
        return () => {
            viewport.element.removeEventListener(
                CoreEnums.Events.STACK_NEW_IMAGE, 
                updateAnatomicalStructureList, 
            );
        }
    }, [])

    function saveAnatomicalStructureData(data: (SegmentDescription | undefined)[]) {
        anatomicalStructures.current = {};

        // save 
        for (const item of data) {
            if (!item) continue;

            const index = Number(item.SegmentNumber);
            anatomicalStructures.current[index] = item.SegmentLabel ?? `Segment ${index}`;
        }
        console.log(anatomicalStructures.current); 
    }

    async function upload(file: File) {
        setLoading(true);

        try {
            const imageIds = viewport.getImageIds();

            // clear current data 
            clear();

            // Make the original images' metadata available.
            for (const imageId of imageIds) {
                await imageLoader.loadAndCacheImage(imageId);
            }

            // adapter reads the SEG, matches its frames to the original images, and creates labelmap images.
            // labelmap images store a segment label at each pixel, it is represented that each pixel has a number with meaning (ex. 0=background, 1=liver, 2=heart etc. )
            const { labelMapImages, segMetadata } = await adaptersSEG.Cornerstone3D.Segmentation
                .createFromDICOMSegBuffer(
                    imageIds, 
                    await file.arrayBuffer(), 
                    { metadataProvider: metaData }
                );
            
            // Check whether the item has a segment description (does it have the tags label and number)
            const segmentDescriptions = segMetadata.data.filter(
                (item): item is SegmentDescription => item !== undefined
            );
            
            const activeSegmentNumber = Number(segmentDescriptions[0]?.SegmentNumber);
            const segmentInfo: Record<number, {label: string; active: boolean}> = {}
            
            for (const segment of segmentDescriptions) {
                const segmentNumber = Number(segment.SegmentNumber);
                segmentInfo[segmentNumber] = {
                    label: segment.SegmentLabel ?? `Segment ${segmentNumber}`, 
                    active: segmentNumber === activeSegmentNumber
                }
            }

            // Separate layers support overlapping segments. (in the simple case we only have one layer per slice)
            for (const layer of labelMapImages) {
                // one segmentation is a segmenation over all slices in an image 
                const segmentationId = crypto.randomUUID();
                // each id represents the labelmap information of one slice 
                const ids = layer.map((image: { imageId: string }) => image.imageId);

                // we add a segmentation over all slices 
                segmentation.addSegmentations([{
                    segmentationId,
                    representation: {
                        type: Enums.SegmentationRepresentations.Labelmap,
                        data: { imageIds: ids },
                    },
                    config: { segments: segmentInfo },
                }]);

                segmentationIds.current.push(segmentationId);
                maskImageIds.current.push(...ids);
            }
            
            // now we add the segmentation as a certain representations (here we use labelmap)
            // there also exist contour (points connected as outlines) and surface (for 3D meshes) representations 
            await segmentation.addLabelmapRepresentationToViewport(
                viewport.id,
                segmentationIds.current.map((segmentationId) => ({
                    segmentationId,
                }))
            );
            toggleMask(maskVisible);

            // from the metadata we get how each value in the labelMap translates to which anatomical structure 
            saveAnatomicalStructureData(segMetadata.data)
            updateAnatomicalStructureList();

            viewport.render();
        } catch (error) {
            console.error("SEG import failed:", error);
        } finally {
            setLoading(false);
        }
    }

    function getSegmentOnCurrentSlice(viewportId: string, segmentationId: string) {
        const maskImageIds = segmentation.getCurrentLabelmapImageIdsForViewport(viewportId, segmentationId) ?? [];

        const present = new Set<number>();

        for (const imageId of maskImageIds) {
            const image = cache.getImage(imageId);
            if (!image) continue;

            const pixels = image.getPixelData();

            for (let i = 0; i < pixels.length; i++) {
                if (pixels[i] !== 0) {
                    present.add(pixels[i]);
                }
            }
        }
        return [...present].sort((a, b) => a - b);; 
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

    function updateAnatomicalStructureList() {
        const currentIndices = new Set<number>(); 

        for (const id of segmentationIds.current) {
            for (const index of getSegmentOnCurrentSlice(viewport.id, id)) {
                currentIndices.add(index); 
            }
        }
        const currentNames = [...currentIndices].map(index => ({index: index, name: anatomicalStructures.current[index]}));
        setCurrentASSlice(currentNames)
    }

    function showOnlySegment(selectedIndex: number) {
        for (const segmentationId of segmentationIds.current) {
            // specify that our representation is a labelmap 
            const specifier = {segmentationId, type: Enums.SegmentationRepresentations.Labelmap};

            // Ensure the overall representation is visible.
            segmentation.config.visibility.setSegmentationRepresentationVisibility(
                viewport.id,
                specifier,
                true
            );

            const representations = segmentation.defaultSegmentationStateManager.getSegmentationRepresentations(
                viewport.id,
                specifier
            );

            for (const representation of representations) {
                for (const index of Object.keys(representation.segments)) {

                    const segmentIndex = Number(index);
                    segmentation.config.visibility.setSegmentIndexVisibility(
                        viewport.id,
                        specifier,
                        segmentIndex,
                        segmentIndex === selectedIndex
                    );
                }
            }
        }

        viewport.render();
    }

    // add hover information over anatomical structures 
    useEffect(() => {
        const element = viewport.element;

        function handleHover(event: PointerEvent) {
            const data = viewport.getImageData();
            if (!data?.imageData) return;

            const rect = element.getBoundingClientRect();

            // mouse position relative to the viewer, in CSS pixels.
            const canvasPoint: [number, number] = [
                event.clientX - rect.left,
                event.clientY - rect.top,
            ];

            setTooltipPosition({
                x: event.clientX, 
                y: event.clientY
            });

            // Viewer coordinates → world coordinates → image pixel.
            const worldPoint = viewport.canvasToWorld(canvasPoint);

            const [column, row] = utilities.transformWorldToIndex(data.imageData, worldPoint);

            for (const segmentationId of segmentationIds.current) {
                const specifier = {
                    segmentationId,
                    type: Enums.SegmentationRepresentations.Labelmap,
                };

                // Ignore overlays that are hidden.
                if (!segmentation.config.visibility.getSegmentationRepresentationVisibility(viewport.id, specifier) ) {
                    continue;
                }

                const imageIds = segmentation.getCurrentLabelmapImageIdsForViewport(
                    viewport.id,
                    segmentationId
                ) ?? [];

                for (const imageId of imageIds) {
                    const image = cache.getImage(imageId);
                    if (!image) continue;

                    if (column < 0 || row < 0 || column >= image.columns || row >= image.rows) {
                        continue;
                    }

                    const index = image.getPixelData()[row * image.columns + column];

                    // 0 is background.
                    if (index === 0) continue;

                    const visible = segmentation.config.visibility.getSegmentIndexVisibility(
                        viewport.id,
                        specifier,
                        index
                    );

                    if (!visible) continue;

                    onSegmentHover(index);
                    return;
                }
            }

            onSegmentHover(null);
        }

        function onSegmentHover(index: number | null) {
            const label = index === null ? "" : anatomicalStructures.current[index] ?? `Segment ${index}`;
            setHoveredLabel(label);

            // add some actions 
        }

        function clearHover() {
            onSegmentHover(null);
        }

        element.addEventListener("pointermove", handleHover);
        element.addEventListener("pointerleave", clearHover);

        // Clear the old label when scrolling to another slice.
        element.addEventListener(
            CoreEnums.Events.STACK_NEW_IMAGE,
            clearHover
        );

        return () => {
            element.removeEventListener("pointermove", handleHover);
            element.removeEventListener("pointerleave", clearHover);
            element.removeEventListener(
            CoreEnums.Events.STACK_NEW_IMAGE,
            clearHover
            );
        };
    }, [viewport]);

    return (
        <Stack>
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
            <p>Hovering: {hoveredLabel}</p>
            <AnatomicalStructuresList anatomicalStructures={currentASSlice} onStructureSelect={showOnlySegment}/>
            {hoveredLabel && (
                <div
                style={{
                    position: "fixed",
                    left: tooltipPosition.x + 12,
                    top: tooltipPosition.y + 12,
                    zIndex: 10,
                    padding: "4px",
                    borderRadius: "4px",
                    background: "rgba(0, 0, 0, 0.8)",
                    color: "white",
                }}
                >
                    {hoveredLabel}
                </div>
            )}
        </Stack>
    );
}
