import { splitKey } from './Utils';

let siglofyName = (name) => {
    return name.replace(/[^a-zA-Z0-9]+/gi, ' ').trim().split(' ').map(
        s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
    ).join('');
}

let classifyName = (name) => {
    return siglofyName(name) + 'Type';
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

// The scheme generated by this method is deprecated now.
// Please see convertToCpp() below for the current scheme.
let convertToTemplate = (data) => {
    let result = '';
    
    // BOM
    // result += '\357\273\277';

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
        result += `    typedef typename BaseTypeOfBytes<g_Size>::value ValueType;\n`;
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
        result += `    explicit Data(ValueType value)\n`;
        result += `        : m_Value(value)\n`;
        result += `    {\n`;
        result += `    }\n`;
        result += `\n`;
        result += `    NN_IMPLICIT operator ValueType() const\n`;
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

// This generates the scheme described on confluence.
let convertToCpp = (data) => {
    let result = '';
    
    // BOM
    // result += '\357\273\277';

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

    result += "\n";
    result += "/**\n";
    result += " * @file\n";
    result += " * @brief Automatically generated Register Accessors\n";
    result += " */\n";

    // Nolint
    result += "\n";
    result += "// NOLINT(build/header_guard)\n";

    let getFactoryName = (path) => {
        return siglofyName(splitKey(path)[1]);

    };

    let getClasslName = (path) => {
        const segs = path.split('/').filter(s => s !== '');
        if (segs.length === 0) {
            return 'Register';
        } else {
            return classifyName(segs[segs.length - 1]);
        }
    };

    let getClasslNameLong = (path) => {
        return ['Register'].concat(path.split('/').filter(s => s !== '').map((s) => classifyName(s))).join('::');
    };

    let hasSymbolicValue = (field) => (field.value && field.value.length > 0);

    result += `\n`;
    result += `/**\n`;
    result += ` * @class At\n`;
    result += ` * @brief Address Policy Tag to apply an absolute runtime address\n`;
    result += ` *\n`;
    result += ` * @details\n`;
    result += ` *   This is an incomplete type intended to be used as dispatch tag for template\n`;
    result += ` *   methods. With this tag, the factory method to create a new instance of\n`;
    result += ` *   group or register will interpreate its sole argument as the absolute\n`;
    result += ` *   runtime address of such group or register.\n`;
    result += ` */\n`;
    result += `class At;\n`;
    
    result += `\n`;
    result += `/**\n`;
    result += ` * @class Offset\n`;
    result += ` * @brief Address Policy Tag to apply an extra address offset\n`;
    result += ` *\n`;
    result += ` * @details\n`;
    result += ` *   This is an incomplete type intended to be used as dispatch tag for template\n`;
    result += ` *   methods. With this tag, the factory method to create a new instance of\n`;
    result += ` *   group or register will interpreate its sole argument as an address offset.\n`;
    result += ` *   The runtime address of such group or register is calculated by adding\n`
    result += ` *   together:\n`;
    result += ` *   -# runtime address of its parent\n`;
    result += ` *   -# declare offset of itself\n`;
    result += ` *   -# this extra offset\n`;
    result += ` */\n`;
    result += `class Offset;\n`;
    const rootClassName = 'Register';

    //////////////////////////////////////////////////////////
    // Declarations
    //////////////////////////////////////////////////////////
    
    result += `\n`;
    result += `/**\n`;
    result += ` * @brief Top level class for the register accessors\n`;
    result += ` *\n`;
    result += ` * @details\n`;
    result += ` *   This class represents the top level container of all groups and registers.\n`;
    result += ` *   All of its data members and methods are static\n`;
    result += ` */\n`;
    result += `class ${rootClassName} {\n`;
    result += `public:\n`;
    result += `    /**\n`;
    result += `     * @brief Declare Address\n`;
    result += `     */\n`;
    result += `    static const uintptr_t g_DeclareAddress = 0;\n`;
    result += `    /**\n`;
    result += `     * @brief Runtime Address\n`;
    result += `     */\n`;
    result += `    static const uintptr_t g_RuntimeAddress = 0;\n`;
    result += `\n`;
    data['/'].children.forEach((path) => {
        result += `    class ${getClasslName(path)};\n`;
    });
    result += `\n`;
    result += `private:\n`;
    result += `    template <size_t N>\n`;
    result += `    struct  BaseTypeOfBytes_;\n`;
    result += `\n`;
    result += `    template <>\n`;
    result += `    struct BaseTypeOfBytes_<1> {\n`;
    result += `        typedef uint8_t value;\n`;
    result += `    };\n`;
    result += `\n`;
    result += `    template <>\n`;
    result += `    struct BaseTypeOfBytes_<2> {\n`;
    result += `        typedef uint16_t value;\n`;
    result += `    };\n`;
    result += `\n`;
    result += `    template <>\n`;
    result += `    struct BaseTypeOfBytes_<4> {\n`;
    result += `        typedef uint32_t value;\n`;
    result += `    };\n`;
    result += `\n`;
    result += `    template <>\n`;
    result += `    struct BaseTypeOfBytes_<8> {\n`;
    result += `        typedef uint64_t value;\n`;
    result += `    };\n`;
    result += `\n`;
    result += `    static constexpr size_t CeilP2Helper_(size_t n, size_t shift) {\n`;
    result += `        return (n & (n - 1)) ? CeilP2Helper_(n & (n - 1), 1) : (n << shift);\n`;
    result += `    }\n`;
    result += `\n`;
    result += `    static constexpr size_t CeilP2_(size_t n) {\n`;
    result += `        return n ? CeilP2Helper_(n, 0) : 0;\n`;
    result += `    }\n`;
    result += `\n`;
    result += `    template <size_t N>\n`;
    result += `    struct BaseTypeOfBits_ {\n`;
    result += `        typedef typename BaseTypeOfBytes_<CeilP2_((N + 7) / 8)>::value value;\n`;
    result += `    };\n`;
    result += `\n`;
    result += `    template <uint8_t L, uint8_t H, typename T>\n`
	result += `    struct Field_ {\n`
    result += `        static const uint8_t low   = L;\n`;
    result += `        static const uint8_t high  = H;\n`;
    result += `\n`;
    result += `        NN_STATIC_ASSERT(low <= high);\n`;
    result += `        NN_STATIC_ASSERT(std::is_integral<T>::value);\n`;
    result += `        NN_STATIC_ASSERT(high < sizeof(T) * 8);\n`;
    result += `\n`;
    result += `        static const uint8_t shift = low;\n`;
    result += `        static const uint8_t size  = high - low + 1;\n`;
    result += `\n`;
    result += `        static const T mask = (size == sizeof(T) * 8) ? (~T{0}) : (((T{1} << size) - 1) << shift);\n`;
    result += `\n`;
    result += `        typedef typename BaseTypeOfBits_<size>::value ValueType;\n`
    result += `    };\n`

    result += `\n`;
    result += `public:\n`;
    data['/'].children.forEach((path) => {
        result += `\n`;
        result += `    /**\n`;
        result += `     * @brief Factory method to create an instance of ${path}\n`;
        result += `     * @details\n`;
        result += `     *   The runtime address of the new instance is calculated by adding together:\n`;
        result += `     *   -# runtime address of its parent\n`;
        result += `     *   -# declare offset of itself\n`;
        result += `     */\n`;
        result += `    static inline ${getClasslName(path)} ${getFactoryName(path)}() NN_NOEXCEPT;\n`;
        result += `\n`;
        result += `    /**\n`;
        result += `     * @brief Factory method to create an instance of ${path}\n`;
        result += `     * @details\n`;
        result += `     *   The runtime address of the new instance is determined by the template\n`;
        result += `     *   parameter, which can only be one of:\n`;
        result += `     *   - At\n`;
        result += `     *   - Offset\n`;
        result += `     */\n`;
        result += `    template <typename AddressPolicy>\n`;
        result += `    static inline ${getClasslName(path)} ${getFactoryName(path)}(uintptr_t) NN_NOEXCEPT;\n`;
        
    });
    result += `};\n`;

    forEachGroup(data, '/', (node, address, children) => {
        if (!node.parent) {
            return;
        }

        const className     = getClasslName(node.parent + node.name);
        const enclosingName = getClasslNameLong(node.parent);
        const offset = node.offset.match(/^0x/i) ? node.offset : `0x${node.offset}`;

        result += `\n`;
        result += `/**\n`;
        result += ` * @brief Class for group ${node.parent  + node.name}\n`;
        result += ` *\n`;
        result += ` * @details\n`;
        result += ` *   This class represents the group ${node.parent  + node.name}.\n`;
        result += ` *   The declared address information are:\n`;
        result += ` *   - %Base:    0x${(address - parseInt(offset)).toString(16)}\n`
        result += ` *   - %Offset:  ${offset}\n`;
        result += ` *   - %Address: 0x${address.toString(16)}\n`;
        result += ` */\n`;
        result += `class ${enclosingName}::${className} {\n`;
        result += `public:\n`;
        result += `    /**\n`;
        result += `     * @brief Declared Base Address\n`;
        result += `     */\n`;
        result += `    static const uintptr_t g_DeclareBase    = ${enclosingName}::g_DeclareAddress;\n`;
        result += `\n`;
        result += `    /**\n`;
        result += `     * @brief Declared Address Offset\n`;
        result += `     */\n`;
        result += `    static const uintptr_t g_DeclareOffset  = ${offset};\n`;
        result += `\n`;
        result += `    /**\n`;
        result += `     * @brief Declared Address\n`;
        result += `     */\n`;
        result += `    static const uintptr_t g_DeclareAddress = g_DeclareBase + g_DeclareOffset;\n`;
        result += `\n`;
        children.forEach((path) => {
            result += `    class ${getClasslName(path)};\n`;
        });
        result += `\n`;
        result += `private:\n`;
        result += `    uintptr_t m_RuntimeAddress{g_DeclareAddress};\n`;
        result += `\n`;
        result += `public:\n`;
        result += `    /**\n`;
        result += `     * @brief Constructor\n`;
        result += `     * @param[in] addr The runtime address\n`;
        result += `     */\n`;
        result += `    explicit ${className}(uintptr_t addr) NN_NOEXCEPT\n`;
        result += `        : m_RuntimeAddress(addr)\n`;
        result += `    {\n`;
        result += `    }\n`;
        result += `\n`;
        result += `    ${className}() NN_NOEXCEPT = default;\n`;
        
        children.forEach((path) => {
            result += `\n`;
            result += `    /**\n`;
            result += `     * @brief Factory method to create an instance of ${path}\n`;
            result += `     * @details\n`;
            result += `     *   The runtime address of the new instance is calculated by adding together:\n`;
            result += `     *   -# runtime address of its parent\n`;
            result += `     *   -# declare offset of itself\n`;
            result += `     */\n`;
            result += `    inline ${getClasslName(path)} ${getFactoryName(path)}() const NN_NOEXCEPT;\n`;
            result += `\n`;
            result += `    /**\n`;
            result += `     * @brief Factory method to create an instance of ${path}\n`;
            result += `     * @details\n`;
            result += `     *   The runtime address of the new instance is determined by the template\n`;
            result += `     *   parameter, which can only be one of:\n`;
            result += `     *   - At\n`;
            result += `     *   - Offset\n`;
            result += `     */\n`;
            result += `    template <typename AddressPolicy>\n`;
            result += `    inline ${getClasslName(path)} ${getFactoryName(path)}(uintptr_t n) const NN_NOEXCEPT;\n`;
        });
        
        result += `};\n`;
    });

    forEachRegister(data, '/', (node, address) => {
        const className     = getClasslName(node.parent + node.name);
        const enclosingName = getClasslNameLong(node.parent);
        const offset = node.offset.match(/^0x/i) ? node.offset : `0x${node.offset}`;

        result += `\n`;
        result += `/**\n`;
        result += ` * @brief Class for register ${node.parent  + node.name}\n`;
        result += ` *\n`;
        result += ` * @details\n`;
        result += ` *   This class represents the ${node.desc_short}, i.e. ${node.parent  + node.name}.\n`;
        result += ` *\n`;
        result += ` *   The declared address information are:\n`;
        result += ` *   - %Base:    0x${(address - parseInt(offset)).toString(16)}\n`
        result += ` *   - %Offset:  ${offset}\n`;
        result += ` *   - %Address: 0x${address.toString(16)}\n`;
        result += ` */\n`;
        result += `class ${enclosingName}::${className} {\n`;
        result += `public:\n`;
        result += `    /**\n`;
        result += `     * @brief Declared Base Address\n`;
        result += `     */\n`;
        result += `    static const uintptr_t g_DeclareBase    = ${enclosingName}::g_DeclareAddress;\n`;
        result += `\n`;
        result += `    /**\n`;
        result += `     * @brief Declared Address Offset\n`;
        result += `     */\n`;
        result += `    static const uintptr_t g_DeclareOffset  = ${offset};\n`;
        result += `\n`;
        result += `    /**\n`;
        result += `     * @brief Declared Address\n`;
        result += `     */\n`;
        result += `    static const uintptr_t g_DeclareAddress = g_DeclareBase + g_DeclareOffset;\n`;
        result += `\n`;
        result += `    /**\n`;
        result += `     * @brief Size of this register in bytes\n`;
        result += `     */\n`;
        result += `    static const size_t    g_Size           = ${node.size};\n`;
        result += `\n`;
        result += `    /**\n`;
        result += `     * @brief Smallest integer type that can hold the value of this register\n`;
        result += `     */\n`;
        result += `    typedef typename BaseTypeOfBytes_<g_Size>::value ValueType_;\n`;
        result += `\n`;
        result += `private:\n`;
        result += `    uintptr_t m_RuntimeAddress{g_DeclareAddress};\n`;
        result += `    class     Data_;\n`;
        result += `\n`;
        node.fields.forEach((field) => {
            result += `    typedef Field_<${field.bits[0]}, ${field.bits[1]}, ValueType_> ${classifyName(field.name)}_;\n`;
        });
        result += `\n`;
        result += `public:\n`;
        node.fields.forEach((field) => {
            if (hasSymbolicValue(field)) {
                result += `    /**\n`;
                result += `     * @brief Symbolic values for the field ${field.name}\n`;
                result += `     */\n`;
                result += `    enum class ${siglofyName(field.name)}Value : ${classifyName(field.name)}_::ValueType {\n`;
                field.value.forEach(symbolic => {
                    result += `        ${siglofyName(symbolic.name)} = ${symbolic.value}, //!< ${symbolic.name}\n`;
                });
                result += `    };\n`;
            }
        });
        result += `\n`;
        result += `public:\n`;
        result += `    /**\n`;
        result += `     * @brief Constructor\n`;
        result += `     * @param[in] addr The runtime address\n`;
        result += `     */\n`;
        result += `    explicit ${className}(uintptr_t addr) NN_NOEXCEPT\n`;
        result += `        : m_RuntimeAddress(addr)\n`;
        result += `    {\n`;
        result += `    }\n`;
        result += `\n`;
        result += `    ${className}() NN_NOEXCEPT = default;\n`;
        result += `\n`;
        result += `    /**\n`;
        result += `     * @brief Read register value to memory\n`;
        result += `     */\n`;
        result += `    inline Data_ Get() const NN_NOEXCEPT;\n`;
        result += `\n`;
        result += `    /**\n`;
        result += `     * @brief Write a value from memory to register\n`;
        result += `     * @param[in] value The value to be written\n`;
        result += `     */\n`;
        result += `    inline void  Set(ValueType_ value) NN_NOEXCEPT;\n`;
        result += `};\n`;

        result += `\n`;
        result += `/**\n`;
        result += ` * @brief In memory value type for register ${node.parent  + node.name}\n`;
        result += ` * @details\n`;
        result += ` *   This class is the in memory reprensentation of the register value.\n`;
        result += ` *   It provides accessors to read / write the fields of the register. Those\n`;
        result += ` *   accessors affect only the in memory copy of the register value.\n`;
        result += ` *   value.\n`;
        result += ` */\n`;
        result += `class ${enclosingName}::${className}::Data_ {\n`;
        result += `private:\n`;
        result += `    ValueType_ m_Value;\n`
        result += `\n`;
        result += `public:\n`;
        result += `    /**\n`;
        result += `     * @brief Constructor\n`;
        result += `     * @param[in] value The register reading\n`;
        result += `     */\n`;
        result += `    explicit Data_(ValueType_ value) NN_NOEXCEPT\n`;
        result += `        : m_Value(value)\n`;
        result += `    {\n`;
        result += `    }\n`;
        result += `\n`;
        result += `    /**\n`;
        result += `     * @brief Implicitly convert back to ValueType_\n`;
        result += `     */\n`;
        result += `    NN_IMPLICIT operator ValueType_() const NN_NOEXCEPT\n`;
        result += `    {\n`;
        result += `        return m_Value;\n`;
        result += `    }\n`;
        node.fields.forEach((field) => {
            const fieldName = siglofyName(field.name);
            const valueType = hasSymbolicValue(field) ? `${siglofyName(field.name)}Value` : `${classifyName(field.name)}_::ValueType`;
            result += `\n`;
            result += `    /**\n`;
            result += `     * @brief Read the ${field.name} field\n`;
            result += `     */\n`;
            result += `    inline ${valueType} ${fieldName}() const NN_NOEXCEPT;\n`;
            result += `\n`;
            result += `    /**\n`;
            result += `     * @brief Write the ${field.name} field\n`;
            result += `     */\n`;
            result += `    inline Data_& ${fieldName}(${valueType} value) NN_NOEXCEPT;\n`
        });
        result += `};\n`;
    });

    //////////////////////////////////////////////////////////
    // Implementation
    //////////////////////////////////////////////////////////

    forEachGroup(data, '/', (node, address, children) => {
        const runtimeAddress = node.parent ? 'm_RuntimeAddress' : 'g_RuntimeAddress';
        const constNess      = node.parent ? 'const' : '';
        const enclosingName  = getClasslNameLong((node.parent || '') + node.name);

        children.forEach((path) => {
            const className     = getClasslName(path);
            const classNameLong = getClasslNameLong(path);
            const factoryName   = getFactoryName(path);

            result += `\n`;
            result += `/*\n`;
            result += ` * ${path}: Factory methods\n`;
            result += ` */\n`;
            result += `\n`;
            result += `inline ${classNameLong}\n`
            result += `${enclosingName}::${factoryName}() ${constNess} NN_NOEXCEPT\n`;
            result += `{\n`;
            result += `    return ${className}(${runtimeAddress} + ${className}::g_DeclareOffset);\n`
            result += `}\n`;
            result += `\n`;
            result += `template <>\n`;
            result += `inline ${classNameLong}\n`
            result += `${enclosingName}::${factoryName}<At>(uintptr_t address) ${constNess} NN_NOEXCEPT\n`;
            result += `{\n`;
            result += `    return ${className}(address);\n`
            result += `}\n`;
            result += `\n`;
            result += `template <>\n`;
            result += `inline ${classNameLong}\n`
            result += `${enclosingName}::${factoryName}<Offset>(uintptr_t offset) ${constNess} NN_NOEXCEPT\n`;
            result += `{\n`;
            result += `    return ${className}(${runtimeAddress} + ${className}::g_DeclareOffset + offset);\n`
            result += `}\n`;
        });
    });

    forEachRegister(data, '/', (node, address) => {
        const enclosingName  = getClasslNameLong(node.parent + node.name);
        
        result += `/*\n`;
        result += ` * ${node.parent + node.name}: Getter\n`;
        result += ` */\n`;
        result += `inline ${enclosingName}::Data_\n`;
        result += `${enclosingName}::Get() const NN_NOEXCEPT\n`;
        result += `{\n`;
        result += `    return Data_(*(volatile ValueType_*)m_RuntimeAddress);\n`
        result += `}\n`;
        
        result += `\n`;
        result += `/*\n`;
        result += ` * ${node.parent + node.name}: Setter\n`;
        result += ` */\n`;
        result += `inline void\n`;
        result += `${enclosingName}::Set(ValueType_ value) NN_NOEXCEPT\n`;
        result += `{\n`;
        result += `    *(volatile ValueType_*)m_RuntimeAddress = value;\n`
        result += `}\n`;

        node.fields.forEach((field) => {
            const methodName = siglofyName(field.name);
            const className  = `${classifyName(field.name)}_`;
            const valueType = hasSymbolicValue(field) ? `${siglofyName(field.name)}Value` : `${className}::ValueType`;

            result += `\n`;
            result += `/*\n`;
            result += ` * ${node.parent + node.name}: Field accessor\n`;
            result += ` *   [${field.bits[0]}, ${field.bits[1]}]: ${field.name} - ${field.meaning}\n`;
            result += ` */\n`;
            result += `\n`;
            result += `inline ${enclosingName}::${valueType}\n`;
            result += `${enclosingName}::Data_::${methodName}() const NN_NOEXCEPT\n`;
            result += `{\n`;
            result += `    ${className}::ValueType rv = (m_Value & ${className}::mask) >> ${className}::shift;\n`;
            result += `    return ` + (hasSymbolicValue(field) ? `static_cast<${valueType}>(rv)`: `rv`) + `;\n`;
            result += `}\n`;
            result += `\n`;
            result += `inline ${enclosingName}::Data_&\n`;
            result += `${enclosingName}::Data_::${methodName}(${valueType} value) NN_NOEXCEPT\n`;
            result += `{\n`;
            result += `    m_Value &= ~${className}::mask;\n`;
            result += `    m_Value |= (static_cast<ValueType_>(value) << ${className}::shift) & ${className}::mask;\n`
            result += `    return *this;\n`;
            result += `}\n`;
        });
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
        },
        'C++': {
            handle: convertToCpp,
            description: 'C++'
        }
    }[format];

    return ({
        data: converter.handle(data),
        descripton: converter.descripton
    });
}