let siglofyName = (name) => {
    return name.replace(/[^a-zA-Z0-9]+/gi, ' ').trim().split(' ').map(
        s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
    ).join('');
}

let forEachNode = (data, rootKey, func) => {
    const root = data[rootKey];
    func(root.node);
    root.children.forEach(childKey => forEachNode(data, childKey, func));
}

// let forEachGroup = (data, rootKey, func) => {
//     forEachNode(data, rootKey, (node) => {
//         if (node.name.endsWith('/')) {
//             func(node);
//         }
//     });
// }

let forEachRegister = (data, rootKey, func) => {
    forEachNode(data, rootKey, (node) => {
        if (!node.name.endsWith('/')) {
            func(node);
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
    console.log(data);

    let result = '#include <nn/util/util_BitPack.h>\n';

    forEachRegister(data, '/', (node) => {
        let bitpack;
        switch (node.size) {
        case 1:
            bitpack = 'BitPack8';
            break;
        case 2:
            bitpack = 'BitPack16';
            break;
        case 4:
            bitpack = 'BitPack32';
            break;
        default:
            bitpack = 'BitPack_Unsupported';
            break;
        }
        const nodeName = siglofyName(node.name)

        result += `\nstruct ${nodeName} : public nn::util::${bitpack}\n`;
        result += '{\n';
        node.fields.forEach((field) => {
            const fieldName = siglofyName(field.name);

            result += `    typedef nn::util::${bitpack}::Field<${field.bits[0]}, ${field.bits[1] - field.bits[0] + 1}, int> ${fieldName};\n`
        })
        result += '};\n';
    })

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