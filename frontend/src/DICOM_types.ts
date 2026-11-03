

export type DicomInstance = {
    FileSize: number;
    FileUuid: string;
    ID: string;
    IndexInSeries: number | null;
    Labels: string[];
    MainDicomTags: {
        AcquisitionNumber?: string;
        ImageOrientationPatient?: string;
        ImagePositionPatient?: string;
        InstanceNumber?: string;
        SOPInstanceUID?: string;
    };
    ParentSeries: string;
    Type: "Instance";
};

export type DICOMSerie = {
    id: string;
    description: string;
    modality: string;
    bodyPart: string; 
    studyDescription: string; 
    seriesNumber: string;
    instanceCount: number;
};

export type StackResponse = {
    seriesId: string;
    instanceIds: string[];
};
