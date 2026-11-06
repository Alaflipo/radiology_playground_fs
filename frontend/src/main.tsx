import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './pages/App.tsx'
import { MyThemeProvider } from './theme.tsx'

import { createBrowserRouter, RouterProvider } from 'react-router'
import StackView from './pages/StackView.tsx'
import MaskUpload from './pages/MaskView.tsx'


const router = createBrowserRouter([
    {
        path: "/", 
        element: <App/>
    }, 
    {
        path: "/series/:seriesId", 
        element: <StackView/>
    }, 
    {
        path: "/maskview", 
        element: <MaskUpload/>
    }
]);

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <MyThemeProvider>
            <RouterProvider router={router}/>
        </MyThemeProvider>
    </StrictMode>
)
