import React, { useState } from 'react';

// antd
import { Tooltip } from 'antd';

import './BitGrid.css';

export const idleFieldCtrl = {
	mode: "idle",
	activeKey: NaN,
	selectedBits: [],
};

export function BitViewer(props) {
    const {cellWidth, bitsPerRow, byteCount} = props;
    const geometry = {
        cellWidth: cellWidth,
        bitsPerRow: Math.min(bitsPerRow, 8 * byteCount),
        byteCount: byteCount,
    };

    return (
        <BitGridContainer {...geometry}>
            <Viewer
                {...geometry}
                fields={props.fields}
            />
        </BitGridContainer>
    );
}

export function BitEditor(props) {
    const {
        cellWidth, bitsPerRow, byteCount, // geometry
        form, // form instance it belongs to
        value, onChange // customized form control 
	} = props;

	const _roundUpToPow2 = (v) => {
        if (isNaN(v)) return 1;
        for (let i = 0; ; i++) {
            if (v <= (1 << i)) {
                return 1 << i;
            }
        }
	};
	
	const roundedUpBytes = _roundUpToPow2(byteCount);

    const geometry = {
        cellWidth: cellWidth,
        bitsPerRow: Math.min(bitsPerRow, 8 * roundedUpBytes),
        byteCount: roundedUpBytes,
	};
	
	const fields = form.getFieldValue("fields");

    const triggerChange = changedValue => {
        onChange && onChange({
            ...value,
            ...changedValue,
        });
    }

	const startEditingField = (field) => {
        triggerChange({
            mode: "editing",
            activeKey: fields.indexOf(field),
            selectedBits: field.bits,
        })
    }

	const stopEditingField = async (key) => {
        await props.commitField(key);
	}
    
    const startAddingField = (pos) => {
        triggerChange({
            mode: "adding",
            activeKey: NaN,
            selectedBits: [pos],
        })
    }
	
	const stopAddingField = async () => {
        await props.commitField(NaN)
	};

    const changeFieldRange = (key, pos) => {
		const isNewField = isNaN(key);

		// merge `value` into `array[idx]`, return new array
		const _patchArray = (array, idx, value) => {
			const data = [...array];
			data[idx] = {
				...data[idx],
				...value,
			};
			return data;
		}
		
		// don't update the range if it's not closed
		if (value.selectedBits.length === 0 || value.selectedBits.length === 2) {
			triggerChange({selectedBits: [pos]});
		}

		// now we got a closed range, do the acture update
		if (value.selectedBits.length === 1) {
			const selectedBits = [...value.selectedBits, pos].sort((a, b) => a - b);
			
			triggerChange({	selectedBits: selectedBits});
			
			if (isNewField) {
				form.setFieldsValue({
					newField: {
						bits: selectedBits,
					}
				});
			} else {
				const fields = form.getFieldValue("fields");
				form.setFieldsValue({
					fields: _patchArray(fields, key, {bits: selectedBits})
                });
			}
		}
	}

	const onInteraction = async (target, arg) => {
		switch (value.mode) {
		case "idle":
			if (target === "field") {
				startEditingField(arg);
			} else if (target === "bit") {
				startAddingField(arg);
			}
			break;

		case "editing":
			if (target === "field" && value.selectedBits.length === 2) {
                await stopEditingField(value.activeKey);
                startEditingField(arg);
			} else if (target === "bit") {
				changeFieldRange(value.activeKey, arg);
			}
			break;

		case "adding":
			if (target === "field" && value.selectedBits.length === 2) {
                await stopAddingField();
                startEditingField(arg);
			} else if (target === "bit") {
				changeFieldRange(NaN, arg);
			}
			break;

		default:
			break;
		}
	}

    return (
        <BitGridContainer {...geometry}>
            <Editor
                {...geometry}
                {...value}
                fields={fields}
                onClick={onInteraction}
            />
        </BitGridContainer>
    );
}

function BitGridContainer(props) {
    const {cellWidth, bitsPerRow, byteCount} = props;
    const borderWidth = 2;
    const gapWidth = 1;
    const bitGridWidth = borderWidth * 2 + cellWidth * bitsPerRow + gapWidth * (bitsPerRow - 1);
    const containerStyle = {
        gridTemplateColumns: `${bitGridWidth}px 80px`,
        lineHeight: `${cellWidth}px`
    };
    const gridStyle = {
        gridTemplateColumns: `repeat(${props.bitsPerRow}, ${props.cellWidth}px)`,
        gridAutoRows: `${props.cellWidth}px`,
    };

    return (
        <div className="bit-grid" style={containerStyle}>
            <BitPosMarker cellWidth={cellWidth} bitsPerRow={bitsPerRow} />
            <ByteOffset   cellWidth={cellWidth} bitsPerRow={bitsPerRow} byteCount={byteCount} />
            <div className="grid" style={gridStyle}>
                {props.children}
            </div>
        </div>
    );
}

function BitPosMarker(props) {
    let marker = [];
    const style = {
        gridTemplateColumns: `repeat(${props.bitsPerRow}, ${props.cellWidth}px)`,
	    gridAutoRows: `${props.cellWidth}px`
    };

    for (let i=props.bitsPerRow-1; i>=0; i--) {
        marker.push(
            <div key={i} className="bit-pos-indicator">{i}</div>
        );
    }

    return (
        <div className="bit-pos-marker" style={style}> 
            {marker} 
        </div>
    ); 
}

function ByteOffset(props) {
    let offsets = [];
    const bytesPerRow = props.bitsPerRow / 8;
    const style = {
        gridAutoRows: `${props.cellWidth}px`,
    };

    for (let i = 0; i < props.byteCount; i += bytesPerRow) {
        const labelLow  = ("00" + (i).toString(16)).substr(-2).toUpperCase();
        const labelHigh = ("00" + (i + bytesPerRow - 1).toString(16)).substr(-2).toUpperCase();
        offsets.push(<div key={i}>{labelHigh}-{labelLow}H</div>);
    }

    return (
        <div className="byte-offset" style={style}> 
            {offsets} 
        </div>
    );
}

function Viewer(props) {
	const {fields, bitsPerRow, byteCount} = props;
    const segments = segmentFields(fields, bitsPerRow, byteCount);

    const children = segments.map(seg => (
        <Fragment
            key={seg.low}
            low={seg.low}
            high={seg.high}
            bitsPerRow={bitsPerRow}
        >{
            isNaN(seg.fieldIdx) ? (
                <div className="field-fragment-rsvd">
                    Rsvd
                </div>
            ) : (
                <div className="field-fragment">
                    <Tooltip 
                        placement="top" 
                        title={`[${fields[seg.fieldIdx].bits[1]}:${fields[seg.fieldIdx].bits[0]}] ${fields[seg.fieldIdx].meaning}`}
                    >
                        {fields[seg.fieldIdx].name}
                    </Tooltip>
                </div>
             )
        }</Fragment>
    ));

    return children;
}

function Editor(props) {
    const [hoverBit, setHoverBit] = useState(NaN);
    const {fields, activeKey, selectedBits} = props;
	const segments = segmentFields(fields, props.bitsPerRow, props.byteCount);
	
    const getMaxRange = (pos) => {
        const idx = segments.findIndex(seg => seg.low <= pos && pos <= seg.high);
        let {low, high} = segments[idx];

        for (let i = idx - 1; i >= 0; i--) {
            if (isNaN(segments[i].fieldIdx) || segments[i].fieldIdx === activeKey) {
				low = segments[i].low;
            } else {
				break;
            }
        }

        for (let i = idx + 1; i < segments.length; i++) {
            if (isNaN(segments[i].fieldIdx) || segments[i].fieldIdx === activeKey) {
				high = segments[i].high;
			} else {
                break;
            }
        }
        
        return [low, high];
    }

	const interactiveBitRange = selectedBits.length === 1 ? getMaxRange(selectedBits[0]) : null;
	
    const shouldHighlight = (pos) => {
        let range = [...selectedBits];
        if (range.length === 1) {
            range.push(isNaN(hoverBit) ? range[0] : hoverBit);
            range.sort((a, b) => a - b);
        }
        return (pos >= range[0] && pos <= range[1]);
	};
    
    const children = segments.map(seg => (
        <FieldFragment
            key={seg.low}
            low={seg.low}
            high={seg.high}
            cellWidth={props.cellWidth}
            bitsPerRow={props.bitsPerRow}
            byteCount={props.byteCount}
            field={fields[seg.fieldIdx]} 
            onClick={props.onClick}
            onHover={setHoverBit}
            shouldHighlight={shouldHighlight}
            interactiveBitRange={interactiveBitRange}
            breakToBits={
				// rsvd field
				isNaN(seg.fieldIdx) ||
				// active field 
				activeKey === seg.fieldIdx
			}
        />
    ));

    return children;
}

function Fragment(props) {
	const _getCoordinate = (offset, width) => {
		const row = Math.floor(offset / width) + 1;
		const col = width - offset % width;
		return [row, col];
	}
	
	const [rowLow,  colLow] =  _getCoordinate(props.low,  props.bitsPerRow);
    const [rowHigh, colHigh] = _getCoordinate(props.high, props.bitsPerRow);
    const style = {
        gridArea: `${rowLow} / ${colHigh} / ${rowHigh + 1} / ${colLow + 1}`
    };

    return <div style={style}> {props.children} </div>;
}

function FieldFragment(props) {
    const geometry = {
        low: props.low,
        high: props.high,
        bitsPerRow: props.bitsPerRow
    };

    const isInteractive = (pos) => {
        if (!props.interactiveBitRange) return true;
        return props.interactiveBitRange[0] <= pos && pos <= props.interactiveBitRange[1];
    }

    return props.breakToBits ? (
        [...Array(props.high - props.low + 1).keys()].map(x => (
            <Bit
                key={x}
                pos={x + props.low}
                bitsPerRow={props.bitsPerRow}
                highlight={props.shouldHighlight(x + props.low)}
                onClick={
                    isInteractive(x + props.low) ? ()=>props.onClick("bit", x + props.low) : ()=>{}
                }
                onHover={
                    isInteractive(x + props.low) ? props.onHover : ()=>{}
                }
            />
        ))
    ) : (
        <Fragment {...geometry}>
            <Tooltip 
                placement="top" 
                title={`[${Math.min(8*props.byteCount-1, props.field.bits[1])}:${props.field.bits[0]}] ${props.field.meaning}`}
            >
                <div 
                    className="field-fragment"
                    style={{height: props.cellWidth}}
                    onClick={()=>props.onClick("field", props.field)}
                >
                    {props.field.name}
                </div>
            </Tooltip>
        </Fragment>
    )
}

/*
 * props:
 *  - pos: number
 *  - bitsPerRow: number
 *  - onClick: (string, number) => { }
 *  - onHover: (number) => { }
 */
function Bit(props) {
    const geometry = {
        low: props.pos,
        high: props.pos,
        bitsPerRow: props.bitsPerRow
    };

    return (
        <Fragment {...geometry}>
            <div 
                className={`bit${props.highlight ? " highlight" : ""}`}
                onClick={()=>props.onClick("bit", props.pos)}
                onMouseOver={()=>props.onHover(props.pos)}
            >
                {props.pos}
            </div>
        </Fragment>
    );
}

// break `field` to `segments` on `boundary`
function segmentField(boundary, low, high, fieldIdx) {
    const segments = [];

    while (low <= high) {
        const pos = Math.min(low | (boundary - 1), high);
        segments.push({
            low: low,
            high: pos,
            fieldIdx: fieldIdx, // of which this segment belongs to
        });
        low = pos + 1;
    }

    return segments;
}

function segmentFields(fields, bitsPerRow, byteCount) {
    let segments = [];
    let pos = 0;
    
    [...fields].sort(
        (a, b) => a.bits[0] - b.bits[0]
    ).forEach(field => {
        // rsvd field
        if (pos < field.bits[0]) {
            segments = [
                ...segments, 
                ...segmentField(bitsPerRow, pos, field.bits[0] - 1, NaN)
            ];
        }
        // real field
        segments = [
            ...segments, 
            ...segmentField(bitsPerRow, ...field.bits, fields.indexOf(field))
        ];
        pos = field.bits[1] + 1;
    });

    // rsvd field
    if (pos < 8 * byteCount) {
        segments = [
            ...segments, 
            ...segmentField(bitsPerRow, pos, 8 * byteCount - 1, NaN)
        ];
    }

    return segments.filter(seg => seg.high < 8 * byteCount);
}