import { useEffect, useRef, useState } from "react";
import {Enums, RenderingEngine, type Types} from "@cornerstonejs/core";
import { initializeCornerstone } from "../cornerstone";
import { Slider, Stack } from "@mui/material";
import SegmentationUpload from "./SegmentationUpload";
import ViewerControls from "./ViewerControls";
import { viewport } from "@cornerstonejs/tools/utilities";

const API_URL = "http://localhost:8000";

type StackResponse = {
    seriesId: string;
    instanceIds: string[];
};

type CornerStoneViewerProps = {
    instanceIds: string[]; 
    setViewport: (viewport: Types.IStackViewport | null) => void; 
}

export default function CornerStoneViewer({instanceIds, setViewport}: CornerStoneViewerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const viewportRef = useRef<Types.IStackViewport | null>(null);

    const [ready, setReady] = useState(false); 
    const [currentIndex, setCurrentIndex] = useState(0);
    const [imageCount, setImageCount] = useState(0);

    useEffect(() => {
        if (!containerRef.current) return; 

        let cancelled = false; 
        let engine: RenderingEngine | undefined;

        async function setup() {
            setReady(false); 
            setImageCount(0); 
            setCurrentIndex(0); 

            try {
                // #### Initilize cornerstone ####
                await initializeCornerstone(); 
                if (cancelled || !containerRef.current || !instanceIds?.length) return; 

                // create the image ID's (url's to get the images)
                // it is prefixed with wadouri (Web Access Dicom Object URI)
                // before : is called a scheme and picks a registered loader (is stripped away when reading URL)
                const imageIds = instanceIds.map((id) =>
                    `wadouri:${API_URL}/api/dicom/instances/${id}/file`
                );
                
                // ### create the rendering engine and assign a viewport ###
                engine = new RenderingEngine('dicom-engine');

                const viewportId = "dicom-stack"; // we can use this ID for later reference 
                
                // turns my HTML container (in this case our div) into a cornerstone viewport 
                engine.enableElement({
                    viewportId: viewportId,
                    type: Enums.ViewportType.STACK,
                    element: containerRef.current,
                    defaultOptions: {
                        background: [255, 255, 255],
                    },
                });

                // retrieve the viewport
                const viewport = engine.getViewport(viewportId) as Types.IStackViewport;
                viewportRef.current = viewport; 
                setViewport(viewport); 

                // assign the images and select the first slice 
                await viewport.setStack(imageIds, 0);

                viewport.render(); 
                
                setImageCount(imageIds.length);
                setReady(true); 
                
            } catch (error) {
                if (!cancelled) console.log(String(error)); 
            } 
        }
        void setup(); 

        // to update the current index we are viewing 
        function handleNewImage() {
            const viewport = viewportRef.current;

            if (viewport) {
                setCurrentIndex(viewport.getCurrentImageIdIndex());
            }
        }

        containerRef.current?.addEventListener(
            Enums.Events.STACK_NEW_IMAGE,
            handleNewImage
        );

        return () => {
            cancelled = true; 
            viewportRef.current = null;
            setViewport(null); 
            
            containerRef.current?.removeEventListener(
                Enums.Events.STACK_NEW_IMAGE,
                handleNewImage
            );

            engine?.destroy();
        }
    }, [instanceIds]);

    // scrolling effect on the viewer
    useEffect(() => {
        const element = containerRef.current;
        if (!element) return;

        function handleWheel(event: WheelEvent) {
            // prevent the page from scrolling while over the viewer.
            event.preventDefault();

            if (!ready || event.deltaY === 0) return;

            const direction = event.deltaY > 0 ? 1 : -1;
            const clamped = Math.max(
                0,
                Math.min(currentIndex + direction, imageCount - 1)
            );
            void showSlice(clamped);
        }

        element.addEventListener("wheel", handleWheel, {
            passive: false,
        });

        return () => {
            element.removeEventListener("wheel", handleWheel);
        };
    }, [ready, currentIndex, imageCount]);

    async function showSlice(nextIndex: number) {
        const viewport = viewportRef.current;
        if (!viewport || !ready) return;

        try {
            await viewport.setImageIdIndex(nextIndex);
            viewport.render();
        } catch (error) {
            console.log(String(error)); 
        } 
    }

    return(
        <Stack>
            <div
                ref={containerRef}
                style={{
                    width: '512px',
                    height: '512px',
                    background: "black", 
                }}
            />
            <Slider
                sx={{width: '512px'}}
                min={0}
                max={imageCount-1}
                step={1}
                value={currentIndex}
                disabled={!ready}
                onChange={(_, value) => {
                    showSlice(value)
                }}
            />
            {viewportRef.current && <ViewerControls viewport={viewportRef.current}/>}
        </Stack>
    ); 
}
