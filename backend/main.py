import os 
import math 

import requests
from fastapi import FastAPI, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel

app = FastAPI() # creates the application to which we attack the endpoints 

# The CORS configuration lets JavaScript served from http://localhost:5173 read responses from our backend on port 8000. Different ports count as different origins, so the browser requires this permission. CORS is a browser access rule; it isn’t authentication.
app.add_middleware(
    CORSMiddleware, 
    allow_origins=["http://localhost:5173"], 
    allow_methods=["GET", "POST"], 
    allow_headers=["Content-Type"]
)

# we get these variables from our compose.yaml file (here we define the environment variables)
ORTHANC_URL = os.environ["ORTHANC_URL"].rstrip("/") # right strip 
ORTHANC_AUTH = (
    os.environ["ORTHANC_USERNAME"], 
    os.environ["ORTHANC_PASSWORD"],
)

MAX_UPLOAD_BYTES = 50 * 1024 * 1024  # 50 MiB per file

class GreetingRequest(BaseModel): 
    name: str
    uppercase: bool 


# This is just a wrapper to do some basic error handling
def orthanc_request(method: str, path: str, **kwargs):
    try:
        # this is the only line we care about 
        response = requests.request(
            method,
            f"{ORTHANC_URL}{path}",
            auth=ORTHANC_AUTH,
            timeout=(5, 60),
            **kwargs,
        )
    except requests.Timeout:
        raise HTTPException(504, "Orthanc took too long to respond.")
    except requests.RequestException:
        raise HTTPException(503, "Cannot connect to Orthanc.")
    if response.status_code == 404:
        raise HTTPException(404, "DICOM instance not found.")
    if not response.ok:
        raise HTTPException(
            502,
            f"Orthanc could not complete the request "
            f"(status {response.status_code}).",
        )

    return response

@app.get("/api/health")
def health(): 
    return {"Status": "Ok"}

@app.post("/api/greet")
def greet(data: GreetingRequest): 
    message = f"Hello, {data.name}! This message is from the backend test!"
    if data.uppercase: 
        message = message.upper() 
    return {"message": message}

@app.get("/api/dicom/instances")
def list_instances(): 
    response = orthanc_request("GET", "/instances", params={"expand": "true"})

    instances = []
    for instance in response.json(): 
        instances.append({
            # internal identifier for this specific instance
            "id": instance["ID"],
            #id for series containing it 
            "seriesId": instance["ParentSeries"], 
            # DICOM number indicating the instance order within a series 
            "instanceNumber": instance.get("MainDicomTags", {}).get(
                "InstanceNumber", ""
            ), 
            # DICOM id of the particular object (shared acrooss systems)
            "sopInstanceUid": instance.get("MainDicomTags", {}).get(
                "SOPInstanceUID", ""
            ),
        })
    return instances

@app.get("/api/dicom/instances/{instance_id}/preview")
def get_preview(instance_id: str):
    # can be used for a quick preview in an HTML <img> tag 
    response = orthanc_request(
        "GET",
        f"/instances/{instance_id}/preview",
        headers={"Accept": "image/png"},
    )

    # we use Response here because we want to return an image and not plain json 
    return Response(
        content=response.content,
        media_type="image/png",
    )

@app.get("/api/dicom/instances/{instance_id}/file")
def download_instance(instance_id: str):
    # to download the actual DICOM file 
    response = orthanc_request(
        "GET",
        f"/instances/{instance_id}/file",
    )

    return Response(
        content=response.content,
        media_type="application/dicom",
        headers={
            "Content-Disposition":
                f'attachment; filename="{instance_id}.dcm"'
        },
    )

@app.post("/api/dicom/upload")
def upload_dicom(file: UploadFile):
    try:
        contents = file.file.read(MAX_UPLOAD_BYTES + 1)
    finally:
        file.file.close()

    if not contents:
        raise HTTPException(400, "The uploaded file is empty.")

    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "Select a file smaller than 50 MiB.")

    response = orthanc_request(
        "POST",
        "/instances",
        data=contents,
        headers={"Content-Type": "application/dicom"},
    )

    return response.json()

@app.get('/api/dicom/series')
def list_series(): 
    response = orthanc_request(
        "GET", 
        "/series", 
        params={"expand": "true"}
    )

    list_series = []
    for series in response.json(): 
        tags = series.get("MainDicomTags", {}); 
        list_series.append({
            "id": series["ID"],
            # the get is simple .get function on objects with an alternative 
            "description": tags.get("SeriesDescription", "Unnamed series"),
            "modality": tags.get("Modality", ""),
            "bodyPart": tags.get("BodyPartExamined", ""), 
            "studyDescription": tags.get("StudyDescription", ""), 
            "seriesNumber": tags.get("SeriesNumber", ""),
            "instanceCount": len(series.get("Instances", [])),
        })
    return list_series

@app.get('/api/dicom/series/{series_id}/instances') 
def list_serie_instances(series_id: str): 
    response = orthanc_request(
        "GET", 
        f"/series/{series_id}/instances", 
    )

    return response.json()

def vector_tag(tags, name, length):
    value = tags.get(name)
    if value is None: return None

    values = value.split("\\") if isinstance(value, str) else value
    numbers = [float(item) for item in values]

    if len(numbers) != length: return None

    if not all(math.isfinite(number) for number in numbers): return None

    return numbers


def dot(a, b):
    return sum(x * y for x, y in zip(a, b))


def cross(a, b):
    return [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
    ]


@app.get("/api/dicom/series/{series_id}/stack")
def get_series_stack(series_id: str):

    series = orthanc_request("GET", f"/series/{series_id}").json()
    slices = []

    for instance_id in series["Instances"]:
        tags = orthanc_request("GET", f"/instances/{instance_id}/simplified-tags").json()

        if "Rows" not in tags or "Columns" not in tags:
            raise HTTPException(422, "This series contains a non-image instance.")

        if int(tags.get("NumberOfFrames") or 1) != 1:
            raise HTTPException(422, "This example supports one frame per DICOM file.")

        slices.append({
            "id": instance_id,
            "position": vector_tag(tags, "ImagePositionPatient", 3),
            "orientation": vector_tag(tags, "ImageOrientationPatient", 6),
            "instanceNumber": tags.get("InstanceNumber"),
        })

    if not slices:
        raise HTTPException(404, "This series has no instances.")

    has_geometry = all(
        item["position"] is not None
        and item["orientation"] is not None
        for item in slices
    )

    if has_geometry:
        reference = slices[0]["orientation"]
        row = reference[:3]
        column = reference[3:]

        if (abs(dot(row, row) - 1) > 0.01 or abs(dot(column, column) - 1) > 0.01 or abs(dot(row, column)) > 0.01):
            raise HTTPException(422, "Invalid image orientation.")

        for item in slices:
            if any(abs(a - b) > 0.0001 for a, b in zip(reference, item["orientation"])):
                raise HTTPException(422, "The series contains different orientations.")

        # This is where the real calculation happens 
        normal = cross(row, column) # calculate the normal 
        for item in slices:
            # measure the distance the image appears on along the normal
            item["distance"] = dot(item["position"], normal)

        # dsort based on this distance 
        slices.sort(key=lambda item: item["distance"])

        for previous, current in zip(slices, slices[1:]):
            if abs(current["distance"] - previous["distance"]) < 0.001:
                raise HTTPException(422, "Repeated slice positions detected. ")

    else:
        # we order on instanceNumber when there is no geometry 
        try:
            numbers = [int(item["instanceNumber"]) for item in slices]
        except (TypeError, ValueError):
            raise HTTPException(422, "Cannot determine slice order: missing geometry ")

        if len(set(numbers)) != len(numbers):
            raise HTTPException(422, "Cannot determine slice order: duplicate ")

        slices.sort(key=lambda item: int(item["instanceNumber"]))

        print('!! Instance number ordering used !!')

    return {
        "seriesId": series_id,
        "instanceIds": [item["id"] for item in slices],
    }

@app.get("/api/dicom/series/{series_id}/archive")
def download_series(series_id: str):
    response = orthanc_request(
        "GET",
        f"/series/{series_id}/archive",
    )

    return Response(
        content=response.content,
        media_type="application/zip",
        headers={
            "Content-Disposition":
                f'attachment; filename="series-{series_id}.zip"'
        },
    )
