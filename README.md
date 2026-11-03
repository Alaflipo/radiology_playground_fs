
**RUN the front and backend using Docker**
`docker compose up --build`


**Setting up the backend with Docker**

1. **Create `main.py`: define the backend application.**  
   Create a FastAPI `app` and define its API endpoints—the URLs the frontend can call to send or retrieve data.

2. **Create a `Dockerfile`: define how to build the backend image.**  
   Choose a Python base image, install dependencies, copy the backend code, and specify the command that starts Uvicorn. Uvicorn listens for HTTP requests and passes them to the FastAPI application.

3. **Create `compose.yaml`: define how to run the container.**  
   Configure how Docker builds and starts the backend, including:
   - **Ports**, such as `"8000:8000"`, which forward connections from your computer to Uvicorn inside the container.
   - **A source-code bind mount**, such as `./backend:/app`, which makes your local backend folder available inside the container. Combined with Uvicorn’s `--reload`, this lets the server restart automatically when you edit your code.

4. **Run `docker compose up --build`.**  
   Docker builds the image and starts the container. The backend is then accessible at `http://localhost:8000`.

**FastAPI's automatically generated API documentation**
Can be found on: `http://localhost:8000/docs`

**Setting up Orthanc with Docker**

1. **Add an Orthanc service to `compose.yaml`.**  
   Use an existing Orthanc image to run a DICOM server in its own container. Orthanc stores and manages DICOM images and their metadata. Configure a persistent volume so that its data remains available when the container is replaced.

2. **Add the required Python dependencies to `requirements.txt`.**
   - **`requests`** lets the Python backend send HTTP requests to Orthanc’s REST API—for example, to upload images or retrieve information about stored studies.
   - **`python-multipart`** lets FastAPI process file uploads sent by the browser using `multipart/form-data`.

3. **Extend the FastAPI application with DICOM endpoints.**  
   Add an endpoint that receives uploaded DICOM files from the frontend and forwards them to Orthanc for storage. Add further endpoints to retrieve studies, series, and images from Orthanc.

4. **Rebuild and start the containers.**  
   Run `docker compose up --build` to install the new dependencies and start the services. The Python backend communicates with Orthanc using its Compose service name—for example, `http://orthanc:8042` when the service is named `orthanc`.

we can access the orthanc UI and database with: `http://localhost:8042/` now 

## api endpoint mappings ##
| React action | FastAPI endpoint | Orthanc endpoint |
|---|---|---|
| Upload | `POST /api/dicom/upload` | `POST /instances` |
| List | `GET /api/dicom/instances` | `GET /instances?expand=true` |
| Preview | `GET /api/dicom/instances/{id}/preview` | `GET /instances/{id}/preview` |
| Download | `GET /api/dicom/instances/{id}/file` | `GET /instances/{id}/file` |
| Delete | `DELETE /api/dicom/instances/{id}` | `DELETE /instances/{id}` |

