
import { Collapse, List, ListItem, ListItemButton, ListItemText, Paper } from "@mui/material";
import { styled } from "@mui/material/styles";
import { useEffect, useState } from "react";
import type { DicomInstance } from "../DICOM_types";

interface ViewerProps {
    instanceIds: string[], 
}

const API_URL = "http://localhost:8000";

export default function InstancesViewer({instanceIds}: ViewerProps) {

    const [open, setOpen] = useState<Record<string, boolean>>(
        Object.fromEntries(instanceIds.map(id => [id, false]))
    ); 

    return (
        <StyledInstancesViewer>
            <List>
                {instanceIds.map(instanceId => (
                    <div key={instanceId}>
                    <ListItem disablePadding>
                        <ListItemButton onClick={() => {
                            setOpen({...open, [instanceId]: !open[instanceId]})
                        }}>
                            <ListItemText primary={instanceId} />
                        </ListItemButton>
                    </ListItem>
                    <Collapse in={open[instanceId]}>
                        <img style={{width: '200px'}} src={`${API_URL}/api/dicom/instances/${instanceId}/preview`}></img>
                    </Collapse>
                    </div>
                ))}
            </List>
        </StyledInstancesViewer>
    )

}

const StyledInstancesViewer = styled(Paper)(() => ({
    width: '500px', 
    textAlign: 'left', 
    height: 800,    
    maxHeight: 800,   // Alternative: use maxHeight if the list can be shorter
    overflow: 'auto', // enables scrolling when items overflow
})); 
