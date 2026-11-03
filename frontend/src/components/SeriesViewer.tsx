
import { List, ListItem, ListItemButton, ListItemText, Paper } from "@mui/material";
import { styled } from "@mui/material/styles";
import type { DICOMSerie } from "../DICOM_types";
import { useNavigate } from "react-router";

interface SeriesViewerProps {
    series: DICOMSerie[]
}

export default function SeriesViewer({series}: SeriesViewerProps) {

    const navigate = useNavigate();

    return (
        <StyledInstancesViewer>
            <h2>Stored Series</h2>
            <List>
                {series.map(serie => (
                    <ListItem disablePadding key={serie.id}>
                        <ListItemButton onClick={() => navigate(`/series/${serie.id}`)}>
                            <ListItemText>
                                {serie.modality} scan - {serie.description} (Img in stack: {serie.instanceCount})
                            </ListItemText>
                        </ListItemButton>
                    </ListItem>
                ))}
            </List>
        </StyledInstancesViewer>
    )

}

const StyledInstancesViewer = styled(Paper)(() => ({
    textAlign: 'left', 
    padding: '10px',
    height: '100%'
})); 
