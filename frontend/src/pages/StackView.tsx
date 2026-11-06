import { useParams } from "react-router";
import InstancesViewer from "../components/InstancesViewer";
import { Stack } from "@mui/material";
import CornerStoneViewer from "../components/CornerStoneViewer";
import { useEffect, useState } from "react";
import type { StackResponse } from "../DICOM_types";

const API_URL = "http://localhost:8000";

export default function StackView() {

    const { seriesId } = useParams(); 

    const [instanceIds, setInstancIds] = useState<string[]>([]); 

    async function loadSeries() {

        try {
            if (!seriesId) return; 

            const response = await fetch(`${API_URL}/api/dicom/series/${encodeURIComponent(seriesId)}/stack`); 
            const data: StackResponse = await response.json(); 
            setInstancIds(data.instanceIds); 
        } catch (error) {
            console.log(String(error)); 
        }
    }

    useEffect(() => {
        loadSeries(); 
    }, [])

    return (
        <div style={{margin: '15px'}}>
            <h2>Dicom series (id: {seriesId})</h2>
            {seriesId && 
                <Stack direction="row" spacing={2}>
                    <InstancesViewer seriesId={seriesId} instanceIds={instanceIds}/>
                    <CornerStoneViewer seriesId={seriesId}/>
                </Stack>
            }
        </div>
        
    ); 
}
