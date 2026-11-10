import { useParams } from "react-router";
import InstancesViewer from "../components/InstancesViewer";
import { Stack } from "@mui/material";
import CornerStoneViewer from "../components/CornerStoneViewer";
import {Enums, RenderingEngine, type Types} from "@cornerstonejs/core";
import { useEffect, useRef, useState } from "react";
import type { StackResponse } from "../DICOM_types";
import SegmentationUpload from "../components/SegmentationUpload";

const API_URL = "http://localhost:8000";

export default function StackView() {

    const { seriesId } = useParams(); 

    const [viewport, setViewport] = useState<Types.IStackViewport | null>(null); 
    const [instanceIds, setInstanceIds] = useState<string[]>([]); 

    useEffect(() => {

       async function loadSeries() {
            try {
                if (!seriesId) return; 
                const response = await fetch(`${API_URL}/api/dicom/series/${encodeURIComponent(seriesId)}/stack`); 
                const data: StackResponse = await response.json(); 
                setInstanceIds(data.instanceIds); 
            } catch (error) {
                console.log(String(error)); 
            }
        }

        void loadSeries(); 
    }, []);

    return (
        <div style={{margin: '15px'}}>
            <h2>Dicom series (id: {seriesId})</h2>
            {seriesId && 
                <Stack direction="row" spacing={2}>
                    <InstancesViewer instanceIds={instanceIds}/>
                    <Stack direction={'column'}>
                        <CornerStoneViewer instanceIds={instanceIds} setViewport={setViewport}/>
                    </Stack>
                    {viewport && <SegmentationUpload viewport={viewport}/>}
                </Stack>
            }
        </div>
        
    ); 
}
