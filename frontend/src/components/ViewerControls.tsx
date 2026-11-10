import { useEffect, useState } from "react";
import {Enums, utilities, type Types} from "@cornerstonejs/core";
import { Slider, Stack } from "@mui/material";

type Props = {
    viewport: Types.IStackViewport;
};

export default function ViewerControls({ viewport }: Props) {

    const [window, setWindow] = useState({level: 40, width: 400});

    useEffect(() => {

        function syncFromViewport() {
            const range = viewport.getProperties().voiRange;
            if (!range) return;

            const { windowCenter, windowWidth } = utilities.windowLevel.toWindowLevel(range.lower, range.upper);

            setWindow({level: windowCenter, width: windowWidth});
        }

        syncFromViewport();

        viewport.element.addEventListener(
            Enums.Events.VOI_MODIFIED,
            syncFromViewport
        );

        viewport.element.addEventListener(
            Enums.Events.STACK_NEW_IMAGE,
            syncFromViewport
        );

        return () => {
            viewport.element.removeEventListener(
                Enums.Events.VOI_MODIFIED,
                syncFromViewport
            );

            viewport.element.removeEventListener(
                Enums.Events.STACK_NEW_IMAGE,
                syncFromViewport
            );
        };
    }, [viewport]);

    function applyWindow(level: number, width: number) {
        const safeWidth = Math.max(1, width);

        setWindow({ level, width: safeWidth });

        viewport.setProperties({
            VOILUTFunction: Enums.VOILUTFunctionType.LINEAR,
            voiRange: utilities.windowLevel.toLowHighRange(safeWidth, level),
        });

        viewport.render();
    }

    return (
        <Stack>
            <h3>Window settings</h3>

            <p>Window Level: {Math.round(window.level)}</p>

            <Slider
                sx={{width: '512px'}}
                min={Math.min(-1500, window.level)}
                max={Math.max(3000, window.level)}
                step={1}
                value={window.level}
                onChange={(_, value) => {
                    applyWindow(value, window.width)
                }}
            />

            <p>Window Width: {Math.round(window.width)}</p>
            <Slider
                sx={{width: '512px'}}
                min={1}
                max={Math.max(5000, window.width)}
                step={1}
                value={window.width}
                onChange={(_, value) => {
                    applyWindow(window.level, value)
                }}
            />
        </Stack>
    );
}
