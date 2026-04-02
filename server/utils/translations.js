export const colorDictionary = {
    black: 'negro',
    white: 'blanco',
    brown: 'marrón',
    orange: 'naranja',
    gray: 'gris',
    grey: 'gris',
    mixed: 'mixto',
    golden: 'rubio',
    yellow: 'amarillo',
    spotted: 'manchado',
    striped: 'atigrado',
    tan: 'tostado'
};

export const typeDictionary = {
    dog: 'perro',
    cat: 'gato'
};

export const statusDictionary = {
    lost: 'perdido',
    found: 'encontrado'
};

export const translateColor = (color) => {
    if (!color) return '';
    return colorDictionary[color.toLowerCase()] || color;
};

export const translateType = (type) => {
    if (!type) return '';
    return typeDictionary[type.toLowerCase()] || type;
};

export const translateStatus = (status) => {
    if (!status) return '';
    return statusDictionary[status.toLowerCase()] || status;
};
