const validate = (schema, source = 'body') => (req, res, next) => {
    const { error, value } = schema.validate(req[source], { abortEarly: false, stripUnknown: true });

    if (error) {
        const messages = error.details.map(d => d.message);
        return res.status(400).json({ error: messages.join('. ') });
    }

    // Express 5: req.query es getter-only, no se puede reasignar. Muto el
    // objeto en su lugar para body/query/params.
    if (req[source] && typeof req[source] === 'object') {
        for (const key of Object.keys(req[source])) delete req[source][key];
        Object.assign(req[source], value);
    } else {
        req[source] = value;
    }
    next();
};

export default validate;
