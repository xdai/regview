import React, { useState, useEffect } from 'react';

import { Cascader } from 'antd';
import regDb from '../RegDb';

export default function GroupSelect(props) {
    const [path, onChange, except] = [props.value, props.onChange, props.except];
    const [options, setOptions] = useState([]);

    const fetchData = async () => {
        const hierarchy = await regDb.getHierarchy();
        const options = hierarchyToOptions(hierarchy, "/")
        setOptions([{
            value: "/",
            label: "/",
            ...(options.length && {
                children: options
            }),
        }]);
    }

    // `options` props of `Cascader` doesn't like `children` to be empty array.
    const hierarchyToOptions = (hierarchy, topKey) => {
        const v = hierarchy.filter(
            node => node.name.endsWith("/") && (!except || topKey + node.name !== except)
        ).map(
            node => {
                const options = hierarchyToOptions(node.children, topKey + node.name);
                return {
                    value: node.name,
                    label: node.name.slice(0, -1),
                    ...(options.length && {
                        children: options
                    })
                }
            }
        );
        return v;
    }

    const pathToValue = (path) => {
        if (!path) return [];
        if (path === "/") return ["/"];
        return path.split("/").slice(0, -1).map(x=>x+"/");
    }

    const valueToPath = (value) => {
        return value.join("");
    }

    const displayRender = (label, selectedOptions) => {
        return label.length ? ["", ...label.slice(1), ""].join(" / ") : "";
    }

    useEffect(() => {fetchData()}, []);

    return (
        <Cascader 
            allowClear={false}
            changeOnSelect 
            displayRender={displayRender} 
            options={options} 
            value={pathToValue(path)}
            onChange={v=>onChange(valueToPath(v))}
        />
    );
}