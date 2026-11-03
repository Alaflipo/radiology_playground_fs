
import { Collapse, List, ListItem, ListItemButton, ListItemText, Paper } from "@mui/material";
import { styled } from "@mui/material/styles";
import { useEffect, useState } from "react";
import type { DicomInstance } from "../DICOM_types";

interface ViewerProps {
    seriesId: string, 
    instances: DicomInstance[], 
}

const API_URL = "http://localhost:8000";

export default function InstancesViewer({seriesId, instances}: ViewerProps) {

    const [open, setOpen] = useState<Record<string, boolean>>(
        Object.fromEntries(instances.map(item => [item.ID, false]))
    ); 

    return (
        <StyledInstancesViewer>
            <List>
                {instances.map(instance => (
                    <div key={instance.ID}>
                    <ListItem disablePadding>
                        <ListItemButton onClick={() => {
                            setOpen({...open, [instance.ID]: !open[instance.ID]})
                        }}>
                            <ListItemText primary={instance.IndexInSeries} />
                        </ListItemButton>
                    </ListItem>
                    <Collapse in={open[instance.ID]}>
                        <img style={{width: '200px'}} src={`${API_URL}/api/dicom/instances/${instance.ID}/preview`}></img>
                    </Collapse>
                    </div>
                ))}
            </List>
        </StyledInstancesViewer>
    )

}

const StyledInstancesViewer = styled(Paper)(() => ({
    width: '100%', 
    textAlign: 'left', 
    height: 800,    
    maxHeight: 800,   // Alternative: use maxHeight if the list can be shorter
    overflow: 'auto', // enables scrolling when items overflow
})); 
