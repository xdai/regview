import React, { useEffect, useState } from 'react';
import { Tree, Input, Row, Col, Typography, Modal, message } from 'antd';
import { DownOutlined, EditOutlined, DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons';

import { GroupEditorModal } from './GroupEditor';
import regDb from '../RegDb';
import './RegList.css';

export default function RegList(props) {
    const [treeData, setTreeData] = useState([]);
    const [savedKeys, setSavedKeys] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [expandedKeys, setExpandedKeys] = useState([]);
    const [selectedKeys, setSelectedKeys] = useState([]);
    const [searchValue, setSearchValue] = useState("");
    const [modalCtrl, setModalCtrl] = useState({show: false, parent: null, data: null});

    const handleClick = (key) => {
        const toggle = (lst, e) => {
            return lst.indexOf(e) !== -1 ? lst.filter(x=>x!==e) : [...lst, e];
        }
        if (key.endsWith("/")) {
            setExpandedKeys(keys => toggle(keys, key))
        } else {
            setSelectedKeys([key]);
            props.onSelect(key);
        }
    }

    const hierarchyToTreeData = (hierarchy, topKey) => hierarchy.map(node => {
        const onEdit = node.name.endsWith("/") ? async () => {
            const data = await regDb.get(topKey + node.name);
            setModalCtrl({
                ...modalCtrl,
                show: true,
                data: data,
            })
        } : null;
        return ({
            key: topKey + node.name,
            title: <TreeTitle name={node.name} parent={topKey} onEdit={onEdit} onClick={handleClick}/>,
            children: hierarchyToTreeData(node.children, topKey + node.name),
            isLeaf: !node.name.endsWith("/"),
        })
    });

    const fetchData = async () => {
        const hierarchy = await regDb.getHierarchy();
        const treeData = hierarchyToTreeData(hierarchy, "/");
        if (treeData.length > 0) { // keep this check, or there will be an error when you delete last entry
            setTreeData(treeData);
        }
    }

    // N.B. if it matchs a group name, then none of the decendant of that group should be hidden.
    const filterTreeData = (data, filter) => {
        return data.reduce((acc, cur) => {
            if (cur.key.endsWith("/")) {
                const props = filterTreeData(cur.children, filter);
                if (props.treeData.length || filter.test(cur.key)) {
                    acc.treeData.push({
                        ...cur,
                        children: props.treeData,
                    });
                    acc.expandedKeys = [...acc.expandedKeys, ...props.expandedKeys, cur.key];
                }
            } else {
                if (filter.test(cur.key)) {
                    acc.treeData.push(cur);
                }
            }
            return acc;
        }, {treeData: [], expandedKeys: []});
    }

    // `fetchData` on mount
    useEffect(() => {fetchData()}, []);

    // handle DB change
    useEffect(() => {
        const handleUpdate = ({oldData, newData}) => {
            const oldKey = oldData.parent + oldData.name;
            const newKey = newData.parent + newData.name;
            if (oldKey !== newKey) {
                setExpandedKeys(keys => keys.map(key => key.replace(oldKey, newKey)));
            }
        }
        
        const handleDelete = async ({deletedKeys}) => {
            const n = await regDb.count();
            if (n > 1) { // keep this check, or there will be an error when you delete last entry
                setExpandedKeys(keys => keys.filter(key => !deletedKeys.includes(key)));
            }
        }

        const handleImport = () => {
            fetchData();
        }
        
        regDb.subscribe(
            handleUpdate, "update"
        ).subscribe(
            handleDelete, "delete"
        ).subscribe(
            handleImport, "import"
        ).subscribe(fetchData);

        return () => {
            regDb.unsubscribe(
                handleUpdate, "update"
            ).unsubscribe(
                handleDelete, "delete"
            ).unsubscribe(
                handleImport, "import"
            ).unsubscribe(fetchData);
        }
    }, [])

    // update `treeProps` whenever `treeData` or `searchValue` is changed
    useEffect(() => {
        if (searchValue === "") {
            setFilteredData(treeData);
        } else {
            const re = new RegExp(searchValue, "i");
            const result = filterTreeData(treeData, re);
            setFilteredData(result.treeData);
            setExpandedKeys(result.expandedKeys);
        }
    }, [treeData, searchValue]);

    const onSearchChange = (e) => {
        const value = e.target.value;
        if (searchValue === "") { // preserve `expandedKeys`
            setSavedKeys(expandedKeys);
        } else if (value === "") { // restore `expandedKeys`
            setExpandedKeys(savedKeys);
        }
        setSearchValue(value);
    }

    return (
        <>
            <div className="reg-list">
                <Input.Search placeholder="Regex" onChange={onSearchChange} /> 
                <div className="tree-container">
                    <Tree 
                        blockNode
                        switcherIcon={<DownOutlined/>}
                        onExpand={setExpandedKeys}
                        treeData={filteredData}
                        expandedKeys={expandedKeys}
                        selectedKeys={selectedKeys}
                    />
                </div>
            </div>
            
            {modalCtrl.show && <GroupEditorModal
                parent={modalCtrl.parent}
                grp={modalCtrl.data}
                title="Edit Group"
                hide={()=>setModalCtrl({...modalCtrl, show: false})}
            />}
        </>
    );
}

function TreeTitle(props) {
    const {name, parent, onEdit, onClick} = props;
    const title = name.endsWith("/") ? name.slice(0, -1) : name;

    const handleDelete = (e) => {
        e.stopPropagation();
        const key = parent + name;
        const modalContent = 
            <p>
                This will delete entry <Typography.Text code>{key}</Typography.Text>
                {key.endsWith("/") && " and everything underneath it"}.
                There is no way back.
            </p>;
        
        const modal = Modal.confirm({
            title: "Are you sure?",
            icon: <ExclamationCircleOutlined />,
            content: modalContent,
            async onOk() {
                modal.update({
                    okButtonProps: {loading: true},
                });
                try {
                    await regDb.delete(key);
                    message.success(
                        <span><Typography.Text code>{key}</Typography.Text> Deleted</span>
                    );
                }
                catch (e) {
                    message.error(`${e.name}: ${e.message}`);
                }
            },
        })
    }

    const editBtn = onEdit ? (
        <EditOutlined
            className="act-edit"
            onClick={onEdit}
        />
    ) : null;

    const deleteBtn = 
        <DeleteOutlined
            className="act-delete"
            onClick={handleDelete}
        />;
    
    return (
        <Row className="tree-title" >
            <Col flex="auto" onClick={()=>onClick(parent+name)}> {title} </Col>
            <Col> {editBtn} {deleteBtn} </Col>
        </Row>
    )
}