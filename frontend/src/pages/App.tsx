import { useEffect, useState } from 'react';
import { Stack } from '@mui/material';
import SeriesViewer from '../components/SeriesViewer';
import type { DICOMSerie } from '../DICOM_types';

const API_URL = "http://localhost:8000";

function App() {

    
    const [series, setSeries] = useState<DICOMSerie[]>([]); 
    const [loading, setLoading] = useState(false); 

    async function fetch_series() {
        const series_data = await fetch(`${API_URL}/api/dicom/series`); 
        const data = await series_data.json(); 

        setSeries(data); 
    }

    useEffect(() => {
        fetch_series(); 
    }, [])

    async function uploadFiles(files: File[]) {
        setLoading(true); 

        let uploaded = 0; 

        try {
            for (const file of files) {
                const formData = new FormData(); 
                formData.append("file", file); 
                
                // could add something to check if the response is ok 
                await fetch(`${API_URL}/api/dicom/upload`, {
                    method: "POST", 
                    body: formData, 
                })

                uploaded += 1; 
                console.log(`uploaded ${uploaded} of ${files.length}`); 
            }
        } catch (error) {
            console.log(`Upload stopped!`); 
        } finally {
            setLoading(false); 
            fetch_series()
        }
    }

    return (
        <main>
            <Stack>
                <h2>Upload DICOM files</h2>

                <input 
                    type='file'
                    multiple
                    disabled={loading}
                    onChange={(event) => {
                        uploadFiles(Array.from(event.target.files ?? []))
                    }}
                />
            </Stack>

            <Stack>
                <h2>Stored DICOM images</h2>
                <SeriesViewer series={series}/>
            </Stack>
        </main>
    )
}

export default App
