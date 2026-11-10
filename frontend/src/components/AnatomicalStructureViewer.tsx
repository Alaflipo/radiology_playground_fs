import { List, ListItem, ListItemButton, ListItemText, Paper, styled } from "@mui/material"

interface AnatomicalStructuresListProps {
    anatomicalStructures: {index: number, name: string}[]; 
    onStructureSelect: (index: number) => void;  
}

export default function AnatomicalStructuresList({anatomicalStructures, onStructureSelect}: AnatomicalStructuresListProps) {

    return (
        <StyledAnatomicalStructuresList>
            <List>
                {anatomicalStructures.map(structure => {
                    return (
                        <ListItemButton onClick={() => {
                            onStructureSelect(structure.index); 
                        }}>
                            <ListItemText primary={structure.name} />
                        </ListItemButton>
                    )
                })}
            </List>
        </StyledAnatomicalStructuresList>
    ); 

}

const StyledAnatomicalStructuresList = styled(Paper)(() => ({
    width: '500px', 
    textAlign: 'left', 
    height: 800,    
    maxHeight: 800,   // Alternative: use maxHeight if the list can be shorter
    overflow: 'auto', // enables scrolling when items overflow
})); 
