import { useEffect, useRef, useState } from "react";
import {Enums, RenderingEngine, type Types} from "@cornerstonejs/core";
import { initializeCornerstone } from "../cornerstone";
import { Slider, Stack } from "@mui/material";
import SegmentationUpload from "./SegmentationUpload";

const API_URL = "http://localhost:8000";

type StackResponse = {
    seriesId: string;
    instanceIds: string[];
};

type CornerStoneViewerProps = {
    seriesId: string; 
}

export default function CornerStoneViewer({seriesId}: CornerStoneViewerProps) {
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
                await initializeCornerstone(); 
                if (cancelled) return; 

                const response = await fetch(
                    `${API_URL}/api/dicom/series/${seriesId}/stack`
                );

                if (!response.ok) throw new Error(await response.text());

                const stack: StackResponse = await response.json();
                if (stack.instanceIds.length == 0) throw new Error('No slices in series');

                const imageIds = stack.instanceIds.map((id) =>
                    `wadouri:${API_URL}/api/dicom/instances/${id}/file`
                );

                engine = new RenderingEngine('dicom-engine');

                const viewportId = "dicom-stack"; 

                engine.enableElement({
                    viewportId: viewportId,
                    type: Enums.ViewportType.STACK,
                    element: containerRef.current!,
                    defaultOptions: {
                        background: [255, 255, 255],
                    },
                });

                const viewport = engine.getViewport(viewportId) as Types.IStackViewport;
                viewportRef.current = viewport
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
            
            containerRef.current?.removeEventListener(
                Enums.Events.STACK_NEW_IMAGE,
                handleNewImage
            );

            engine?.destroy();
        }
    }, []);

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
            {ready && viewportRef.current && <SegmentationUpload viewport={viewportRef.current}/>}
        </Stack>
    ); 
}
