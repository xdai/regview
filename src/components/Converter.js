let forEachNode = (data, rootKey, func) => {
    const root = data[rootKey];
    func(root.node);
    root.children.forEach(childKey => forEachNode(data, childKey, func));
}

let forEachGroup = (data, rootKey, func) => {
    forEachNode(data, rootKey, (node) => {
        if (node.name.endsWith('/')) {
            func(node);
        }
    });
}

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
    console.log(data);
    let result = '';

    forEachRegister(data, '/', (node) => {
        result += `// ${node.desc_short}\n`;
        result += `NN_USB_DEFINE_REG_OFFSET ( ${node.name}, ${node.offset} );\n`;
        node.fields.forEach((field) => {
            result += `NN_USB_DEFINE_FIELD32    ( ${node.name}, ${field.name}, ${field.bits[1]}, ${field.bits[0]} );\n`;
        });
        result += '\n';
    })
    
    return result;
}

let convertToTemplate = (data) => {
    return "TEMPLATE"
}

export let convertTo = (data, format) => {
    const converter = {
        'json': [convertToJson, 'register.json'],
        'macro': [convertToMacro, 'register-macro.h'],
        'template': [convertToTemplate, 'register-template.h']
    }[format];

    return [converter[0](data), converter[1]];
}