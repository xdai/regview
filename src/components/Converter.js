import { splitKey } from './Utils';

let siglofyName = (name) => {
    return name.replace(/[^a-zA-Z0-9]+/gi, ' ').trim().split(' ').map(
        s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
    ).join('');
}

let forEachNode = (data, rootKey, func) => {
    const root = data[rootKey];
    func(root.node, root.address, root.children);
    root.children.forEach(childKey => forEachNode(data, childKey, func));
}

let forEachGroup = (data, rootKey, func) => {
    forEachNode(data, rootKey, (node, address, children) => {
        if (node.name.endsWith('/')) {
            func(node, address, children);
        }
    });
}

let forEachRegister = (data, rootKey, func) => {
    forEachNode(data, rootKey, (node, address, children) => {
        if (!node.name.endsWith('/')) {
            func(node, address, children);
        }
    });
}

let convertToJson = (data) => {
    const obj = [];
    for (let key in data) {
        obj.push(data[key].node);
    }

    return JSON.stringify(obj, null, 2);
}

let convertToMacro = (data) => {
    let result = '';

    forEachRegister(data, '/', (node) => {
        const nodeName = siglofyName(node.name)
        
        result += `// ${node.desc_short}\n`;
        result += `NN_USB_DEFINE_REG_OFFSET ( ${nodeName}, ${node.offset} );\n`;
        
        node.fields.forEach((field) => {
            const fieldName = siglofyName(field.name);
            
            result += `NN_USB_DEFINE_FIELD32    ( ${nodeName}, ${fieldName}, ${field.bits[1]}, ${field.bits[0]} );\n`;
        });
        
        result += '\n';
    })
    
    return result;
}

let convertToTemplate = (data) => {
    let result = '';

    // Copyright
    result += "/*--------------------------------------------------------------------------------*\n";
    result += "  Copyright (C)Nintendo All rights reserved.\n";
    result += "\n";
    result += "  These coded instructions, statements, and computer programs contain proprietary\n";
    result += "  information of Nintendo and/or its licensed developers and are protected by\n";
    result += "  national and international copyright laws. They may not be disclosed to third\n";
    result += "  parties or copied or duplicated in any form, in whole or in part, without the\n";
    result += "  prior written consent of Nintendo.\n";
    result += "\n";
    result += "  The content herein is highly confidential and should be handled accordingly.\n";
    result += " *--------------------------------------------------------------------------------*/\n";

    // Nolint
    result += "\n";
    result += "// NOLINT(build/header_guard)\n";
    result += "\n";

    let getLevel = (parentName) => {
        try {
            let level = 0;
            for (let c of parentName) {
                if (c === '/') {
                    level += 1;
                }
            }
            return level;
        } catch (err) {
            return 0;
        }
    };

    let getEnclosingName = (parentName) => {
        return parentName.slice(1, -1).split('/').filter(s => s !== '').map((s, i) => `M${siglofyName(s)}<AddressPolicy${i+1}>`).join('::');
    };

    let getFactoryName = (path) => {
        return siglofyName(splitKey(path)[1]);

    };

    let getClasslName = (path) => {
        return "M" + getFactoryName(path);
    };

    const rootClassName = 'Register';

    result += `class ${rootClassName} {\n`;
    result += `public:\n`;
    result += `    static const uintptr_t g_Address = 0;\n`;
    result += `\n`;
    result += `private:\n`;
    data['/'].children.forEach((child) => {
        result += `    template <template<uintptr_t> class AddressPolicy> class ${getClasslName(child)};\n`;
    });
    result += `\n`;
    result += `public:\n`;
    data['/'].children.forEach((child) => {
        result += `\n`;
        result += `    /*\n`;
        result += `     * Child: ${child}\n`;
        result += `     */\n`;
        result += `\n`;
        result += `    template <template<uintptr_t> class AddressPolicy = Fixed>\n`;
        result += `    static ${getClasslName(child)}<AddressPolicy> ${getFactoryName(child)}();\n`;
        result += `\n`;
        result += `    template <template<uintptr_t> class AddressPolicy>\n`;
        result += `    static ${getClasslName(child)}<AddressPolicy> ${getFactoryName(child)}(uintptr_t n);\n`;
        
    });
    result += `};\n`;

    forEachGroup(data, '/', (node, address, children) => {
        if (!node.parent) {
            return;
        }

        const level = getLevel(node.parent);
        const className = level ? getClasslName(node.parent + node.name) : rootClassName;
        const enclosingName = rootClassName + (getEnclosingName(node.parent) ? '::' + getEnclosingName(node.parent) : '');
        const baseClassName = `AddressPolicy${level}<0x${address.toString(16)}>`;

        result += `\n`;
        result += `/*\n`;
        result += ` * ${(node.parent || "") + node.name}\n`;
        result += ` *   - Base:    0x${(address - parseInt(node.offset, 16)).toString(16)}\n`
        result += ` *   - Offset:  0x${node.offset}\n`;
        result += ` *   - Address: 0x${address.toString(16)}\n`;
        result += ` */\n`;

        
        for (let i = 1; i <= level; i++) {
            result += `template <template<uintptr_t> class AddressPolicy${i}>\n`;
        }
        result += `class ${enclosingName}::${className} : public ${baseClassName} {\n`;
        result += `public:\n`;
        result += `    typedef ${enclosingName} ParentType;\n`;
        result += `    typedef ${baseClassName} BaseType;\n`;
        result += `    static const uintptr_t g_Offset = 0x${node.offset};\n`;
        result += `    static const uintptr_t g_Address = ParentType::g_Address + g_Offset;\n`;
        
        result += `\n`;
        result += `private:\n`;
        children.forEach((child) => {
            result += `    template <template<uintptr_t> class AddressPolicy> class ${getClasslName(child)};\n`;
        });
        
        result += `\n`;
        result += `public:\n`;
        result += `    explicit ${className}(uintptr_t n)\n`;
        result += `        : BaseType(n)\n`;
        result += `    {\n`;
        result += `    }\n`;
        
        children.forEach((child) => {
            result += `\n`;
            result += `    /*\n`;
            result += `     * Child: ${child}\n`;
            result += `     */\n`;
            result += `\n`;
            result += `    template <template<uintptr_t> class AddressPolicy = Fixed>\n`;
            result += `    ${getClasslName(child)}<AddressPolicy> ${getFactoryName(child)}() const ;\n`;
            result += `\n`;
            result += `    template <template<uintptr_t> class AddressPolicy>\n`;
            result += `    ${getClasslName(child)}<AddressPolicy> ${getFactoryName(child)}(uintptr_t n) const;\n`;
            result += `\n`;
            result += `    template <>\n`;
            result += `    ${getClasslName(child)}<Fixed> ${getFactoryName(child)}() const\n`;
            result += `    {\n`;
            result += `        return ${getClasslName(child)}<Fixed>(this->GetAddress() - g_Address);\n`
            result += `    }\n`;
            result += `\n`;
            result += `    template <>\n`;
            result += `    ${getClasslName(child)}<At> ${getFactoryName(child)}(uintptr_t address) const\n`;
            result += `    {\n`;
            result += `        return ${getClasslName(child)}<At>(address);\n`
            result += `    }\n`;
            result += `\n`;
            result += `    template <>\n`;
            result += `    ${getClasslName(child)}<Offset> ${getFactoryName(child)}(uintptr_t offset) const\n`;
            result += `    {\n`;
            result += `        return ${getClasslName(child)}<Offset>(this->GetAddress() - g_Address + offset);\n`
            result += `    }\n`;
        });
        
        result += `};\n`;
    });

    forEachRegister(data, '/', (node, address) => {
        const level = getLevel(node.parent);
        const className = getClasslName(node.parent + node.name);
        const enclosingName = rootClassName + (getEnclosingName(node.parent) ? '::' + getEnclosingName(node.parent) : '');
        const baseClassName = `AddressPolicy${level}<0x${address.toString(16)}>`;

        result += `\n`;
        result += `/*\n`;
        result += ` * ${node.parent + node.name}\n`;
        result += ` *   - Base:    0x${(address - parseInt(node.offset, 16)).toString(16)}\n`
        result += ` *   - Offset:  0x${node.offset}\n`;
        result += ` *   - Address: 0x${address.toString(16)}\n`;
        result += ` */\n`;

        for (let i = 1; i <= level; i++) {
            result += `template <template<uintptr_t> class AddressPolicy${i}>\n`;
        }
        result += `class ${enclosingName}::${className} : public ${baseClassName} {\n`;
        result += `public:\n`;
        result += `    typedef ${enclosingName} ParentType;\n`;
        result += `    typedef ${baseClassName} BaseType;\n`;
        result += `\n`;
        result += `    static const uintptr_t g_Offset = 0x${node.offset};\n`;
        result += `    static const uintptr_t g_Address = ParentType::g_Address + g_Offset;\n`;
        result += `    static const size_t    g_Size = ${node.size};\n`;
        result += `\n`;
        result += `    typedef typename BaseTypeOfLength<g_Size>::value ValueType;\n`;
        result += `\n`;
        result += `    class Data;\n`;
        result += `\n`;
        result += `public:\n`;
        result += `    explicit ${className}(uintptr_t n)\n`;
        result += `        : BaseType(n)\n`;
        result += `    {\n`;
        result += `    }\n`;
        result += `\n`;
        result += `    Data Get() const\n`;
        result += `    {\n`;
        result += `        return Data(\n`;
        result += `            *reinterpret_cast<volatile ValueType*>(this->GetAddress())\n`;
        result += `        );\n`;
        result += `    }\n`;
        result += `\n`;
        result += `    void Set(ValueType value)\n`;
        result += `    {\n`;
        result += `        *reinterpret_cast<volatile ValueType*>(this->GetAddress()) = value;\n`;
        result += `    }\n`;
        result += `};\n`;

        result += `\n`;
        for (let i = 1; i <= level; i++) {
            result += `template <template<uintptr_t> class AddressPolicy${i}>\n`;
        }
        result += `class ${enclosingName}::${className}<AddressPolicy${level}>::Data : public DataBase<ValueType> {\n`;
        result += `private:\n`;
        result += `    ValueType m_Value;\n`
        result += `\n`;
        node.fields.forEach((field) => {
            result += `    typedef Field<${field.bits[0]}, ${field.bits[1]}> M${siglofyName(field.name)};\n`;
        });
        result += `\n`;
        result += `public:\n`;
        result += `    Data(ValueType value)\n`;
        result += `        : m_Value(value)\n`;
        result += `    {\n`;
        result += `    }\n`;
        result += `\n`;
        result += `    operator ValueType() const\n`;
        result += `    {\n`;
        result += `        return m_Value;\n`;
        result += `    }\n`;
        node.fields.forEach((field) => {
            const fieldName = siglofyName(field.name);
            result += `\n`;
            result += `    template <typename T = void>\n`;
            result += `    int ${fieldName}() const\n`;
            result += `    {\n`;
            result += `        return this->template Get<M${fieldName}>(m_Value);\n`
            result += `    }\n`;
            result += `\n`;
            result += `    template <typename T = void>\n`;
            result += `    Data& ${fieldName}(int value)\n`;
            result += `    {\n`;
            result += `        this->template Set<M${fieldName}>(m_Value, value);\n`
            result += `        return *this;\n`;
            result += `    }\n`;
        });
        result += `};\n`;
    });

    data['/'].children.forEach((child) => {
        result += `\n`;
        result += `template <>\n`;
        result += `${rootClassName}::${getClasslName(child)}<Fixed> ${rootClassName}::${getFactoryName(child)}()\n`;
        result += `{\n`;
        result += `    return ${getClasslName(child)}<Fixed>(0);\n`
        result += `}\n`;
        result += `\n`;
        result += `template <>\n`;
        result += `${rootClassName}::${getClasslName(child)}<At> ${rootClassName}::${getFactoryName(child)}(uintptr_t address)\n`;
        result += `{\n`;
        result += `    return ${getClasslName(child)}<At>(address);\n`
        result += `}\n`;
        result += `\n`;
        result += `template <>\n`;
        result += `${rootClassName}::${getClasslName(child)}<Offset> ${rootClassName}::${getFactoryName(child)}(uintptr_t offset)\n`;
        result += `{\n`;
        result += `    return ${getClasslName(child)}<Offset>(offset);\n`
        result += `}\n`;
    });

    return result;
}

export let convertTo = (data, format) => {
    const converter = {
        json: {
            handle: convertToJson,
            descripton: 'JSON'
        } ,
        macro: {
            handle: convertToMacro,
            descripton: 'C/C++ Macro'
        },
        template: {
            handle: convertToTemplate,
            descripton: 'C++ Template'
        }
    }[format];

    return ({
        data: converter.handle(data),
        descripton: converter.descripton
    });
}